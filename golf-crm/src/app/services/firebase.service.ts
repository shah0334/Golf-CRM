import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  public isFirebaseConfigured = false;

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

  createStaffUser(data: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      return of({ success: true, mode: 'simulated' });
    }
    return from(this.runRealStaffCreation(data));
  }

  sendPasswordResetEmail(email: string): Observable<any> {
    if (!this.isFirebaseConfigured) {
      console.log('Simulating sending password reset email to:', email);
      return of({ success: true });
    }
    return from(this.runSendPasswordResetEmail(email));
  }

  updateOrganization(email: string, uid: string, updatedData: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      try {
        const key = 'mock_firebase_organizers';
        const existingRaw = localStorage.getItem(key);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const index = existing.findIndex((org: any) => 
          (uid && (org.uid === uid || org.id === uid)) || (email && org.email === email)
        );
        if (index !== -1) {
          existing[index] = { ...existing[index], ...updatedData };
          localStorage.setItem(key, JSON.stringify(existing));
          return of({ success: true, user: existing[index] });
        }
      } catch (e) {
        return throwError(() => e);
      }
      return throwError(() => new Error('ORGANIZATION_NOT_FOUND'));
    }

    return from(this.runRealUpdate(email, uid, updatedData));
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
    const apiKey = environment.firebase.apiKey;
    const projectId = environment.firebase.projectId;
    
    // 1. Authenticate with Firebase Auth REST API
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    try {
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: true
        })
      });

      if (!authResponse.ok) {
        // If auth fails, try legacy plaintext fallback query (in case user registered prior to authentication check integration)
        console.warn('Firebase Auth login failed, trying legacy plaintext Firestore fallback...');
        return await this.runLegacyFirestoreLogin(email, password);
      }

      const authResult = await authResponse.json();
      const uid = authResult.localId;

      // 2. Fetch organization/staff details from Firestore by email
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

      const response = await fetch(firestoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody)
      });

      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(errorJson.error?.message || 'Firestore user query failed');
      }

      const results = await response.json();
      const validResults = results ? results.filter((r: any) => r.document) : [];

      let orgData: any;
      if (validResults.length === 0) {
        // If user exists in Auth but not in Firestore, create a default Firestore document for them
        orgData = {
          uid: uid,
          email: email,
          password: password,
          role: 'Staff',
          orgName: email.split('@')[0],
          clubName: 'Staff Member',
          createdAt: new Date().toISOString()
        };
        await this.saveToFirestoreCollection('Organizations', orgData);
      } else {
        const doc = validResults[0].document;
        const fields = doc.fields;
        orgData = this.mapFromFirestore(fields);
        orgData.docId = doc.name.split('/').pop();
        orgData.id = orgData.docId;

        // Update password in Firestore in background if it doesn't match or is empty
        if (orgData.password !== password) {
          orgData.password = password;
          this.runRealUpdate(email, uid, { password: password }).catch(e => {
            console.warn('Failed to update Firestore password in background:', e);
          });
        }
      }

      return {
        success: true,
        user: orgData
      };

    } catch (err: any) {
      console.warn('Error in runRealLogin: ', err);
      // Fallback to legacy login in case of network errors or other anomalies
      return await this.runLegacyFirestoreLogin(email, password);
    }
  }

  private async runLegacyFirestoreLogin(email: string, password: string): Promise<any> {
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
    const validResults = results ? results.filter((r: any) => r.document) : [];

    if (validResults.length === 0) {
      throw new Error('INVALID_LOGIN_CREDENTIALS');
    }

    const doc = validResults[0].document;
    const fields = doc.fields;
    const orgData = this.mapFromFirestore(fields);
    orgData.docId = doc.name.split('/').pop();
    orgData.id = orgData.docId;

    return {
      success: true,
      user: orgData
    };
  }

  private async runRealStaffCreation(data: any): Promise<any> {
    const apiKey = environment.firebase.apiKey;
    const projectId = environment.firebase.projectId;

    // 1. Create user in Firebase Auth with a random temporary password
    const tempPassword = 'StaffTempPass_' + Math.random().toString(36).substring(2, 10);
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    let uid = 'staff_' + Math.random().toString(36).substring(2, 11);
    
    try {
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: tempPassword,
          returnSecureToken: true
        })
      });
      if (authResponse.ok) {
        const authResult = await authResponse.json();
        uid = authResult.localId;
      } else {
        const errJson = await authResponse.json();
        if (errJson.error?.message === 'EMAIL_EXISTS') {
          console.log('Staff email already exists in Firebase Auth, proceeding with sync/reset...');
        }
      }
    } catch (e) {
      console.warn('Firebase Auth signup for staff failed or bypassed, using fallback:', e);
    }

    // 2. Create/update document in Firestore Organizations collection
    const orgPayload = {
      uid: uid,
      email: data.email || '',
      password: '', // Blank initially, will be updated when they log in or set password
      role: 'Staff',
      orgName: data.name || '',
      clubName: 'Staff Member',
      createdAt: new Date().toISOString()
    };

    try {
      // Check if document already exists in Firestore
      const emailExists = await this.runCheckEmailExists(data.email);
      if (!emailExists) {
        await this.saveToFirestoreCollection('Organizations', orgPayload);
      }
    } catch (e) {
      console.error('Failed to sync staff document in Firestore Organizations:', e);
    }

    // 3. Send password reset email
    await this.runSendPasswordResetEmail(data.email);

    return {
      success: true,
      uid: uid,
      email: data.email
    };
  }

  private async runSendPasswordResetEmail(email: string): Promise<any> {
    const apiKey = environment.firebase.apiKey;
    const resetUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;
    const resetResponse = await fetch(resetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: email
      })
    });

    if (!resetResponse.ok) {
      const err = await resetResponse.json();
      throw new Error(err.error?.message || 'Failed to send password reset email');
    }

    return await resetResponse.json();
  }

  private async saveToFirestoreCollection(collection: string, data: any): Promise<any> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
    const firestoreBody = {
      fields: this.mapToFirestore(data).mapValue.fields
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to save Firestore document');
    }
    return await response.json();
  }

  private runSimulatedRegistration(data: any): Observable<any> {
    console.log('Simulating Firebase registration. Payload:', data);

    const key = `mock_firebase_organizers`;
    const newOrgId = 'org_' + Math.random().toString(36).substring(2, 11);
    try {
      const existingRaw = localStorage.getItem(key);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      
      const emailExists = existing.some((org: any) => org.email === data.email);
      if (emailExists) {
        return throwError(() => new Error('EMAIL_ALREADY_REGISTERED'));
      }

      existing.push({
        id: newOrgId,
        docId: newOrgId,
        createdAt: new Date().toISOString(),
        ...data
      });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to write to simulated storage:', e);
      return throwError(() => e);
    }

    return of({ success: true, mode: 'simulated', uid: newOrgId, firestoreDoc: `projects/simulated/databases/(default)/documents/Organizations/${newOrgId}` });
  }

  private async runRealUpdate(email: string, uid: string, updatedData: any): Promise<any> {
    const projectId = environment.firebase.projectId;
    const firestoreUrlQuery = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    const filter = uid 
      ? {
          fieldFilter: {
            field: { fieldPath: 'uid' },
            op: 'EQUAL',
            value: { stringValue: uid }
          }
        }
      : {
          fieldFilter: {
            field: { fieldPath: 'email' },
            op: 'EQUAL',
            value: { stringValue: email }
          }
        };

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'Organizations' }],
        where: filter
      }
    };

    const queryResponse = await fetch(firestoreUrlQuery, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryBody)
    });

    if (!queryResponse.ok) {
      const errorJson = await queryResponse.json();
      throw new Error(errorJson.error?.message || 'Update search query failed');
    }

    const results = await queryResponse.json();
    const validResults = results.filter((r: any) => r.document);

    if (validResults.length === 0) {
      throw new Error('ORGANIZATION_NOT_FOUND');
    }

    const doc = validResults[0].document;
    const docName = doc.name;

    const existingFields = this.mapFromFirestore(doc.fields);
    const mergedPayload = {
      ...existingFields,
      ...updatedData
    };

    const updateUrl = `https://firestore.googleapis.com/v1/${docName}`;
    const firestoreBody = {
      fields: this.mapToFirestore(mergedPayload).mapValue.fields
    };

    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (!updateResponse.ok) {
      const errorJson = await updateResponse.json();
      throw new Error(errorJson.error?.message || 'Failed to update organization document in Firestore');
    }

    const updateResult = await updateResponse.json();
    return {
      success: true,
      user: mergedPayload
    };
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

  getOrgDocId(): string {
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        if (org.docId) return org.docId;
        if (org.id) return org.id;
        if (org.uid) return org.uid;
      }
    } catch (e) {
      console.error('Error reading docId from activeOrganization:', e);
    }
    return 'default_org';
  }

  getTournaments(orgDocId: string): Observable<any[]> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_tournaments_${orgDocId}`;
      const dataRaw = localStorage.getItem(key);
      let data = dataRaw ? JSON.parse(dataRaw) : [];
      if (data.length === 0) {
        try {
          const activeOrgRaw = localStorage.getItem('activeOrganization');
          if (activeOrgRaw) {
            const org = JSON.parse(activeOrgRaw);
            if (org.tournaments && org.tournaments.length > 0) {
              data = org.tournaments;
              localStorage.setItem(key, JSON.stringify(data));
            }
          }
        } catch (e) {}
      }
      return of(data);
    }
    return from(this.runRealGetTournaments(orgDocId));
  }

  createTournament(orgDocId: string, tournament: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_tournaments_${orgDocId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      data.push(tournament);
      localStorage.setItem(key, JSON.stringify(data));
      return of({ success: true, tournament });
    }
    return from(this.runRealCreateTournament(orgDocId, tournament));
  }

  updateTournament(orgDocId: string, tournamentId: string, updatedFields: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_tournaments_${orgDocId}`;
      const dataRaw = localStorage.getItem(key);
      let data = dataRaw ? JSON.parse(dataRaw) : [];
      
      let index = data.findIndex((t: any) => t.id === tournamentId);
      if (index === -1) {
        try {
          const activeOrgRaw = localStorage.getItem('activeOrganization');
          if (activeOrgRaw) {
            const org = JSON.parse(activeOrgRaw);
            if (org.tournaments && org.tournaments.length > 0) {
              org.tournaments.forEach((ot: any) => {
                if (!data.some((dt: any) => dt.id === ot.id)) {
                  data.push(ot);
                }
              });
              localStorage.setItem(key, JSON.stringify(data));
              index = data.findIndex((t: any) => t.id === tournamentId);
            }
          }
        } catch (e) {}
      }

      if (index !== -1) {
        data[index] = { ...data[index], ...updatedFields };
        localStorage.setItem(key, JSON.stringify(data));
        
        try {
          const activeOrgRaw = localStorage.getItem('activeOrganization');
          if (activeOrgRaw) {
            const org = JSON.parse(activeOrgRaw);
            if (org.tournaments) {
              const orgIdx = org.tournaments.findIndex((t: any) => t.id === tournamentId);
              if (orgIdx !== -1) {
                org.tournaments[orgIdx] = { ...org.tournaments[orgIdx], ...updatedFields };
                localStorage.setItem('activeOrganization', JSON.stringify(org));
              }
            }
          }
        } catch (e) {}

        return of({ success: true, tournament: data[index] });
      }
      return throwError(() => new Error('TOURNAMENT_NOT_FOUND'));
    }
    return from(this.runRealUpdateTournament(orgDocId, tournamentId, updatedFields));
  }

  deleteTournament(orgDocId: string, tournamentId: string): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_tournaments_${orgDocId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      const filtered = data.filter((t: any) => t.id !== tournamentId);
      localStorage.setItem(key, JSON.stringify(filtered));
      return of({ success: true });
    }
    return from(this.runRealDeleteTournament(orgDocId, tournamentId));
  }

  private async runRealGetTournaments(orgDocId: string): Promise<any[]> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/events`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        const err = await response.json();
        console.error('Failed to get tournaments:', err);
        return [];
      }

      const result = await response.json();
      const documents = result.documents || [];
      return documents.map((doc: any) => {
        const data = this.mapFromFirestore(doc.fields);
        data.id = doc.name.split('/').pop();
        return data;
      });
    } catch (e) {
      console.error('Error fetching tournaments from Firestore:', e);
      return [];
    }
  }

  private async runRealCreateTournament(orgDocId: string, tournament: any): Promise<any> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/events?documentId=${tournament.id}`;

    const firestoreBody = {
      fields: this.mapToFirestore(tournament).mapValue.fields
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to create tournament document in Firestore';
      throw new Error(errMsg);
    }

    const result = await response.json();
    return {
      success: true,
      name: result.name
    };
  }

  private async runRealUpdateTournament(orgDocId: string, tournamentId: string, updatedFields: any): Promise<any> {
    const projectId = environment.firebase.projectId;
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/events/${tournamentId}`;
    
    let existingFields = {};
    try {
      const getResponse = await fetch(docUrl);
      if (getResponse.ok) {
        const doc = await getResponse.json();
        existingFields = this.mapFromFirestore(doc.fields);
      }
    } catch (e) {
      console.error('Error fetching existing tournament for merge:', e);
    }

    const merged = { ...existingFields, ...updatedFields };
    const firestoreBody = {
      fields: this.mapToFirestore(merged).mapValue.fields
    };

    const response = await fetch(docUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to update tournament document in Firestore';
      throw new Error(errMsg);
    }

    const result = await response.json();
    return {
      success: true,
      name: result.name
    };
  }

  private async runRealDeleteTournament(orgDocId: string, tournamentId: string): Promise<any> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/events/${tournamentId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to delete tournament document in Firestore';
      throw new Error(errMsg);
    }

    return { success: true };
  }

  getCourses(orgDocId: string): Observable<any[]> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_courses_${orgDocId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      return of(data);
    }
    return from(this.runRealGetCourses(orgDocId));
  }

  createCourse(orgDocId: string, course: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_courses_${orgDocId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      const filtered = data.filter((c: any) => c.id !== course.id);
      filtered.push(course);
      localStorage.setItem(key, JSON.stringify(filtered));
      return of({ success: true, course });
    }
    return from(this.runRealCreateCourse(orgDocId, course));
  }

  updateCourse(orgDocId: string, courseId: string, updatedFields: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_courses_${orgDocId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      const index = data.findIndex((c: any) => c.id === courseId);
      if (index !== -1) {
        data[index] = { ...data[index], ...updatedFields };
        localStorage.setItem(key, JSON.stringify(data));
        return of({ success: true, course: data[index] });
      }
      return throwError(() => new Error('COURSE_NOT_FOUND'));
    }
    return from(this.runRealUpdateCourse(orgDocId, courseId, updatedFields));
  }

  deleteCourse(orgDocId: string, courseId: string): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_courses_${orgDocId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      const filtered = data.filter((c: any) => c.id !== courseId);
      localStorage.setItem(key, JSON.stringify(filtered));
      return of({ success: true });
    }
    return from(this.runRealDeleteCourse(orgDocId, courseId));
  }

  private async runRealGetCourses(orgDocId: string): Promise<any[]> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/courses`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        const err = await response.json();
        console.error('Failed to get courses:', err);
        return [];
      }

      const result = await response.json();
      const documents = result.documents || [];
      return documents.map((doc: any) => {
        const data = this.mapFromFirestore(doc.fields);
        data.id = doc.name.split('/').pop();
        return data;
      });
    } catch (e) {
      console.error('Error fetching courses from Firestore:', e);
      return [];
    }
  }

  private async runRealCreateCourse(orgDocId: string, course: any): Promise<any> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/courses?documentId=${course.id}`;

    const firestoreBody = {
      fields: this.mapToFirestore(course).mapValue.fields
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to create course document in Firestore';
      throw new Error(errMsg);
    }

    const result = await response.json();
    return {
      success: true,
      name: result.name
    };
  }

  private async runRealUpdateCourse(orgDocId: string, courseId: string, updatedFields: any): Promise<any> {
    const projectId = environment.firebase.projectId;
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/courses/${courseId}`;
    
    let existingFields = {};
    try {
      const getResponse = await fetch(docUrl);
      if (getResponse.ok) {
        const doc = await getResponse.json();
        existingFields = this.mapFromFirestore(doc.fields);
      }
    } catch (e) {
      console.error('Error fetching existing course for merge:', e);
    }

    const merged = { ...existingFields, ...updatedFields };
    const firestoreBody = {
      fields: this.mapToFirestore(merged).mapValue.fields
    };

    const response = await fetch(docUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to update course document in Firestore';
      throw new Error(errMsg);
    }

    const result = await response.json();
    return {
      success: true,
      name: result.name
    };
  }

  private async runRealDeleteCourse(orgDocId: string, courseId: string): Promise<any> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/courses/${courseId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to delete course document in Firestore';
      throw new Error(errMsg);
    }

    return { success: true };
  }

  // Subcollection Players operations
  getPlayers(orgDocId: string, tournamentId: string): Observable<any[]> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_players_${orgDocId}_${tournamentId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      return of(data);
    }
    return from(this.runRealGetPlayers(orgDocId, tournamentId));
  }

  createPlayer(orgDocId: string, tournamentId: string, player: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_players_${orgDocId}_${tournamentId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      data.push(player);
      localStorage.setItem(key, JSON.stringify(data));
      return of({ success: true, player });
    }
    return from(this.runRealCreatePlayer(orgDocId, tournamentId, player));
  }

  updatePlayer(orgDocId: string, tournamentId: string, playerId: string, updatedFields: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_players_${orgDocId}_${tournamentId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      const index = data.findIndex((p: any) => p.id === playerId);
      if (index !== -1) {
        data[index] = { ...data[index], ...updatedFields };
        localStorage.setItem(key, JSON.stringify(data));
        return of({ success: true, player: data[index] });
      }
      return throwError(() => new Error('PLAYER_NOT_FOUND'));
    }
    return from(this.runRealUpdatePlayer(orgDocId, tournamentId, playerId, updatedFields));
  }

  deletePlayer(orgDocId: string, tournamentId: string, playerId: string): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_players_${orgDocId}_${tournamentId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      const filtered = data.filter((p: any) => p.id !== playerId);
      localStorage.setItem(key, JSON.stringify(filtered));
      return of({ success: true });
    }
    return from(this.runRealDeletePlayer(orgDocId, tournamentId, playerId));
  }

  private async runRealGetPlayers(orgDocId: string, tournamentId: string): Promise<any[]> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/events/${tournamentId}/players`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        const err = await response.json();
        console.error('Failed to get players:', err);
        return [];
      }

      const result = await response.json();
      const documents = result.documents || [];
      return documents.map((doc: any) => {
        const data = this.mapFromFirestore(doc.fields);
        data.id = doc.name.split('/').pop();
        return data;
      });
    } catch (e) {
      console.error('Error fetching players from Firestore:', e);
      return [];
    }
  }

  private async runRealCreatePlayer(orgDocId: string, tournamentId: string, player: any): Promise<any> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/events/${tournamentId}/players?documentId=${player.id}`;

    const firestoreBody = {
      fields: this.mapToFirestore(player).mapValue.fields
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to create player document in Firestore';
      throw new Error(errMsg);
    }

    const result = await response.json();
    return {
      success: true,
      name: result.name
    };
  }

  private async runRealUpdatePlayer(orgDocId: string, tournamentId: string, playerId: string, updatedFields: any): Promise<any> {
    const projectId = environment.firebase.projectId;
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/events/${tournamentId}/players/${playerId}`;
    
    let existingFields = {};
    try {
      const getResponse = await fetch(docUrl);
      if (getResponse.ok) {
        const doc = await getResponse.json();
        existingFields = this.mapFromFirestore(doc.fields);
      }
    } catch (e) {
      console.error('Error fetching existing player for merge:', e);
    }

    const merged = { ...existingFields, ...updatedFields };
    const firestoreBody = {
      fields: this.mapToFirestore(merged).mapValue.fields
    };

    const response = await fetch(docUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to update player document in Firestore';
      throw new Error(errMsg);
    }

    const result = await response.json();
    return {
      success: true,
      name: result.name
    };
  }

  private async runRealDeletePlayer(orgDocId: string, tournamentId: string, playerId: string): Promise<any> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/events/${tournamentId}/players/${playerId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to delete player document in Firestore';
      throw new Error(errMsg);
    }

    return { success: true };
  }

  // Subcollection Teams operations
  getTeams(orgDocId: string, tournamentId: string): Observable<any[]> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_teams_${orgDocId}_${tournamentId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      return of(data);
    }
    return from(this.runRealGetTeams(orgDocId, tournamentId));
  }

  createTeam(orgDocId: string, tournamentId: string, team: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_teams_${orgDocId}_${tournamentId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      data.push(team);
      localStorage.setItem(key, JSON.stringify(data));
      return of({ success: true, team });
    }
    return from(this.runRealCreateTeam(orgDocId, tournamentId, team));
  }

  updateTeam(orgDocId: string, tournamentId: string, teamId: string, updatedFields: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_teams_${orgDocId}_${tournamentId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      const index = data.findIndex((t: any) => t.id === teamId);
      if (index !== -1) {
        data[index] = { ...data[index], ...updatedFields };
        localStorage.setItem(key, JSON.stringify(data));
        return of({ success: true, team: data[index] });
      }
      return throwError(() => new Error('TEAM_NOT_FOUND'));
    }
    return from(this.runRealUpdateTeam(orgDocId, tournamentId, teamId, updatedFields));
  }

  deleteTeam(orgDocId: string, tournamentId: string, teamId: string): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_teams_${orgDocId}_${tournamentId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      const filtered = data.filter((t: any) => t.id !== teamId);
      localStorage.setItem(key, JSON.stringify(filtered));
      return of({ success: true });
    }
    return from(this.runRealDeleteTeam(orgDocId, tournamentId, teamId));
  }

  private async runRealGetTeams(orgDocId: string, tournamentId: string): Promise<any[]> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/events/${tournamentId}/teams`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        const err = await response.json();
        console.error('Failed to get teams:', err);
        return [];
      }

      const result = await response.json();
      const documents = result.documents || [];
      return documents.map((doc: any) => {
        const data = this.mapFromFirestore(doc.fields);
        data.id = doc.name.split('/').pop();
        return data;
      });
    } catch (e) {
      console.error('Error fetching teams from Firestore:', e);
      return [];
    }
  }

  private async runRealCreateTeam(orgDocId: string, tournamentId: string, team: any): Promise<any> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/events/${tournamentId}/teams?documentId=${team.id}`;

    const firestoreBody = {
      fields: this.mapToFirestore(team).mapValue.fields
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to create team document in Firestore';
      throw new Error(errMsg);
    }

    const result = await response.json();
    return {
      success: true,
      name: result.name
    };
  }

  private async runRealUpdateTeam(orgDocId: string, tournamentId: string, teamId: string, updatedFields: any): Promise<any> {
    const projectId = environment.firebase.projectId;
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/events/${tournamentId}/teams/${teamId}`;
    
    let existingFields = {};
    try {
      const getResponse = await fetch(docUrl);
      if (getResponse.ok) {
        const doc = await getResponse.json();
        existingFields = this.mapFromFirestore(doc.fields);
      }
    } catch (e) {
      console.error('Error fetching existing team for merge:', e);
    }

    const merged = { ...existingFields, ...updatedFields };
    const firestoreBody = {
      fields: this.mapToFirestore(merged).mapValue.fields
    };

    const response = await fetch(docUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to update team document in Firestore';
      throw new Error(errMsg);
    }

    const result = await response.json();
    return {
      success: true,
      name: result.name
    };
  }

  private async runRealDeleteTeam(orgDocId: string, tournamentId: string, teamId: string): Promise<any> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/events/${tournamentId}/teams/${teamId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to delete team document in Firestore';
      throw new Error(errMsg);
    }

    return { success: true };
  }

  getStaff(orgDocId: string): Observable<any[]> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_staff_${orgDocId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      return of(data);
    }
    return from(this.runRealGetStaff(orgDocId));
  }

  createStaff(orgDocId: string, staff: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_staff_${orgDocId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      data.push(staff);
      localStorage.setItem(key, JSON.stringify(data));
      return of({ success: true, staff });
    }
    return from(this.runRealCreateStaff(orgDocId, staff));
  }

  updateStaff(orgDocId: string, staffId: string, updatedFields: any): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_staff_${orgDocId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      const index = data.findIndex((s: any) => s.id === staffId);
      if (index !== -1) {
        data[index] = { ...data[index], ...updatedFields };
        localStorage.setItem(key, JSON.stringify(data));
        return of({ success: true, staff: data[index] });
      }
      return throwError(() => new Error('STAFF_NOT_FOUND'));
    }
    return from(this.runRealUpdateStaff(orgDocId, staffId, updatedFields));
  }

  deleteStaff(orgDocId: string, staffId: string): Observable<any> {
    if (!this.isFirebaseConfigured) {
      const key = `mock_firebase_staff_${orgDocId}`;
      const dataRaw = localStorage.getItem(key);
      const data = dataRaw ? JSON.parse(dataRaw) : [];
      const filtered = data.filter((s: any) => s.id !== staffId);
      localStorage.setItem(key, JSON.stringify(filtered));
      return of({ success: true });
    }
    return from(this.runRealDeleteStaff(orgDocId, staffId));
  }

  private async runRealGetStaff(orgDocId: string): Promise<any[]> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/Staff`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        const err = await response.json();
        console.error('Failed to get staff:', err);
        return [];
      }

      const result = await response.json();
      const documents = result.documents || [];
      return documents.map((doc: any) => {
        const data = this.mapFromFirestore(doc.fields);
        data.id = doc.name.split('/').pop();
        return data;
      });
    } catch (e) {
      console.error('Error fetching staff from Firestore:', e);
      return [];
    }
  }

  private async runRealCreateStaff(orgDocId: string, staff: any): Promise<any> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/Staff?documentId=${staff.id}`;

    const firestoreBody = {
      fields: this.mapToFirestore(staff).mapValue.fields
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to create staff document in Firestore';
      throw new Error(errMsg);
    }

    const result = await response.json();
    return {
      success: true,
      name: result.name
    };
  }

  private async runRealUpdateStaff(orgDocId: string, staffId: string, updatedFields: any): Promise<any> {
    const projectId = environment.firebase.projectId;
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/Staff/${staffId}`;
    
    let existingFields = {};
    try {
      const getResponse = await fetch(docUrl);
      if (getResponse.ok) {
        const doc = await getResponse.json();
        existingFields = this.mapFromFirestore(doc.fields);
      }
    } catch (e) {
      console.error('Error fetching existing staff for merge:', e);
    }

    const merged = { ...existingFields, ...updatedFields };
    const firestoreBody = {
      fields: this.mapToFirestore(merged).mapValue.fields
    };

    const response = await fetch(docUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreBody)
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to update staff document in Firestore';
      throw new Error(errMsg);
    }

    const result = await response.json();
    return {
      success: true,
      name: result.name
    };
  }

  private async runRealDeleteStaff(orgDocId: string, staffId: string): Promise<any> {
    const projectId = environment.firebase.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations/${orgDocId}/Staff/${staffId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const err = await response.json();
      const errMsg = err.error?.message || 'Failed to delete staff document in Firestore';
      throw new Error(errMsg);
    }

    return { success: true };
  }
}
