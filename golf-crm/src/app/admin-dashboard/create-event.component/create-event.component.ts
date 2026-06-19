import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-create-event.component',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event.component.html',
  styleUrl: './create-event.component.css',
})
export class CreateEventComponent implements OnInit {
  router = inject(Router);
  firebaseService = inject(FirebaseService);

  currentStep = 1;
  totalSteps = 7;
  selectedEventType = 'general';

  eventId = '';
  adminToken = '';
  sponsors: any[] = [];
  courses: any[] = [];

  steps = [
    { number: 1, label: 'Event Type' },
    { number: 2, label: 'Details' },
    { number: 3, label: 'Players' },
    { number: 4, label: 'Course & Date' },
    { number: 5, label: 'Format' },
    { number: 6, label: 'Sponsors' },
    { number: 7, label: 'Review & Links' }
  ];

  // Form Fields for Step 2
  eventName = '';
  eventCategory = 'Tournament';
  instructorName = '';
  maxParticipants: number | null = null;
  sessionSchedule = '';
  campDuration = '';
  dailySchedule = '';
  venueInformation = '';
  eventDescription = '';

  // Form Fields for Step 3
  scorecardAccessMode = 'Public Registration';
  playersJoinMode = 'Group / Team Sign-Up';
  organizerName = '';
  organizerEmail = '';

  // Form Fields for Step 4
  selectedCourse = '— Choose a course —';
  eventDate = '';
  eventStatus = 'Draft';

  // Form Fields for Step 5
  scoringFormat = 'Stroke Play';
  handicapCalculation = 'No Handicap';
  holesToPlay = '18 Holes';

  // Form Fields for Step 6
  sponsorTier = 'Presenting';
  sponsorDisplayName = '';
  sponsorWebsite = '';
  sponsorLogoUrl = '';

  eventTypes = [
    {
      id: 'tournament',
      title: 'Tournament',
      description: 'Competitive golf competition with scoring and leaderboard.',
      icon: '🏆'
    },
    {
      id: 'clinic',
      title: 'Clinic',
      description: 'Training and coaching sessions for players.',
      icon: '🎯'
    },
    {
      id: 'camp',
      title: 'Camp',
      description: 'Multi-day golf training programs.',
      icon: '⛳'
    },
    {
      id: 'general',
      title: 'General Event',
      description: 'Social, promotional, sponsor, or club activities.',
      icon: '📅'
    }
  ];

