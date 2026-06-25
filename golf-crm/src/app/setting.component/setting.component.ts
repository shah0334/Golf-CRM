import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-setting',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './setting.component.html',
  styleUrl: './setting.component.css',
})
export class SettingComponent implements OnInit {
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);

  isStaff = false;
  successMessage = '';
  errorMessage = '';

  // Admin settings fields
  orgName = '';
  courseName = '';
  orgEmail = '';
  phone = '';
  inviteCode = '';

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
      this.errorMessage = 'Failed to load settings data.';
    }
  }

  saveSettings() {
    this.successMessage = '';
    this.errorMessage = '';

    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        
        const updatedData = {
          orgName: this.orgName,
          clubName: this.orgName,
          phone: this.phone,
          orgEmail: this.orgEmail,
          email: this.orgEmail,
          inviteCode: this.inviteCode
        };

        const email = org.email;
        const uid = org.id || org.uid;

        this.firebaseService.updateOrganization(email, uid, updatedData).subscribe({
          next: (res) => {
            const merged = { ...org, ...updatedData };
            localStorage.setItem('activeOrganization', JSON.stringify(merged));
            localStorage.setItem('orgName', this.orgName);
            localStorage.setItem('orgEmail', this.orgEmail);
            this.successMessage = 'Settings updated successfully!';
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          },
          error: (err) => {
            console.error(err);
            this.errorMessage = 'Failed to update settings. Please try again.';
          }
        });
      }
    } catch (e) {
      console.error(e);
      this.errorMessage = 'An error occurred while saving.';
    }
  }
}
