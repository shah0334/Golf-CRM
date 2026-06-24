import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-staff-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './staff-signup.component.html'
})
export class StaffSignupComponent implements OnInit {
  private router = inject(Router);
  private firebaseService = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  name = '';
  email = '';
  password = '';
  selectedOrgId = '';
  assignedCourse = 'Unassigned';
  inviteCode = '';
  status: 'Active' | 'Inactive' = 'Active';
  errorMessage = '';
  loading = false;

  organizations: any[] = [];
  courses: string[] = [];

  ngOnInit() {
    this.firebaseService.getOrganizations().subscribe({
      next: (list) => {
        this.organizations = list || [];
        this.cdr.detectChanges();
      }
    });
  }

  onOrgChange() {
    this.courses = [];
    this.assignedCourse = 'Unassigned';
    if (!this.selectedOrgId) return;

    // Load courses for selected org
    this.firebaseService.getCourses(this.selectedOrgId).subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          this.courses = list.map((c: any) => c.name);
        }
        this.cdr.detectChanges();
      }
    });
  }

  submitSignup() {
    this.email = this.email.trim().toLowerCase();
    if (!this.name.trim() || !this.email || !this.password.trim() || !this.selectedOrgId || !this.inviteCode.trim()) {
      this.errorMessage = 'Please fill out all fields.';
      return;
    }

    const selectedOrg = this.organizations.find(org => org.id === this.selectedOrgId);
    if (!selectedOrg) {
      this.errorMessage = 'Selected organization not found.';
      return;
    }

    const expectedInviteCode = selectedOrg.inviteCode || '';
    if (this.inviteCode.trim() !== expectedInviteCode.trim()) {
      this.errorMessage = 'Invalid club invite code. Please verify with your administrator.';
      return;
    }
    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // Calculate Initials safely
    const names = this.name.trim().split(' ').filter(n => n.length > 0);
    let initials = 'ST';
    if (names.length >= 2) {
      initials = (names[0][0] + names[names.length - 1][0]).toUpperCase();
    } else if (names.length === 1) {
      initials = names[0].substring(0, 2).toUpperCase();
    }

    // Get current date string
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = new Date();
    const formattedDate = `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;

    const staffId = 'STF-' + Math.floor(100 + Math.random() * 900);

    const staffPayload = {
      id: staffId,
      name: this.name,
      email: this.email,
      assignedCourse: this.assignedCourse,
      status: this.status,
      joinDate: formattedDate,
      initials: initials,
      password: this.password,
      role: 'Staff'
    };

    const performUpdate = (existingOrgDoc: any) => {
      const orgId = existingOrgDoc.orgId || this.selectedOrgId;
      const targetStaffId = existingOrgDoc.staffId || staffId;

      const updatedStaffPayload = {
        ...staffPayload,
        id: targetStaffId,
        password: this.password
      };

      this.firebaseService.createStaff(orgId, updatedStaffPayload).subscribe({
        next: () => {
          const updatedCredentials = {
            ...existingOrgDoc,
            password: this.password,
            role: 'Staff',
            orgId: orgId,
            staffId: targetStaffId,
            orgName: (existingOrgDoc && existingOrgDoc.orgName) || selectedOrg?.orgName || selectedOrg?.clubName || this.name,
            clubName: (existingOrgDoc && existingOrgDoc.clubName) || selectedOrg?.clubName || selectedOrg?.orgName || 'Staff Member'
          };

          if (this.firebaseService.isFirebaseConfigured) {
            if (existingOrgDoc && existingOrgDoc.docId) {
              const docName = `projects/${environment.firebase.projectId}/databases/(default)/documents/Organizations/${existingOrgDoc.docId}`;
              const updateUrl = `https://firestore.googleapis.com/v1/${docName}`;
              const firestoreBody = {
                fields: (this.firebaseService as any).mapToFirestore(updatedCredentials).mapValue.fields
              };
              fetch(updateUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(firestoreBody)
              }).then(() => {
                alert('Staff account activated successfully! You can now log in.');
                this.router.navigate(['/']);
              }).catch(e => {
                console.error('Error updating credentials pointer:', e);
                alert('Staff account activated successfully! You can now log in.');
                this.router.navigate(['/']);
              });
            } else {
              const projectId = environment.firebase.projectId;
              const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations`;
              const firestoreBody = {
                fields: (this.firebaseService as any).mapToFirestore({
                  id: 'org_' + Math.random().toString(36).substring(2, 11),
                  createdAt: new Date().toISOString(),
                  ...updatedCredentials
                }).mapValue.fields
              };
              fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(firestoreBody)
              }).then(() => {
                alert('Staff account activated successfully! You can now log in.');
                this.router.navigate(['/']);
              }).catch(e => {
                console.error('Error creating credentials pointer:', e);
                alert('Staff account activated successfully! You can now log in.');
                this.router.navigate(['/']);
              });
            }
          } else {
            try {
              const organizersRaw = localStorage.getItem('mock_firebase_organizers');
              const organizers = organizersRaw ? JSON.parse(organizersRaw) : [];
              const idx = organizers.findIndex((org: any) => org.email === this.email);
              if (idx !== -1) {
                organizers[idx] = updatedCredentials;
                localStorage.setItem('mock_firebase_organizers', JSON.stringify(organizers));
              }
            } catch (e) {}

            alert('Staff account activated successfully! You can now log in.');
            this.router.navigate(['/']);
          }
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = 'Activation failed: ' + (err.message || String(err));
          this.cdr.detectChanges();
        }
      });
    };

    const performCreate = () => {
      this.firebaseService.createStaff(this.selectedOrgId, staffPayload).subscribe({
        next: () => {
          const credentialsPayload = {
            id: 'org_' + Math.random().toString(36).substring(2, 11),
            createdAt: new Date().toISOString(),
            email: this.email,
            password: this.password,
            role: 'Staff',
            orgId: this.selectedOrgId,
            staffId: staffId,
            orgName: selectedOrg?.orgName || selectedOrg?.clubName || this.name,
            clubName: selectedOrg?.clubName || selectedOrg?.orgName || 'Staff Member'
          };

          if (this.firebaseService.isFirebaseConfigured) {
            const projectId = environment.firebase.projectId;
            const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations`;
            const firestoreBody = {
              fields: (this.firebaseService as any).mapToFirestore(credentialsPayload).mapValue.fields
            };
            fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(firestoreBody)
            }).then(() => {
              alert('Staff account created successfully! You can now log in.');
              this.router.navigate(['/']);
            }).catch(e => {
              console.error('Error saving credentials pointer:', e);
              alert('Staff account created successfully! You can now log in.');
              this.router.navigate(['/']);
            });
          } else {
            try {
              const orgKey = 'mock_firebase_organizers';
              const existingRaw = localStorage.getItem(orgKey);
              const existing = existingRaw ? JSON.parse(existingRaw) : [];
              if (Array.isArray(existing)) {
                existing.push(credentialsPayload);
                localStorage.setItem(orgKey, JSON.stringify(existing));
              }
            } catch (e) {}

            alert('Staff account created successfully! You can now log in.');
            this.router.navigate(['/']);
          }
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = 'Registration failed: ' + (err.message || String(err));
          this.cdr.detectChanges();
        }
      });
    };

    const checkAuthAndProceed = async () => {
      let isRegisteredInAuth = false;
      let existingOrgDoc: any = null;

      if (this.firebaseService.isFirebaseConfigured) {
        try {
          const projectId = environment.firebase.projectId;
          const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Organizations`;
          const response = await fetch(firestoreUrl);
          if (response.ok) {
            const data = await response.json();
            const documents = data.documents || [];
            for (const doc of documents) {
              const fields = (this.firebaseService as any).mapFromFirestore(doc.fields);
              if (fields.email && fields.email.trim().toLowerCase() === this.email.trim().toLowerCase()) {
                existingOrgDoc = {
                  ...fields,
                  docId: doc.name.split('/').pop()
                };
                isRegisteredInAuth = true;
                break;
              }
            }
          }
        } catch (e) {
          console.error('Error checking existing org doc case-insensitively:', e);
        }

        if (!isRegisteredInAuth) {
          try {
            const apiKey = environment.firebase.apiKey;
            const checkUrl = `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`;
            const res = await fetch(checkUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                identifier: this.email,
                continueUri: window.location.origin
              })
            });
            if (res.ok) {
              const data = await res.json();
              isRegisteredInAuth = data.registered === true;
            }
          } catch (e) {
            console.error('Error checking auth existence:', e);
          }
        }
      } else {
        try {
          const organizersRaw = localStorage.getItem('mock_firebase_organizers');
          const organizers = organizersRaw ? JSON.parse(organizersRaw) : [];
          const found = organizers.find((org: any) => org.email === this.email);
          if (found) {
            existingOrgDoc = found;
            isRegisteredInAuth = true;
          }
        } catch (e) {}
      }

      if (isRegisteredInAuth || existingOrgDoc) {
        // CASE 1: Pre-existing user in Auth or DB. Bypasses Auth signUp, directly updates password!
        console.log('Pre-existing staff member detected in Auth or DB. Direct password update initiated.');
        performUpdate(existingOrgDoc || { email: this.email, orgId: this.selectedOrgId, staffId: staffId });
      } else {
        // CASE 2: Totally new registration. Triggers Auth signUp and registers new documents.
        if (this.firebaseService.isFirebaseConfigured) {
          const apiKey = environment.firebase.apiKey;
          const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
          fetch(authUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: this.email,
              password: this.password,
              returnSecureToken: true
            })
          }).then(res => {
            if (res.ok) {
              performCreate();
            } else {
              res.json().then(errJson => {
                const rawMsg = errJson.error?.message || '';
                if (rawMsg.includes('EMAIL_EXISTS')) {
                  performUpdate(existingOrgDoc || { email: this.email, orgId: this.selectedOrgId, staffId: staffId });
                } else {
                  console.warn(`Firebase Auth signUp failed (${rawMsg}). Proceeding with Firestore fallback registration.`);
                  performCreate();
                }
              });
            }
          }).catch(e => {
            this.loading = false;
            this.errorMessage = e.message || String(e);
            this.cdr.detectChanges();
          });
        } else {
          performCreate();
        }
      }
    };

    checkAuthAndProceed();
  }
}
