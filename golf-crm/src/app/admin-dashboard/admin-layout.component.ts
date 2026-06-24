import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive, FormsModule],
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent implements OnInit {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  isSigningOut = false;

  orgName = 'Oak Valley Golf Club';
  userName = 'Tournament Admin';
  userInitials = 'OV';

  searchQuery = '';
  showArchived = false;
  isMobileMenuOpen = false;

  ngOnInit() {
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
        
        // Recalculate initials for the loaded organization name
        const updatedWords = this.orgName.split(' ').filter(w => w.length > 0);
        if (updatedWords.length >= 2) {
          this.userInitials = (updatedWords[0][0] + updatedWords[1][0]).toUpperCase();
        } else if (updatedWords.length === 1) {
          this.userInitials = updatedWords[0].substring(0, 2).toUpperCase();
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
    }
    return 'Dashboard';
  }
}
