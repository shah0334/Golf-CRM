import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminLayoutComponent } from '../admin-layout.component';

interface Tournament {
  id: string;
  name: string;
  date: string;
  players: number;
  tag: 'TOURNAMENT' | 'CLINIC' | 'CAMP';
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'ARCHIVED';
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css',
})
export class EventsComponent implements OnInit {
  public layout = inject(AdminLayoutComponent);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  selectedTag: 'ALL' | 'TOURNAMENT' | 'CLINIC' | 'CAMP' = 'ALL';

  tournaments: Tournament[] = [
    {
      id: 'TRN-1042',
      name: 'Spring Member Open',
      date: 'Apr 18, 2026',
      players: 84,
      tag: 'TOURNAMENT',
      status: 'ACTIVE',
    },
    {
      id: 'TRN-1043',
      name: 'Junior Skills Clinic',
      date: 'May 04, 2026',
      players: 24,
      tag: 'CLINIC',
      status: 'UPCOMING',
    },
    {
      id: 'TRN-1044',
      name: 'Summer Pro Camp',
      date: 'Jun 10, 2026',
      players: 32,
      tag: 'CAMP',
      status: 'UPCOMING',
    },
    {
      id: 'TRN-1038',
      name: 'Winter Classic',
      date: 'Jan 22, 2026',
      players: 96,
      tag: 'TOURNAMENT',
      status: 'COMPLETED',
    }
  ];

  ngOnInit() {
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        if (org.tournaments && Array.isArray(org.tournaments) && org.tournaments.length > 0) {
          this.tournaments = org.tournaments;
        } else {
          org.tournaments = this.tournaments;
          localStorage.setItem('activeOrganization', JSON.stringify(org));
        }
      }
    } catch (e) {
      console.error('Error loading tournaments list on events view:', e);
    }
  }

  saveTournamentsToStorage() {
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        org.tournaments = this.tournaments;
        localStorage.setItem('activeOrganization', JSON.stringify(org));
      }
    } catch (e) {
      console.error('Error saving updated tournaments list to storage:', e);
    }
  }

  getFilteredTournaments(): Tournament[] {
    return this.tournaments.filter(trn => {
      // 1. Filter by Search Query
      const matchesSearch = trn.name.toLowerCase().includes(this.layout.searchQuery.toLowerCase()) ||
                            trn.id.toLowerCase().includes(this.layout.searchQuery.toLowerCase()) ||
                            trn.tag.toLowerCase().includes(this.layout.searchQuery.toLowerCase()) ||
                            trn.status.toLowerCase().includes(this.layout.searchQuery.toLowerCase());
      
      // 2. Filter by Category tab selection
      const matchesTag = this.selectedTag === 'ALL' || trn.tag === this.selectedTag;

      // 3. Filter by Show Archived toggle in Layout
      if (this.layout.showArchived) {
        return matchesSearch && matchesTag;
      } else {
        return matchesSearch && matchesTag && trn.status !== 'ARCHIVED';
      }
    });
  }

  // Statistical Total Helpers (based on non-archived events)
  getNonArchivedTournaments(): Tournament[] {
    return this.tournaments.filter(t => t.status !== 'ARCHIVED');
  }

  getTotalEventsCount(): number {
    return this.getNonArchivedTournaments().length;
  }

  getActiveUpcomingCount(): number {
    return this.getNonArchivedTournaments().filter(t => t.status === 'ACTIVE' || t.status === 'UPCOMING').length;
  }

  getTotalPlayersRegistered(): number {
    return this.getNonArchivedTournaments().reduce((acc, t) => acc + (t.players || 0), 0);
  }

  getCompletedEventsCount(): number {
    return this.getNonArchivedTournaments().filter(t => t.status === 'COMPLETED').length;
  }

  // Card Operations
  createTournament() {
    this.router.navigate(['/admin-dashboard/create-event']);
  }

  archiveTournament(id: string) {
    const trn = this.tournaments.find(t => t.id === id);
    if (trn) {
      if (trn.status === 'ARCHIVED') {
        trn.status = 'ACTIVE';
        alert(`Tournament "${trn.name}" restored successfully.`);
      } else {
        trn.status = 'ARCHIVED';
        alert(`Tournament "${trn.name}" archived successfully.`);
      }
      this.saveTournamentsToStorage();
      this.cdr.detectChanges();
    }
  }

  deleteTournament(id: string) {
    const trn = this.tournaments.find(t => t.id === id);
    if (trn && confirm(`Are you sure you want to permanently delete "${trn.name}"?`)) {
      this.tournaments = this.tournaments.filter(t => t.id !== id);
      this.saveTournamentsToStorage();
      alert('Tournament deleted successfully.');
      this.cdr.detectChanges();
    }
  }
}
