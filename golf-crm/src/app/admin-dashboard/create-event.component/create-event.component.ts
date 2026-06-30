import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-create-event.component',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event.component.html',
  styleUrl: './create-event.component.css',
})
export class CreateEventComponent implements OnInit {
  router = inject(Router);
  route = inject(ActivatedRoute);
  firebaseService = inject(FirebaseService);
  cd = inject(ChangeDetectorRef);
  private toastService = inject(ToastService);

  currentStep = 1;
  totalSteps = 7;
  selectedEventType = '';
  isEditMode = false;
  editTournamentId = '';
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
  isStaff = false;

  ngOnInit() {
    this.isStaff = this.router.url.includes('/staff-dashboard');
    // Check if we are in edit mode (query param ?edit=TOURNAMENT_ID)
    this.route.queryParams.subscribe(params => {
      const editId = params['edit'];
      if (editId) {
        this.isEditMode = true;
        this.editTournamentId = editId;
        this.loadTournamentForEdit(editId);
      } else {
        // Only generate new IDs in create mode
        this.eventId = 'EVT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        this.adminToken = 'ADM-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      }
    });

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

  loadTournamentForEdit(tournamentId: string) {
    const orgDocId = this.firebaseService.getOrgDocId();
    this.firebaseService.getTournaments(orgDocId).subscribe({
      next: (list) => {
        const trn = list.find((t: any) => t.id === tournamentId);
        if (trn) {
          this.eventId = trn.id || '';
          this.adminToken = trn.adminToken || '';
          this.eventName = trn.name || '';
          this.selectedEventType = this.resolveEventType(trn.tag);
          this.eventCategory = trn.category || 'Tournament';
          this.instructorName = trn.instructorName || '';
          this.maxParticipants = trn.players || null;
          this.sessionSchedule = trn.sessionSchedule || '';
          this.campDuration = trn.campDuration || '';
          this.dailySchedule = trn.dailySchedule || '';
          this.venueInformation = trn.venueInformation || '';
          this.eventDescription = trn.eventDescription || '';
          this.scorecardAccessMode = trn.scorecardAccessMode || 'Public Registration';
          this.playersJoinMode = trn.playersJoinMode || 'Group / Team Sign-Up';
          this.organizerName = trn.organizerName || '';
          this.organizerEmail = trn.organizerEmail || '';
          this.selectedCourse = trn.selectedCourse || '— Choose a course —';
          this.eventDate = trn.eventDate || '';
          this.eventStatus = trn.status || 'Draft';
          this.scoringFormat = trn.scoringFormat || 'Stroke Play';
          this.handicapCalculation = trn.handicapCalculation || 'No Handicap';
          this.holesToPlay = trn.holesToPlay || '18 Holes';
          this.sponsors = trn.sponsors || [];
          this.cd.detectChanges();
        } else {
          this.toastService.showWarning('Tournament not found. Starting a fresh form.');
          this.isEditMode = false;
          this.eventId = 'EVT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          this.adminToken = 'ADM-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        }
      },
      error: () => {
        this.isEditMode = false;
        this.eventId = 'EVT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        this.adminToken = 'ADM-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      }
    });
  }

  private resolveEventType(tag: string): string {
    if (!tag) return 'general';
    const t = tag.toUpperCase();
    if (t === 'TOURNAMENT') return 'tournament';
    if (t === 'CLINIC') return 'clinic';
    if (t === 'CAMP') return 'camp';
    return 'general';
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.showSuccess('Copied to clipboard!');
    });
  }

  areRequiredFieldsComplete(): boolean {
    if (!this.eventName || this.eventName.trim() === '') return false;
    if (!this.selectedEventType || this.selectedEventType.trim() === '') return false;
    if (!this.playersJoinMode || this.playersJoinMode.trim() === '') return false;
    if (!this.organizerName || this.organizerName.trim() === '') return false;
    if (!this.organizerEmail || this.organizerEmail.trim() === '') return false;
    if (!this.eventDate || this.eventDate.trim() === '') return false;
    if (!this.eventStatus || this.eventStatus.trim() === '') return false;
    if (!this.scoringFormat || this.scoringFormat.trim() === '') return false;
    if (!this.handicapCalculation || this.handicapCalculation.trim() === '') return false;
    if (!this.holesToPlay || this.holesToPlay.trim() === '') return false;
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
    const payload = this.buildTournamentPayload('DRAFT');
    const orgDocId = this.firebaseService.getOrgDocId();

    const save$ = this.isEditMode
      ? this.firebaseService.updateTournament(orgDocId, this.eventId, payload)
      : this.firebaseService.createTournament(orgDocId, payload);

    save$.subscribe({
      next: () => {
        this.updateLocalCache(payload);
        this.toastService.showSuccess('Draft saved successfully! You can find it in your events list.');
      },
      error: (err) => {
        console.error('Failed to save draft:', err);
        this.toastService.showError('Failed to save draft. Please try again.');
      }
    });
  }

  createTournament() {
    const payload = this.buildTournamentPayload();
    const orgDocId = this.firebaseService.getOrgDocId();

    if (this.isEditMode) {
      // Edit mode: update existing tournament
      this.firebaseService.updateTournament(orgDocId, this.eventId, payload).subscribe({
        next: () => {
          this.updateLocalCache(payload);
          this.toastService.showSuccess('Tournament updated successfully!');
          const path = this.isStaff ? '/staff-dashboard' : '/admin-dashboard';
          this.router.navigate([path]);
        },
        error: (err) => {
          console.error('Failed to update tournament in Firebase:', err);
          this.toastService.showError('Failed to update tournament. Please try again.');
        }
      });
    } else {
      // Create mode: create new tournament
      this.firebaseService.createTournament(orgDocId, payload).subscribe({
        next: () => {
          this.updateLocalCache(payload);
          this.toastService.showSuccess('Tournament created successfully!');
          const path = this.isStaff ? '/staff-dashboard' : '/admin-dashboard';
          this.router.navigate([path]);
        },
        error: (err) => {
          console.error('Failed to create tournament in Firebase:', err);
          this.toastService.showError('Failed to save tournament to Firebase. Please try again.');
        }
      });
    }
  }

  private buildTournamentPayload(overrideStatus?: string): any {
    let tagVal: 'TOURNAMENT' | 'CLINIC' | 'CAMP' = 'TOURNAMENT';
    if (this.selectedEventType === 'clinic') tagVal = 'CLINIC';
    if (this.selectedEventType === 'camp') tagVal = 'CAMP';

    const parsedDate = new Date(this.eventDate + 'T00:00:00');
    let dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    if (!isNaN(parsedDate.getTime())) {
      dateStr = parsedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }

    const resolvedStatus = overrideStatus
      ? overrideStatus
      : (this.eventStatus ? (this.eventStatus.toLowerCase() === 'live' ? 'ACTIVE' : this.eventStatus.toUpperCase()) : 'ACTIVE');

    return {
      id: this.eventId,
      name: this.eventName || 'New Event',
      date: dateStr,
      eventDate: this.eventDate,
      players: this.maxParticipants || 0,
      tag: tagVal,
      status: resolvedStatus,
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
      updatedAt: new Date().toISOString(),
      ...(this.isEditMode ? {} : { createdAt: new Date().toISOString() })
    };
  }

  private updateLocalCache(payload: any) {
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        if (!org.tournaments) org.tournaments = [];
        const index = org.tournaments.findIndex((t: any) => t.id === this.eventId);
        const summary = {
          id: payload.id,
          name: payload.name,
          date: payload.date,
          players: payload.players,
          tag: payload.tag,
          status: payload.status,
          playersJoinMode: payload.playersJoinMode,
          sponsors: payload.sponsors
        };
        if (index !== -1) {
          org.tournaments[index] = { ...org.tournaments[index], ...summary };
        } else {
          org.tournaments.push(summary);
        }
        localStorage.setItem('activeOrganization', JSON.stringify(org));
      }
    } catch (e) {
      console.error('Error updating local cache:', e);
    }
  }

  loadExisting() {
    const id = prompt('Enter Event ID to load:');
    if (id) {
      const path = this.isStaff ? '/staff-dashboard/create-event' : '/admin-dashboard/create-event';
      this.router.navigate([path], { queryParams: { edit: id } });
    }
  }

  saveChanges() {
    const payload = this.buildTournamentPayload();
    const orgDocId = this.firebaseService.getOrgDocId();
    this.firebaseService.updateTournament(orgDocId, this.eventId, payload).subscribe({
      next: () => {
        this.updateLocalCache(payload);
        this.toastService.showSuccess('Changes saved successfully!');
      },
      error: (err) => {
        console.error('Failed to save changes in Firebase:', err);
        this.toastService.showError('Failed to save changes. Please try again.');
      }
    });
  }

  closeTournament() {
    if (confirm('Are you sure you want to close this tournament?')) {
      this.toastService.showSuccess('Tournament closed successfully!');
      const path = this.isStaff ? '/staff-dashboard' : '/admin-dashboard';
      this.router.navigate([path]);
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
      this.toastService.showError('Please enter a sponsor display name.');
      return;
    }
    const isDuplicate = this.sponsors.some(s => s.displayName.trim().toLowerCase() === this.sponsorDisplayName.trim().toLowerCase());
    if (isDuplicate) {
      this.toastService.showError(`Sponsor "${this.sponsorDisplayName}" has already been added.`);
      return;
    }
    this.sponsors.push({
      tier: this.sponsorTier,
      displayName: this.sponsorDisplayName,
      website: this.sponsorWebsite,
      logoUrl: this.sponsorLogoUrl
    });
    this.toastService.showSuccess(`Sponsor "${this.sponsorDisplayName}" added successfully!`);
    this.clearSponsorForm();
    this.autoSaveSponsors();
  }

  removeSponsor(index: number) {
    if (index >= 0 && index < this.sponsors.length) {
      const removed = this.sponsors[index].displayName;
      this.sponsors.splice(index, 1);
      this.toastService.showSuccess(`Sponsor "${removed}" removed successfully.`);
      this.autoSaveSponsors();
    }
  }

  autoSaveSponsors() {
    const payload = this.buildTournamentPayload(this.eventStatus || 'DRAFT');
    const orgDocId = this.firebaseService.getOrgDocId();
    this.firebaseService.getTournaments(orgDocId).subscribe({
      next: (list) => {
        const exists = (list || []).some((t: any) => t.id === this.eventId);
        if (exists) {
          this.firebaseService.updateTournament(orgDocId, this.eventId, payload).subscribe({
            next: () => {
              this.updateLocalCache(payload);
            }
          });
        } else {
          this.firebaseService.createTournament(orgDocId, payload).subscribe({
            next: () => {
              this.isEditMode = true;
              this.updateLocalCache(payload);
            }
          });
        }
      }
    });
  }
}
