import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-setting',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './setting.component.html',
  styleUrl: './setting.component.css',
})
export class SettingComponent implements OnInit {
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  isStaff = false;
  isSaving = false;

  // Admin settings fields
  orgName = '';
  courseName = '';
  orgEmail = '';
  phone = '';
  inviteCode = '';
  newPassword = '';
  confirmPassword = '';

  // Staff info fields (read-only)
  staffName = '';
  staffEmail = '';
  assignedCourse = '';
  assignedOrgName = '';

  ngOnInit() {
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        if (org.role === 'Staff') {
          this.isStaff = true;
          this.staffName = org.fullName || org.name || 'Staff Member';
          this.staffEmail = org.email || '';
          this.assignedCourse = org.assignedCourse || org.courseName || 'Unassigned';
          this.assignedOrgName = org.orgName || org.clubName || 'Unknown Club';
        } else {
          this.isStaff = false;
          this.orgName = org.orgName || org.clubName || '';
          this.courseName = org.courseName || (org.course?.courseName) || '';
          this.orgEmail = org.orgEmail || org.email || '';
          this.phone = org.phone || '';
          this.inviteCode = org.inviteCode || '';
        }
      } else {
        this.router.navigate(['/login']);
      }
    } catch (e) {
      console.error(e);
      this.toastService.showError('Failed to load settings data.');
    }
  }

  saveSettings() {
    if (this.isSaving) return;

    if (this.newPassword) {
      if (this.newPassword.length < 6) {
        this.toastService.showError('New password must be at least 6 characters long.');
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.toastService.showError('Passwords do not match.');
        return;
      }
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        
        const updatedData: any = {
          orgName: this.orgName,
          clubName: this.orgName,
          phone: this.phone,
          orgEmail: this.orgEmail,
          email: this.orgEmail,
          inviteCode: this.inviteCode
        };

        if (this.newPassword) {
          updatedData.password = this.newPassword;
        }

        const email = org.email;
        const uid = org.uid || org.id;

        this.firebaseService.updateOrganization(email, uid, updatedData).subscribe({
          next: (res) => {
            this.isSaving = false;
            const merged = { ...org, ...updatedData };
            localStorage.setItem('activeOrganization', JSON.stringify(merged));
            localStorage.setItem('orgName', this.orgName);
            localStorage.setItem('orgEmail', this.orgEmail);
            window.dispatchEvent(new Event('local-storage-update'));
            this.newPassword = '';
            this.confirmPassword = '';
            this.toastService.showSuccess('Settings updated successfully!');
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.isSaving = false;
            console.error(err);
            this.toastService.showError('Failed to update settings. Please try again.');
            this.cdr.detectChanges();
          }
        });
      } else {
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    } catch (e) {
      this.isSaving = false;
      console.error(e);
      this.toastService.showError('An error occurred while saving.');
      this.cdr.detectChanges();
    }
  }
}