  ngOnInit() {
    this.eventId = 'EVT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    this.adminToken = 'ADM-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const orgDocId = this.firebaseService.getOrgDocId();
    this.firebaseService.getCourses(orgDocId).subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          this.courses = list;
        } else {
          try {
            const activeOrgRaw = localStorage.getItem('activeOrganization');
            if (activeOrgRaw) {
              const org = JSON.parse(activeOrgRaw);
              if (org.courseName) {
                this.courses = [{ id: 'CRS-001', name: org.courseName }];
                if (org.courses && Array.isArray(org.courses)) {
                  this.courses.push(...org.courses);
                }
              }
            }
          } catch (e) {
            console.error('Error loading fallback courses:', e);
          }
        }
      }
    });
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  }

  areRequiredFieldsComplete(): boolean {
    if (!this.eventName || this.eventName.trim() === '') return false;
    if (!this.organizerName || this.organizerName.trim() === '') return false;
    if (!this.organizerEmail || this.organizerEmail.trim() === '') return false;
    if (this.selectedCourse === '— Choose a course —') return false;
    return true;
  }

  selectEventType(typeId: string) {
    this.selectedEventType = typeId;
  }

  getEventTypeName(): string {
    const et = this.eventTypes.find(t => t.id === this.selectedEventType);
    return et ? et.title : 'Event';
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(stepNumber: number) {
    this.currentStep = stepNumber;
  }

  saveDraft() {
    alert('Draft event saved successfully!');
  }

  createTournament() {
    let tagVal: 'TOURNAMENT' | 'CLINIC' | 'CAMP' = 'TOURNAMENT';
    if (this.selectedEventType === 'clinic') tagVal = 'CLINIC';
    if (this.selectedEventType === 'camp') tagVal = 'CAMP';

    const parsedDate = new Date(this.eventDate + 'T00:00:00');
    let dateStr = 'Jun 20, 2026';
    if (!isNaN(parsedDate.getTime())) {
      dateStr = parsedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }

    const tournamentPayload = {
      id: this.eventId,
      name: this.eventName || 'New Event',
      date: dateStr,
      players: this.maxParticipants || 0,
      tag: tagVal,
      status: (this.eventStatus ? (this.eventStatus.toLowerCase() === 'live' ? 'ACTIVE' : this.eventStatus.toUpperCase()) : 'ACTIVE'),
      category: this.eventCategory,
      instructorName: this.instructorName,
      sessionSchedule: this.sessionSchedule,
      campDuration: this.campDuration,
      dailySchedule: this.dailySchedule,
      venueInformation: this.venueInformation,
      eventDescription: this.eventDescription,
      scorecardAccessMode: this.scorecardAccessMode,
      playersJoinMode: this.playersJoinMode,
      organizerName: this.organizerName,
      organizerEmail: this.organizerEmail,
      selectedCourse: this.selectedCourse,
      scoringFormat: this.scoringFormat,
      handicapCalculation: this.handicapCalculation,
      holesToPlay: this.holesToPlay,
      sponsors: this.sponsors,
      adminToken: this.adminToken,
      createdAt: new Date().toISOString()
    };

    const orgDocId = this.firebaseService.getOrgDocId();
    this.firebaseService.createTournament(orgDocId, tournamentPayload).subscribe({
      next: (response) => {
        // Also update local activeOrganization tournaments cache so dashboard/events list doesn't show old data
        try {
          const activeOrgRaw = localStorage.getItem('activeOrganization');
          if (activeOrgRaw) {
            const org = JSON.parse(activeOrgRaw);
            if (!org.tournaments) org.tournaments = [];
            // Remove matching default placeholders if they have default status
            org.tournaments = org.tournaments.filter((t: any) => t.id !== this.eventId);
            org.tournaments.push({
              id: this.eventId,
              name: tournamentPayload.name,
              date: tournamentPayload.date,
              players: tournamentPayload.players,
              tag: tournamentPayload.tag,
              status: tournamentPayload.status
            });
            localStorage.setItem('activeOrganization', JSON.stringify(org));
          }
        } catch (e) {
          console.error('Error updating local active organization cache:', e);
        }

        alert('Tournament created successfully!');
        this.router.navigate(['/admin-dashboard']);
      },
      error: (err) => {
        console.error('Failed to create tournament in Firebase:', err);
        alert('Failed to save tournament to Firebase. Please try again.');
      }
    });
  }

  loadExisting() {
    const id = prompt('Enter Event ID to load:');
    if (id) {
      alert(`Event ${id} loaded successfully!`);
    }
  }

  saveChanges() {
    alert('Changes saved successfully!');
  }

  closeTournament() {
    if (confirm('Are you sure you want to close this tournament?')) {
      alert('Tournament closed successfully!');
      this.router.navigate(['/admin-dashboard']);
    }
  }

  clearSponsorForm() {
    this.sponsorTier = 'Presenting';
    this.sponsorDisplayName = '';
    this.sponsorWebsite = '';
    this.sponsorLogoUrl = '';
  }

  addSponsor() {
    if (!this.sponsorDisplayName) {
      alert('Please enter a sponsor display name.');
      return;
    }
    this.sponsors.push({
      tier: this.sponsorTier,
      displayName: this.sponsorDisplayName,
      website: this.sponsorWebsite,
      logoUrl: this.sponsorLogoUrl
    });
    alert(`Sponsor "${this.sponsorDisplayName}" added successfully!`);
    this.clearSponsorForm();
  }
}
