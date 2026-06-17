import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RegistrationService } from '../../../services/registration.service';
import { FirebaseService } from '../../../services/firebase.service';
import { Hole } from '../../../interfaces/registration.interface';


@Component({
  selector: 'app-finish',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './finish.component.html',
  styleUrl: './finish.component.css',
})
export class FinishComponent implements OnInit {
  private router = inject(Router);
  private registrationService = inject(RegistrationService);
  private firebaseService = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  isSubmitting = false;
  errorMessage: string | null = null;
  teeBoxError = false;
  courseUrlError = false;

  orgName = 'Oak Valley Golf Club';
  courseName = 'Oak Valley Championship Course';
  holesConfigured = '18 holes';
  brandingAssets = 'Skipped';
  scorecardImported = 'No';

  teeBoxNames = 'Black, Blue, White, Red';
  teeBoxes: string[] = ['Black', 'Blue', 'White', 'Red'];
  
  courseUrlAutoGenerate = true;
  courseUrl = '/course/oak-valley-championship-course';

  showHoleBuilderModal = false;
  
  holesList: Hole[] = [];

  ngOnInit() {
    const data = this.registrationService.getData();
    this.orgName = data.orgName || data.clubName || 'Oak Valley Golf Club';
    this.courseName = data.courseName || 'Oak Valley Championship Course';
    
    const logo = data.logoPreview || data.logoFileName;
    this.brandingAssets = logo ? 'Uploaded' : 'Skipped';
    this.scorecardImported = data.scorecardPreview ? 'Yes' : 'No'; 

    this.onTeeBoxNamesChange(this.teeBoxNames);
    this.generateUrlSlug();
    this.initializeHoles();
  }

  onTeeBoxNamesChange(val: string) {
    this.teeBoxes = val.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  onCourseUrlAutoGenerateChange(checked: boolean) {
    this.courseUrlAutoGenerate = checked;
    if (checked) {
      this.generateUrlSlug();
    }
  }

  generateUrlSlug() {
    if (this.courseUrlAutoGenerate && this.courseName) {
      const slug = this.courseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      this.courseUrl = `/course/${slug}`;
    }
  }

  onCourseUrlManualChange(val: string) {
    if (!this.courseUrlAutoGenerate) {
      this.courseUrl = val;
    }
  }

  initializeHoles() {
    this.holesList = [];
    for (let i = 1; i <= 18; i++) {
      const yardsMap: { [teeName: string]: number } = {};
      this.teeBoxes.forEach((tee, idx) => {
        const base = 450 - idx * 40;
        yardsMap[tee] = base + (i * 7) % 30;
      });

      this.holesList.push({
        holeNumber: i,
        par: i % 3 === 0 ? 3 : i % 5 === 0 ? 5 : 4,
        handicap: i,
        yards: yardsMap
      });
    }
  }

  saveHoles() {
    this.showHoleBuilderModal = false;
    this.holesConfigured = '18 holes (Configured)';
  }

  finishSetup() {
    this.teeBoxError = !this.teeBoxNames || !this.teeBoxNames.trim();
    this.courseUrlError = !this.courseUrl || !this.courseUrl.trim();

    const registrationData = this.registrationService.getData();
    
    const missing: string[] = [];
    const invalid: string[] = [];

    const isUrlValid = (url: string) => {
      if (!url) return false;
      try {
        const testUrl = url.startsWith('http://') || url.startsWith('https://') ? url : 'https://' + url;
        new URL(testUrl);
        return true;
      } catch (_) {
        return false;
      }
    };

    // Step 1 Validation
    if (!registrationData.clubName) missing.push('Club Name (Step 1)');
    if (!registrationData.email) missing.push('Email Address (Step 1)');
    if (!registrationData.password) missing.push('Password (Step 1)');

    // Step 3 Validation
    if (!registrationData.orgName) missing.push('Organization Name (Step 3)');
    if (!registrationData.courseName) missing.push('Course Name (Step 3)');
    if (!registrationData.orgEmail) missing.push('Organization Email (Step 3)');
    if (!registrationData.phone) missing.push('Phone Number (Step 3)');
    if (!registrationData.inviteCode) missing.push('Invite Code (Step 3)');

    // Step 4 Validation
    if (!(registrationData.logoPreview || registrationData.logoFileName)) {
      missing.push('Course Logo (Step 4)');
    }
    if (!registrationData.websiteUrl) {
      missing.push('Website URL (Step 4)');
    } else if (!isUrlValid(registrationData.websiteUrl)) {
      invalid.push('Website URL (Step 4)');
    }
    if (!registrationData.bookingUrl) {
      missing.push('Book Online URL (Step 4)');
    } else if (!isUrlValid(registrationData.bookingUrl)) {
      invalid.push('Book Online URL (Step 4)');
    }

    // Step 5 Validation
    if (this.teeBoxError) missing.push('Tee Boxes (Step 5)');
    if (this.courseUrlError) missing.push('Course URL Slug (Step 5)');

    if (missing.length > 0 || invalid.length > 0) {
      const messages: string[] = [];
      if (missing.length > 0) {
        messages.push(`Required fields are empty: ${missing.join(', ')}.`);
      }
      if (invalid.length > 0) {
        messages.push(`Invalid format for: ${invalid.join(', ')}.`);
      }
      this.errorMessage = messages.join(' ');
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    // Consolidate full form data from all steps
    const fullPayload = {
      ...registrationData,
      teeBoxes: this.teeBoxes,
      holesList: this.holesList,
      courseUrl: this.courseUrl
    };

    this.firebaseService.createOrganizer(fullPayload).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        console.log('Firebase onboarding completion successful:', response);
        // Persist organization name in localStorage for the AdminDashboard component
        localStorage.setItem('orgName', fullPayload.orgName || fullPayload.clubName || 'Oak Valley Golf Club');
        localStorage.setItem('activeOrganization', JSON.stringify(fullPayload));
        
        // Clear multi-step wizard state
        this.registrationService.clear();

        // Redirect to admin dashboard
        this.router.navigate(['/admin-dashboard']);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        console.error('Failed to register organizer in Firebase:', err);
        
        if (err?.message === 'EMAIL_ALREADY_REGISTERED') {
          this.errorMessage = 'This email is already registered. Please go back to Step 1 and use a different email.';
        } else {
          this.errorMessage = 'Failed to save organization to Firebase. Please verify database connection or log details.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}

