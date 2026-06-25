import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive, FormsModule],
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent implements OnInit {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private firebaseService = inject(FirebaseService);

  isSigningOut = false;

  orgName = 'Oak Valley Golf Club';
  userName = 'Tournament Admin';
  userInitials = 'OV';

  // Staff-specific
  isStaff = false;
  staffName = '';
  assignedCourse = '';

  searchQuery = '';
  showArchived = false;
  isMobileMenuOpen = false;

  ngOnInit() {
    this.loadOrganizationDetails();
  }

  @HostListener('window:local-storage-update')
  loadOrganizationDetails() {
    this.orgName = localStorage.getItem('orgName') || 'Oak Valley Golf Club';
    
    // Default user initials calculation
    const words = this.orgName.split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      this.userInitials = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1) {
      this.userInitials = words[0].substring(0, 2).toUpperCase();
    } else {
      this.userInitials = 'OV';
    }

    // Load dynamic organization details if available
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        this.orgName = org.orgName || org.clubName || this.orgName;

        // Detect staff role
        if (org.role === 'Staff') {
          this.isStaff = true;
          this.staffName = org.fullName || org.name || org.email || 'Staff Member';
          this.assignedCourse = org.assignedCourse || org.courseName || '';
          this.userName = this.staffName;
          // Fetch real organization details to fix corrupted local storage orgName
          this.firebaseService.getOrganizations().subscribe({
            next: (orgs) => {
              if (orgs && orgs.length > 0) {
                const parentOrg = orgs.find(o => o.id === org.orgId || o.docId === this.firebaseService.getOrgDocId());
                if (parentOrg && (parentOrg.orgName || parentOrg.clubName)) {
                  this.orgName = parentOrg.orgName || parentOrg.clubName;
                  
                  // Recalculate initials
                  const updatedWords = this.orgName.split(' ').filter(w => w.length > 0);
                  if (updatedWords.length >= 2) {
                    this.userInitials = (updatedWords[0][0] + updatedWords[1][0]).toUpperCase();
                  } else if (updatedWords.length === 1) {
                    this.userInitials = updatedWords[0].substring(0, 2).toUpperCase();
                  }
                  
                  this.cdr.detectChanges();
                }
              }
            }
          });
          
          // Use staff name for initials by default (may be overridden by org initials above)
          const snWords = this.staffName.split(' ').filter((w: string) => w.length > 0);
          if (snWords.length >= 2) {
            this.userInitials = (snWords[0][0] + snWords[1][0]).toUpperCase();
          } else if (snWords.length === 1) {
            this.userInitials = snWords[0].substring(0, 2).toUpperCase();
          }
        } else {
          // Recalculate initials for the loaded organization name
          const updatedWords = this.orgName.split(' ').filter(w => w.length > 0);
          if (updatedWords.length >= 2) {
            this.userInitials = (updatedWords[0][0] + updatedWords[1][0]).toUpperCase();
          } else if (updatedWords.length === 1) {
            this.userInitials = updatedWords[0].substring(0, 2).toUpperCase();
          }
        }
      }
    } catch (e) {
      console.error('Error loading active organization details on admin layout:', e);
    }
  }

  signOut() {
    this.isSigningOut = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      const rememberMe = localStorage.getItem('rememberMe');

      localStorage.clear();

      if (rememberedEmail) {
        localStorage.setItem('rememberedEmail', rememberedEmail);
      }
      if (rememberMe) {
        localStorage.setItem('rememberMe', rememberMe);
      }

      this.router.navigate(['/']);
    }, 800);
  }

  getPageTitle(): string {
    const url = this.router.url;
    if (url.includes('/admin-dashboard/courses')) {
      return 'Courses';
    } else if (url.includes('/admin-dashboard/events')) {
      return 'Events';
    } else if (url.includes('/admin-dashboard/staff')) {
      return 'Staff Management';
    } else if (url.includes('/admin-dashboard/leaderboard')) {
      return 'Leaderboards';
    } else if (url.includes('/admin-dashboard/player')) {
      return 'Players';
    } else if (url.includes('/admin-dashboard/scorecard')) {
      return 'Scores';
    } else if (url.includes('/admin-dashboard/roster')) {
      return 'Roster';
    }
    return this.isStaff ? 'Staff Dashboard' : 'Dashboard';
  }
}
