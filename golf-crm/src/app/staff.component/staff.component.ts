import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../services/firebase.service';
import { LoaderComponent } from '../components/loader.component';
import { ToastService } from '../services/toast.service';

interface StaffMember {
  id: string; // e.g., STF-001
  name: string;
  email: string;
  assignedCourse: string; // e.g., Oak Valley Championship, Pine Ridge Executive, Cedar Creek Links, Unassigned
  status: 'Active' | 'Inactive';
  joinDate: string; // e.g., Mar 12, 2024
  initials: string;
}

@Component({
  selector: 'app-staff.component',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.css',
})
export class StaffComponent implements OnInit {
  private firebaseService = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);
  private toastService = inject(ToastService);

  staffList: StaffMember[] = [];
  isLoading = true;

  // Statistics
  totalStaff = 0;
  activeCount = 0;
  inactiveCount = 0;
  assignedCount = 0;

  // Search & Filter
  searchQuery = '';
  statusFilter = 'All';
  courseFilter = 'All';

  // Unique list of courses for dropdown filters
  courses: string[] = [];

  // Modal states
  showAddModal = false;
  showAssignModal = false;

  isSendingEmail = false;
  toastMessage = '';

  // New staff form data
  newStaff = {
    name: '',
    email: '',
    assignedCourse: 'Unassigned',
    status: 'Active' as 'Active' | 'Inactive'
  };

  // Assign course target
  selectedStaffForAssign: StaffMember | null = null;
  newAssignedCourse = 'Unassigned';

  ngOnInit() {
    this.loadCourses();
    const orgDocId = this.firebaseService.getOrgDocId();
    this.firebaseService.getStaff(orgDocId).subscribe({
      next: (list) => {
        const mockEmails = [
          'marcus@oakvalleygolf.com',
          'priya@oakvalleygolf.com',
          'diego@oakvalleygolf.com',
          'hannah@oakvalleygolf.com',
          'kenji@oakvalleygolf.com'
        ];
        this.staffList = list ? list.filter(s => s && s.email && !mockEmails.includes(s.email)) : [];
        this.saveStaff();
        this.calculateStats();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('Error fetching staff list:', e);
        try {
          const saved = localStorage.getItem('golf_crm_staff');
          if (saved) {
            const parsed = JSON.parse(saved);
            const mockEmails = [
              'marcus@oakvalleygolf.com',
              'priya@oakvalleygolf.com',
              'diego@oakvalleygolf.com',
              'hannah@oakvalleygolf.com',
              'kenji@oakvalleygolf.com'
            ];
            this.staffList = Array.isArray(parsed) ? parsed.filter(s => s && s.email && !mockEmails.includes(s.email)) : [];
          }
        } catch (err) {}
        this.calculateStats();
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  saveStaff() {
    try {
      localStorage.setItem('golf_crm_staff', JSON.stringify(this.staffList || []));
    } catch (e) {
      console.error('Error saving staff to localStorage:', e);
    }
  }

  calculateStats() {
    const list = this.staffList || [];
    this.totalStaff = list.length;
    this.activeCount = list.filter(s => s && s.status === 'Active').length;
    this.inactiveCount = list.filter(s => s && s.status === 'Inactive').length;
    this.assignedCount = list.filter(s => s && s.assignedCourse && s.assignedCourse !== 'Unassigned').length;
  }

  getFilteredStaff(): StaffMember[] {
    const query = this.searchQuery.toLowerCase().trim();
    return this.staffList.filter(s => {
      let matchesSearch = true;
      if (query) {
        const nameWords = (s.name || '').toLowerCase().split(/\s+/);
        const emailWords = (s.email || '').toLowerCase().split(/[\s@._-]+/);
        const courseWords = (s.assignedCourse || '').toLowerCase().split(/\s+/);

        matchesSearch =
          nameWords.some(word => word.startsWith(query)) ||
          emailWords.some(word => word.startsWith(query)) ||
          courseWords.some(word => word.startsWith(query));
      }

      const matchesStatus = this.statusFilter === 'All' || s.status === this.statusFilter;
      const matchesCourse = this.courseFilter === 'All' || s.assignedCourse === this.courseFilter;

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }

  toggleStatus(staff: StaffMember) {
    const oldStatus = staff.status;
    const newStatus = oldStatus === 'Active' ? 'Inactive' : 'Active';
    
    // Optimistic UI update for instant responsiveness
    staff.status = newStatus;
    this.saveStaff();
    this.calculateStats();
    this.cdr.detectChanges();

    const orgDocId = this.firebaseService.getOrgDocId();
    this.firebaseService.updateStaff(orgDocId, staff.id, { status: newStatus }).subscribe({
      next: () => {
        // Success
      },
      error: (e) => {
        console.error('Failed to update status in Firestore, reverting:', e);
        this.toastService.showError('Failed to update staff status in database: ' + (e.message || String(e)));
        // Revert on failure
        staff.status = oldStatus;
        this.saveStaff();
        this.calculateStats();
        this.cdr.detectChanges();
      }
    });
  }

  deleteStaff(staff: StaffMember) {
    if (confirm(`Are you sure you want to delete staff member ${staff.name}?`)) {
      const orgDocId = this.firebaseService.getOrgDocId();
      this.firebaseService.deleteStaff(orgDocId, staff.id).subscribe({
        next: () => {
          this.staffList = this.staffList.filter(s => s.id !== staff.id);
          this.saveStaff();
          this.calculateStats();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Failed to delete staff from Firestore:', e);
          this.toastService.showError('Failed to delete staff member from database: ' + (e.message || String(e)));
        }
      });
    }
  }

  viewStaff(staff: StaffMember) {
    this.toastService.showInfo(`Staff Details - Name: ${staff.name} | ID: ${staff.id} | Email: ${staff.email} | Course: ${staff.assignedCourse} | Status: ${staff.status} | Joined: ${staff.joinDate}`);
  }

  openAddModal() {
    this.newStaff = {
      name: '',
      email: '',
      assignedCourse: 'Unassigned',
      status: 'Active'
    };
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  submitAddStaff() {
    if (!this.newStaff.name || !this.newStaff.name.trim() || !this.newStaff.email || !this.newStaff.email.trim()) {
      this.toastService.showError('Please fill out all fields.');
      return;
    }
    this.newStaff.email = this.newStaff.email.trim().toLowerCase();
    this.newStaff.name = this.newStaff.name.trim();

    this.isSendingEmail = true;
    this.cdr.detectChanges();

    const orgDocId = this.firebaseService.getOrgDocId();

    // Helper to generate the local staff model and update lists/stats
    const completeStaffAdditionLocally = (newlyCreated: StaffMember) => {
      this.staffList = this.staffList || [];
      this.staffList.push(newlyCreated);
      this.saveStaff();
      this.calculateStats();
      this.showAddModal = false;

      const setupUrl = window.location.origin + '/set-password?email=' + encodeURIComponent(newlyCreated.email) +
        '&orgId=' + encodeURIComponent(orgDocId) +
        '&staffId=' + encodeURIComponent(newlyCreated.id);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(setupUrl).catch(() => { });
        }
      } catch (e) { }
    };

    // Calculate details
    const list = this.staffList || [];
    const maxNum = list.reduce((max, s) => {
      if (!s || !s.id) return max;
      const cleanId = String(s.id).replace('STF-', '');
      const num = parseInt(cleanId, 10);
      return isNaN(num) ? max : (num > max ? num : max);
    }, 0);
    const nextId = 'STF-' + String(maxNum + 1).padStart(3, '0');

    const names = String(this.newStaff.name || '').trim().split(' ').filter(n => n.length > 0);
    let initials = 'ST';
    if (names.length >= 2) {
      initials = (names[0][0] + names[names.length - 1][0]).toUpperCase();
    } else if (names.length === 1) {
      initials = names[0].substring(0, 2).toUpperCase();
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = new Date();
    const formattedDate = `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;

    const newlyCreated: StaffMember = {
      id: nextId,
      name: this.newStaff.name,
      email: this.newStaff.email,
      assignedCourse: this.newStaff.assignedCourse,
      status: this.newStaff.status,
      joinDate: formattedDate,
      initials: initials
    };

    if (this.firebaseService.isFirebaseConfigured) {
      // 1. Create the user in Firebase Auth and send the real setup email
      this.firebaseService.createStaffUser({
        email: this.newStaff.email,
        name: this.newStaff.name,
        orgId: orgDocId,
        staffId: newlyCreated.id
      }).subscribe({
        next: () => {
          // 2. Save the staff member document in the organization's staff subcollection in Firestore
          this.firebaseService.createStaff(orgDocId, newlyCreated).subscribe({
            next: () => {
              completeStaffAdditionLocally(newlyCreated);
              this.toastMessage = `Staff added!.Activation link has also been copied to your clipboard!`;
              this.isSendingEmail = false;
              this.cdr.detectChanges();
              setTimeout(() => {
                this.toastMessage = '';
                this.cdr.detectChanges();
              }, 5000);
            },
            error: (dbErr) => {
              console.error('Error saving staff to Firestore:', dbErr);
              this.toastService.showError('Failed to save staff details in database: ' + (dbErr.message || String(dbErr)));
              this.isSendingEmail = false;
              this.cdr.detectChanges();
            }
          });
        },
        error: (err) => {
          console.error('Error adding staff member Auth:', err);
          this.toastService.showError('Failed to register staff account: ' + (err.message || String(err)));
          this.isSendingEmail = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      // Simulated Mode
      setTimeout(() => {
        this.firebaseService.createStaff(orgDocId, newlyCreated).subscribe({
          next: () => {
            // Save to local mock storage
            try {
              const orgKey = 'mock_firebase_organizers';
              const existingRaw = localStorage.getItem(orgKey);
              const existing = existingRaw ? JSON.parse(existingRaw) : [];
              if (Array.isArray(existing)) {
                if (!existing.some((u: any) => u && u.email === this.newStaff.email)) {
                  existing.push({
                    id: 'org_' + Math.random().toString(36).substring(2, 11),
                    createdAt: new Date().toISOString(),
                    email: this.newStaff.email,
                    password: '',
                    role: 'Staff'
                  });
                  localStorage.setItem(orgKey, JSON.stringify(existing));
                }
              }
            } catch (e) { }

            completeStaffAdditionLocally(newlyCreated);
            this.toastMessage = `Invitation link simulated & copied for: ${this.newStaff.email}!`;
            this.isSendingEmail = false;
            this.cdr.detectChanges();
            setTimeout(() => {
              this.toastMessage = '';
              this.cdr.detectChanges();
            }, 5000);
          },
          error: (err) => {
            console.error('Error simulating staff addition:', err);
            this.isSendingEmail = false;
            this.cdr.detectChanges();
          }
        });
      }, 1500);
    }
  }

  openAssignModal(staff: StaffMember) {
    this.selectedStaffForAssign = staff;
    this.newAssignedCourse = staff.assignedCourse;
    this.showAssignModal = true;
  }

  closeAssignModal() {
    this.showAssignModal = false;
    this.selectedStaffForAssign = null;
  }

  submitAssignCourse() {
    if (this.selectedStaffForAssign) {
      const staff = this.selectedStaffForAssign;
      const orgDocId = this.firebaseService.getOrgDocId();
      this.firebaseService.updateStaff(orgDocId, staff.id, { assignedCourse: this.newAssignedCourse }).subscribe({
        next: () => {
          staff.assignedCourse = this.newAssignedCourse;
          this.saveStaff();
          this.calculateStats();
          this.closeAssignModal();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Failed to update assignment in Firestore:', e);
          this.toastService.showError('Failed to update course assignment in database: ' + (e.message || String(e)));
        }
      });
    }
  }

  loadCourses() {
    // 1. Load from localStorage activeOrganization
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        const courseNames: string[] = [];
        if (org.courseName) {
          courseNames.push(org.courseName);
        }
        if (org.courses && org.courses.length > 0) {
          org.courses.forEach((c: any) => {
            if (c.name) {
              courseNames.push(c.name);
            }
          });
        }
        if (courseNames.length > 0) {
          this.courses = courseNames;
        }
      }
    } catch (e) {
      console.error('Error loading localStorage courses on staff component:', e);
    }

    // 2. Load from Firebase getCourses
    const orgDocId = this.firebaseService.getOrgDocId();
    this.firebaseService.getCourses(orgDocId).subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          this.courses = list.map((c: any) => c.name);
          this.cdr.detectChanges();
        }
      }
    });
  }
}
