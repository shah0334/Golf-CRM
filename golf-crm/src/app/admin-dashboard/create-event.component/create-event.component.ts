import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-event.component',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event.component.html',
  styleUrl: './create-event.component.css',
})
export class CreateEventComponent implements OnInit {
  router = inject(Router);

  currentStep = 1;
  totalSteps = 7;
  selectedEventType = 'general';

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
  eventName = 'Oak Valley Open';
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
  organizerName = 'John Anderson';
  organizerEmail = 'john@oakvalley.com';

  // Form Fields for Step 4
  selectedCourse = 'Oak Valley Championship Course';
  eventDate = '2026-06-20';
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

  ngOnInit() {}

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
    alert('Tournament created successfully!');
    this.router.navigate(['/admin-dashboard']);
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
    alert(`Sponsor "${this.sponsorDisplayName}" added successfully!`);
    this.clearSponsorForm();
  }
}
