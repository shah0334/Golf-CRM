import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';

interface Player {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  handicap?: number | null;
  notes?: string;
  status: 'Registered' | 'Active';
}

interface TeamMember {
  name: string;
  handicap: number | null;
}

interface Team {
  id?: string;
  name: string;
  captain: string;
  captainEmail?: string;
  captainPassword?: string;
  status: 'Registered' | 'Checked In' | 'Active';
  hole?: string;
  teeBox?: string;
  players: TeamMember[];
}

@Component({
  selector: 'app-player.component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player.component.html',
  styleUrl: './player.component.css',
})
export class PlayerComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private firebaseService = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  // Tournament/Event Context
  tournaments: any[] = [
    {
      id: 'TRN-1042',
      name: 'Spring Member Open',
      date: 'Apr 18, 2026',
      players: 84,
      tag: 'TOURNAMENT',
      status: 'ACTIVE',
      playersJoinMode: 'Individual Sign-Up'
    },
    {
      id: 'TRN-1043',
      name: 'Junior Skills Clinic',
      date: 'May 04, 2026',
      players: 24,
      tag: 'CLINIC',
      status: 'UPCOMING',
      playersJoinMode: 'Group / Team Sign-Up'
    },
    {
      id: 'TRN-1044',
      name: 'Summer Pro Camp',
      date: 'Jun 10, 2026',
      players: 32,
      tag: 'CAMP',
      status: 'UPCOMING',
      playersJoinMode: 'Group / Team Sign-Up'
    },
    {
      id: 'TRN-1038',
      name: 'Winter Classic',
      date: 'Jan 22, 2026',
      players: 96,
      tag: 'TOURNAMENT',
      status: 'COMPLETED',
      playersJoinMode: 'Individual Sign-Up'
    }
  ];
  selectedTournamentId: string = '';
  activeOrgDocId: string = '';
  registrationType: 'Individual' | 'Team' = 'Individual';
  queryParams: any = {};
  isLoading: boolean = false;

  // --- INDIVIDUAL FORM FIELDS ---
  playerName: string = '';
  email: string = '';
  password: string = '';
  phone: string = '';
  handicap: number | null = null;
  notes: string = '';
  editingPlayer: Player | null = null;
  addedPlayers: Player[] = [];

  // --- TEAM FORM FIELDS ---
  teamName: string = '';
  captainName: string = '';
  captainEmail: string = '';
  captainPassword: string = '';
  teamStatus: 'Registered' | 'Checked In' | 'Active' = 'Registered';
  assignedHole: string = '';
  teeBoxOverride: string = '';
  teamPlayers: TeamMember[] = [
    { name: '', handicap: null }
  ];
  editingTeam: Team | null = null;
  addedTeams: Team[] = [];

  ngOnInit(): void {
    this.activeOrgDocId = this.firebaseService.getOrgDocId();

    // Subscribe to query parameters immediately
    this.route.queryParams.subscribe(params => {
      this.queryParams = params || {};
      const eventId = params['eventId'] || params['edit'] || '';
      if (eventId) {
        this.selectedTournamentId = eventId;
        this.onTournamentChange();
      }
    });

    // Load tournaments list from Firebase
    this.firebaseService.getTournaments(this.activeOrgDocId).subscribe({
      next: (list) => {
        const fetched = list || [];
        fetched.forEach(ft => {
          const idx = this.tournaments.findIndex(t => t.id === ft.id);
          if (idx !== -1) {
            // Merge properties to preserve static details like playersJoinMode if missing in fetched list
            this.tournaments[idx] = { ...this.tournaments[idx], ...ft };
          } else {
            this.tournaments.push(ft);
          }
        });
        
        // Re-evaluate with merged list
        if (this.selectedTournamentId) {
          this.onTournamentChange();
        } else if (this.tournaments.length > 0) {
          this.selectedTournamentId = this.tournaments[0].id;
          this.onTournamentChange();
        }
      },
      error: (err) => {
        console.error('Error loading tournaments:', err);
        // Safe fallback using static default tournaments
        if (this.selectedTournamentId) {
          this.onTournamentChange();
        }
      }
    });
  }

  onTournamentChange(): void {
    this.editingPlayer = null;
    this.editingTeam = null;
    this.resetIndividualForm();
    this.resetTeamForm();
    this.addedPlayers = [];
    this.addedTeams = [];

    const trn = this.tournaments.find(t => t.id === this.selectedTournamentId);
    
    // Read the query parameter directly from route params as highest priority
    const queryMode = (this.queryParams['playersJoinMode'] || '').toLowerCase();
    
    let mode = '';
    let tag = '';
    
    if (trn) {
      mode = (trn.playersJoinMode || '').toLowerCase();
      tag = (trn.tag || '').toUpperCase();
    }

    if (queryMode) {
      mode = queryMode;
    }

    if (mode.includes('individual') || mode.includes('single')) {
      this.registrationType = 'Individual';
      this.loadPlayers();
    } else if (
      mode.includes('team') || 
      mode.includes('group') || 
      tag === 'CLINIC' || 
      tag === 'CAMP' || 
      this.selectedTournamentId === 'TRN-1043' || 
      this.selectedTournamentId === 'TRN-1044'
    ) {
      this.registrationType = 'Team';
      this.loadTeams();
    } else {
      // Fallback based on typical defaults
      if (tag === 'CLINIC' || tag === 'CAMP') {
        this.registrationType = 'Team';
        this.loadTeams();
      } else {
        this.registrationType = 'Individual';
        this.loadPlayers();
      }
    }
  }

  // --- INDIVIDUAL METHODS ---
  loadPlayers(): void {
    this.isLoading = true;
    this.firebaseService.getPlayers(this.activeOrgDocId, this.selectedTournamentId).subscribe({
      next: (players) => {
        this.addedPlayers = players || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  savePlayer(): void {
    if (!this.playerName || !this.email) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    if (this.editingPlayer) {
      const updatedFields: Partial<Player> = {
        name: this.playerName,
        email: this.email,
        phone: this.phone,
        handicap: this.handicap,
        notes: this.notes,
      };
      if (this.password) {
        updatedFields.password = this.password;
      }

      this.firebaseService.updatePlayer(
        this.activeOrgDocId,
        this.selectedTournamentId,
        this.editingPlayer.id!,
        updatedFields
      ).subscribe({
        next: () => {
          this.loadPlayers();
          this.editingPlayer = null;
          this.resetIndividualForm();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      if (!this.password) {
        alert('Password is required for app access.');
        this.isLoading = false;
        return;
      }
      const newId = 'PLY-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const newPlayer: Player = {
        id: newId,
        name: this.playerName,
        email: this.email,
        phone: this.phone,
        password: this.password,
        handicap: this.handicap,
        notes: this.notes,
        status: 'Registered',
      };

      this.firebaseService.createPlayer(
        this.activeOrgDocId,
        this.selectedTournamentId,
        newPlayer
      ).subscribe({
        next: () => {
          this.loadPlayers();
          this.resetIndividualForm();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  editPlayer(p: Player): void {
    this.editingPlayer = p;
    this.playerName = p.name;
    this.email = p.email;
    this.phone = p.phone || '';
    this.handicap = p.handicap ?? null;
    this.notes = p.notes || '';
    this.password = p.password || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  removePlayer(p: Player): void {
    if (confirm(`Are you sure you want to remove "${p.name}"?`)) {
      this.isLoading = true;
      this.cdr.detectChanges();
      this.firebaseService.deletePlayer(this.activeOrgDocId, this.selectedTournamentId, p.id!).subscribe({
        next: () => {
          this.loadPlayers();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  resetIndividualForm(): void {
    this.playerName = '';
    this.email = '';
    this.password = '';
    this.phone = '';
    this.handicap = null;
    this.notes = '';
  }

  // --- TEAM METHODS ---
  loadTeams(): void {
    this.isLoading = true;
    this.firebaseService.getTeams(this.activeOrgDocId, this.selectedTournamentId).subscribe({
      next: (teams) => {
        this.addedTeams = teams || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  addTeamPlayerRow(): void {
    this.teamPlayers.push({ name: '', handicap: null });
  }

  removeTeamPlayerRow(index: number): void {
    if (this.teamPlayers.length > 1) {
      this.teamPlayers.splice(index, 1);
    } else {
      alert('A team must have at least 1 player.');
    }
  }

  saveTeam(): void {
    if (!this.teamName || !this.captainName) {
      alert('Team Name and Captain Name are required.');
      return;
    }

    const validPlayers = this.teamPlayers.filter(p => p.name.trim() !== '');
    if (validPlayers.length === 0) {
      alert('Please add at least one player name.');
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    if (this.editingTeam) {
      const updatedFields: Partial<Team> = {
        name: this.teamName,
        captain: this.captainName,
        captainEmail: this.captainEmail,
        captainPassword: this.captainPassword || undefined,
        status: this.teamStatus,
        hole: this.assignedHole || undefined,
        teeBox: this.teeBoxOverride || undefined,
        players: validPlayers
      };

      this.firebaseService.updateTeam(
        this.activeOrgDocId,
        this.selectedTournamentId,
        this.editingTeam.id!,
        updatedFields
      ).subscribe({
        next: () => {
          this.loadTeams();
          this.editingTeam = null;
          this.resetTeamForm();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      const newId = 'TEM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const newTeam: Team = {
        id: newId,
        name: this.teamName,
        captain: this.captainName,
        captainEmail: this.captainEmail,
        captainPassword: this.captainPassword,
        status: this.teamStatus,
        hole: this.assignedHole || undefined,
        teeBox: this.teeBoxOverride || undefined,
        players: validPlayers
      };

      this.firebaseService.createTeam(
        this.activeOrgDocId,
        this.selectedTournamentId,
        newTeam
      ).subscribe({
        next: () => {
          this.loadTeams();
          this.resetTeamForm();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  editTeam(t: Team): void {
    this.editingTeam = t;
    this.teamName = t.name;
    this.captainName = t.captain;
    this.captainEmail = t.captainEmail || '';
    this.captainPassword = t.captainPassword || '';
    this.teamStatus = t.status;
    this.assignedHole = t.hole || '';
    this.teeBoxOverride = t.teeBox || '';
    this.teamPlayers = t.players.map(p => ({ ...p }));
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  removeTeam(t: Team): void {
    if (confirm(`Are you sure you want to remove team "${t.name}"?`)) {
      this.isLoading = true;
      this.cdr.detectChanges();
      this.firebaseService.deleteTeam(this.activeOrgDocId, this.selectedTournamentId, t.id!).subscribe({
        next: () => {
          this.loadTeams();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  resetTeamForm(): void {
    this.teamName = '';
    this.captainName = '';
    this.captainEmail = '';
    this.captainPassword = '';
    this.teamStatus = 'Registered';
    this.assignedHole = '';
    this.teeBoxOverride = '';
    this.teamPlayers = [
      { name: '', handicap: null }
    ];
  }

  cancel(): void {
    if (this.editingPlayer) {
      this.editingPlayer = null;
      this.resetIndividualForm();
    } else if (this.editingTeam) {
      this.editingTeam = null;
      this.resetTeamForm();
    } else {
      this.router.navigate(['/admin-dashboard']);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin-dashboard']);
  }
}
