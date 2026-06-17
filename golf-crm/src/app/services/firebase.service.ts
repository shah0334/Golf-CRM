import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private isFirebaseConfigured = false;

  constructor() {
    this.checkFirebaseConfig();
  }

  private checkFirebaseConfig() {
    const isPlaceholder = !environment.firebase.apiKey || 
                          environment.firebase.apiKey.includes('PLACEHOLDER') || 
                          environment.firebase.projectId.includes('PLACEHOLDER');

    if (isPlaceholder) {
      console.warn(
        'Firebase configuration contains placeholders. The app will run in "Simulated Mode", ' +
        'persisting registration data in localStorage and logging the payload to the developer console.'
      );
      this.isFirebaseConfigured = false;
    } else {
      console.log('Firebase Service initialized with active project configuration:', environment.firebase.projectId);
      this.isFirebaseConfigured = true;
    }
  }

  createOrganizer(data: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      return this.runSimulatedRegistration(data);
    }

    // Real Firebase REST API operations
    return from(this.runRealRegistration(data));
  }

  login(email: string, password: string): Observable<any> {
    if (!this.isFirebaseConfigured) {
      console.log('Simulating login check for:', email);
      try {
        const existingRaw = localStorage.getItem('mock_firebase_organizers');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const found = existing.find((org: any) => org.email === email && org.password === password);
        if (found) {
          return of({ success: true, user: found });
        }
      } catch (e) {
        console.error('Error querying mock database:', e);
      }
      return throwError(() => new Error('INVALID_LOGIN_CREDENTIALS'));
    }

    // Real Firebase REST API query
    return from(this.runRealLogin(email, password));
  }

  checkEmailExists(email: string): Observable<boolean> {
    if (!this.isFirebaseConfigured) {
      try {
        const existingRaw = localStorage.getItem('mock_firebase_organizers');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const exists = existing.some((org: any) => org.email === email);
        return of(exists);
      } catch (e) {
        return of(false);
      }
    }
    return from(this.runCheckEmailExists(email));
  }

  private async runCheckEmailExists(email: string): Promise<boolean> {
    const projectId = environment.firebase.projectId;
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'Organizations' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'email' },
            op: 'EQUAL',
            value: { stringValue: email }
          }
        }
      }
    };

    try {
      const response = await fetch(firestoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody)
      });

      if (!response.ok) {
        const err = await response.json();
        console.error('Email check query failed:', err);
        return false;
      }

      const results = await response.json();
      const validResults = results.filter((r: any) => r.document);
      return validResults.length > 0;
    } catch (e) {
      console.error('Network error checking email existence:', e);
      return false;
    }
  }

  private async runRealRegistration(data: any): Promise<any> {
    const apiKey = environment.firebase.apiKey;
    const projectId = environment.firebase.projectId;

    console.log('Checking if email is already registered...');
    const emailExists = await this.runCheckEmailExists(data.email);
    if (emailExists) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    let uid = 'auth_disabled_' + Math.random().toString(36).substring(2, 11);
    let authFailed = false;
    let authError = '';
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;

    try {
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          returnSecureToken: true
        })
      });

      if (authResponse.ok) {
        const authResult = await authResponse.json();
        uid = authResult.localId;
      } else {
        const errorJson = await authResponse.json();
        authError = errorJson.error?.message || 'Authentication signup failed';
        authFailed = true;
      }
    } catch (e: any) {
      authError = e?.message || String(e);
      authFailed = true;
    }

    if (authFailed) {
      console.warn(
        `Firebase Auth account creation failed (${authError}). ` +
        `Proceeding to save organization details directly to Firestore Organizations collection using a fallback UID...`
      );
    }

    // 2. Prepare payload for Firestore
    const orgPayload = {
      uid: uid,
      email: data.email || '',
      password: data.password || '',
      clubName: data.clubName || '',
      orgName: data.orgName || '',
      courseName: data.courseName || '',
      urlSlug: data.urlSlug || '',
      orgEmail: data.orgEmail || data.email || '',
      phone: data.phone || '',
      inviteCode: data.inviteCode || '',
      branding: {
        selectedColor: data.selectedColor || '#0F3D2E',
        logoFileName: data.logoFileName || null,
        logoPreview: data.logoPreview || null,
        bannerFileName: data.bannerFileName || null,
        bannerPreview: data.bannerPreview || null,
        scorecardFileName: data.scorecardFileName || null,
        scorecardPreview: data.scorecardPreview || null,
        websiteUrl: data.websiteUrl || '',
        bookingUrl: data.bookingUrl || ''
      },
      course: {
        teeBoxes: data.teeBoxes || [],
        holesList: data.holesList || [],
        courseUrl: data.courseUrl || ''
      },
      createdAt: new Date().toISOString()
    };

    // 3. Write document to Organizations collection in Firestore
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations`;
    const firestoreBody = {
      fields: this.mapToFirestore(orgPayload).mapValue.fields
    };

    const firestoreResponse = await fetch(firestoreUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (!firestoreResponse.ok) {
      const errorJson = await firestoreResponse.json();
      const errorMessage = errorJson.error?.message || 'Failed to save organization details to Firestore';
      throw new Error(errorMessage);
    }

    const firestoreResult = await firestoreResponse.json();
    return {
      success: true,
      uid: uid,
      firestoreDoc: firestoreResult.name,
      mode: 'firebase'
    };
  }

  private async runRealLogin(email: string, password: string): Promise<any> {
    const projectId = environment.firebase.projectId;
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'Organizations' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'email' },
                  op: 'EQUAL',
                  value: { stringValue: email }
                }
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'password' },
                  op: 'EQUAL',
                  value: { stringValue: password }
                }
              }
            ]
          }
        }
      }
    };

    const response = await fetch(firestoreUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryBody)
    });

    if (!response.ok) {
      const errorJson = await response.json();
      throw new Error(errorJson.error?.message || 'Login query failed');
    }

    const results = await response.json();
    const validResults = results.filter((r: any) => r.document);

    if (validResults.length === 0) {
      throw new Error('INVALID_LOGIN_CREDENTIALS');
    }

    const doc = validResults[0].document;
    const fields = doc.fields;
    const orgData = this.mapFromFirestore(fields);

    return {
      success: true,
      user: orgData
    };
  }

  private runSimulatedRegistration(data: any): Observable<any> {
    console.log('Simulating Firebase registration. Payload:', data);

    const key = `mock_firebase_organizers`;
    try {
      const existingRaw = localStorage.getItem(key);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      
      const emailExists = existing.some((org: any) => org.email === data.email);
      if (emailExists) {
        return throwError(() => new Error('EMAIL_ALREADY_REGISTERED'));
      }

      existing.push({
        id: 'org_' + Math.random().toString(36).substring(2, 11),
        createdAt: new Date().toISOString(),
        ...data
      });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to write to simulated storage:', e);
      return throwError(() => e);
    }

    return of({ success: true, mode: 'simulated' });
  }

  // Recursive converter to format JS objects into Firestore REST API structured JSON
  private mapToFirestore(val: any): any {
    if (val === null || val === undefined) {
      return { nullValue: null };
    }
    if (typeof val === 'string') {
      return { stringValue: val };
    }
    if (typeof val === 'number') {
      return { doubleValue: val };
    }
    if (typeof val === 'boolean') {
      return { booleanValue: val };
    }
    if (Array.isArray(val)) {
      return {
        arrayValue: {
          values: val.map(item => this.mapToFirestore(item))
        }
      };
    }
    if (typeof val === 'object') {
      const fields: { [key: string]: any } = {};
      for (const key of Object.keys(val)) {
        fields[key] = this.mapToFirestore(val[key]);
      }
      return {
        mapValue: {
          fields
        }
      };
    }
    return { stringValue: String(val) };
  }

  // Recursive converter to parse Firestore REST structured JSON fields back to standard JS
  private mapFromFirestore(fields: any): any {
    if (!fields) return {};
    const result: any = {};
    for (const key of Object.keys(fields)) {
      const val = fields[key];
      if ('stringValue' in val) {
        result[key] = val.stringValue;
      } else if ('doubleValue' in val) {
        result[key] = Number(val.doubleValue);
      } else if ('booleanValue' in val) {
        result[key] = val.booleanValue;
      } else if ('integerValue' in val) {
        result[key] = Number(val.integerValue);
      } else if ('nullValue' in val) {
        result[key] = null;
      } else if ('arrayValue' in val) {
        const values = val.arrayValue.values || [];
        result[key] = values.map((item: any) => {
          if ('stringValue' in item) return item.stringValue;
          if ('doubleValue' in item) return Number(item.doubleValue);
          if ('booleanValue' in item) return item.booleanValue;
          if ('integerValue' in item) return Number(item.integerValue);
          if ('mapValue' in item) return this.mapFromFirestore(item.mapValue.fields);
          return item;
        });
      } else if ('mapValue' in val) {
        result[key] = this.mapFromFirestore(val.mapValue.fields);
      }
    }
    return result;
  }
}
