import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';

interface Team {
  id: string;
  name: string;
  letter: string;
  hole: string;
  registeredDate: string;
  updatedDate: string;
  captain: string;
  players: string[];
  scorecard: string;
  rosterName: string;
  assignmentStatus: string;
}

@Component({
  selector: 'app-roster.component',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './roster.component.html',
  styleUrl: './roster.component.css',
})
export class RosterComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private firebaseService = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);
  eventId: string = '';
  tournamentInfo: any = null;
  clubName: string = 'Classic Club';
  tournaments: any[] = [
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
    this.route.queryParams.subscribe(params => {
      this.eventId = params['eventId'] || '';
      this.loadRosterData();
    });
  }

  loadRosterData() {
    const orgDocId = this.firebaseService.getOrgDocId();
    const targetEventId = this.eventId || 'TRN-1042';

    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        this.clubName = org.clubName || org.orgName || 'Classic Club';
        if (org.tournaments && Array.isArray(org.tournaments)) {
          org.tournaments.forEach((ft: any) => {
            const idx = this.tournaments.findIndex(t => t.id === ft.id);
            if (idx !== -1) {
              this.tournaments[idx] = { ...this.tournaments[idx], ...ft };
            } else {
              this.tournaments.push(ft);
            }
          });
        }
      }
    } catch (e) {
      console.error('Error reading clubName from activeOrganization:', e);
    }

    // Set initial tournamentInfo synchronously
    const initialTrn = this.tournaments.find(t => t.id === targetEventId);
    if (initialTrn) {
      this.tournamentInfo = initialTrn;
      this.organizerAlertText = initialTrn.organizerAlertText || '';
      this.alertLevel = initialTrn.alertLevel || 'Info';
    }

    // Fetch Tournaments to find the matching one (async update)
    this.firebaseService.getTournaments(orgDocId).subscribe({
      next: (tournamentsList) => {
        const fetched = tournamentsList || [];
        // Merge fetched tournaments into our list
        fetched.forEach(ft => {
          const idx = this.tournaments.findIndex(t => t.id === ft.id);
          if (idx !== -1) {
            this.tournaments[idx] = { ...this.tournaments[idx], ...ft };
          } else {
            this.tournaments.push(ft);
          }
        });

        const currentTrn = this.tournaments.find(t => t.id === targetEventId);
        if (currentTrn) {
          this.tournamentInfo = currentTrn;
          this.organizerAlertText = currentTrn.organizerAlertText || '';
          this.alertLevel = currentTrn.alertLevel || 'Info';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching tournaments details:', err);
        // Fallback using current list
        const currentTrn = this.tournaments.find(t => t.id === targetEventId);
        if (currentTrn) {
          this.tournamentInfo = currentTrn;
          this.organizerAlertText = currentTrn.organizerAlertText || '';
          this.alertLevel = currentTrn.alertLevel || 'Info';
        }
        this.cdr.detectChanges();
      }
    });

    console.log('RosterComponent: targetEventId =', targetEventId);
    console.log('RosterComponent: orgDocId =', orgDocId);

    // Fetch Teams from Firebase
    this.firebaseService.getTeams(orgDocId, targetEventId).subscribe({
      next: (teamsList) => {
        console.log('RosterComponent: teamsList =', teamsList);
        // Fetch Players from Firebase
        this.firebaseService.getPlayers(orgDocId, targetEventId).subscribe({
          next: (playersList) => {
            console.log('RosterComponent: playersList =', playersList);
            const mappedTeams: Team[] = [];

            // 1. Add all registered teams
            if (teamsList && teamsList.length > 0) {
              teamsList.forEach(t => {
                mappedTeams.push({
                  id: t.id || `TEAM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                  name: (t.name || '').toUpperCase(),
                  letter: (t.name || 'T').charAt(0).toUpperCase(),
                  hole: t.hole || 'Unassigned',
                  registeredDate: 'Jun 23, 2026',
                  updatedDate: 'Jun 23, 2026',
                  captain: t.captain || '',
                  players: (t.players || []).map((p: any) => typeof p === 'string' ? p : (p.name || '')),
                  scorecard: t.scorecard || `SC - ${(t.name || '').toUpperCase()} - ${t.id || '001'}`,
                  rosterName: `${(t.name || '').toUpperCase()} Roster`,
                  assignmentStatus: t.hole && t.hole !== 'Unassigned' ? 'Assigned' : 'Unassigned'
                });
              });
            }

            // 2. Add players who aren't part of any team as individual entries if needed
            if (playersList && playersList.length > 0) {
              playersList.forEach(p => {
                // check if player is already represented in one of the teams
                const isAlreadyInTeam = mappedTeams.some(t => t.players.includes(p.name) || t.captain === p.name);
                if (!isAlreadyInTeam) {
                  mappedTeams.push({
                    id: p.id || `PLY-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                    name: (p.name || '').toUpperCase(),
                    letter: (p.name || 'P').charAt(0).toUpperCase(),
                    hole: 'Unassigned',
                    registeredDate: 'Jun 23, 2026',
                    updatedDate: 'Jun 23, 2026',
                    captain: p.name || '',
                    players: [p.name],
                    scorecard: `SC - ${(p.name || '').toUpperCase()} - ${p.id || '001'}`,
                    rosterName: `${(p.name || '').toUpperCase()} Roster`,
                    assignmentStatus: 'Unassigned'
                  });
                }
              });
            }

            // 3. Populate mock team data if database has no records and event is a mock event
            if (mappedTeams.length === 0 && targetEventId.startsWith('TRN-')) {
              if (targetEventId === 'TRN-1042') {
                mappedTeams.push(
                  {
                    id: 'TEAM-001',
                    name: 'ALPHA',
                    letter: 'A',
                    hole: '1A',
                    registeredDate: 'Apr 12, 2026',
                    updatedDate: 'Apr 16, 2026',
                    captain: 'alpha',
                    players: ['alpha', 'mike', 'smite'],
                    scorecard: 'SC - ALPHA - 001',
                    rosterName: 'ALPHA Roster',
                    assignmentStatus: 'Assigned'
                  },
                  {
                    id: 'TEAM-002',
                    name: 'BETA',
                    letter: 'B',
                    hole: '3B',
                    registeredDate: 'Apr 14, 2026',
                    updatedDate: 'Apr 14, 2026',
                    captain: 'beta',
                    players: ['beta', 'charlie', 'delta'],
                    scorecard: 'SC - BETA - 002',
                    rosterName: 'BETA Roster',
                    assignmentStatus: 'Assigned'
                  }
                );
              } else if (targetEventId === 'TRN-1043') {
                mappedTeams.push({
                  id: 'TEAM-003',
                  name: 'JUNIOR STARS',
                  letter: 'J',
                  hole: '1A',
                  registeredDate: 'May 01, 2026',
                  updatedDate: 'May 02, 2026',
                  captain: 'tommy',
                  players: ['tommy', 'billy', 'timmy'],
                  scorecard: 'SC - JUNIOR STARS - 003',
                  rosterName: 'JUNIOR STARS Roster',
                  assignmentStatus: 'Assigned'
                });
              } else if (targetEventId === 'TRN-1044') {
                mappedTeams.push({
                  id: 'TEAM-004',
                  name: 'SUMMER PROS',
                  letter: 'S',
                  hole: '1B',
                  registeredDate: 'Jun 05, 2026',
                  updatedDate: 'Jun 08, 2026',
                  captain: 'johnny',
                  players: ['johnny', 'jack', 'jeff'],
                  scorecard: 'SC - SUMMER PROS - 004',
                  rosterName: 'SUMMER PROS Roster',
                  assignmentStatus: 'Assigned'
                });
              } else {
                mappedTeams.push({
                  id: 'TEAM-001',
                  name: 'ALPHA',
                  letter: 'A',
                  hole: '1A',
                  registeredDate: 'Apr 12, 2026',
                  updatedDate: 'Apr 16, 2026',
                  captain: 'alpha',
                  players: ['alpha', 'mike', 'smite'],
                  scorecard: 'SC - ALPHA - 001',
                  rosterName: 'ALPHA Roster',
                  assignmentStatus: 'Assigned'
                });
              }
            }

            this.teams = mappedTeams;
            this.recalculateStats();
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error loading players for roster:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error loading teams for roster:', err);
      }
    });
  }

  organizerAlertText = 'Cart path only on hole 7 — play as ground under repair.';
  alertLevel = 'Info';
  alertLevels = ['Info', 'Warning', 'Alert'];
  
  searchQuery = '';
  statusFilter = 'All Statuses';
  sortBy = 'Assignment Order';
  
  stats = {
    teams: 0,
    assigned: 0,
    nextOpenHole: '1B',
    uniquePlayers: 0
  };

  teams: Team[] = [];

  pairingMode = 'One Row Per Sign-Up (Default)';

  // Interaction handlers
  sendAlert() {
    if (this.organizerAlertText.trim()) {
      const orgDocId = this.firebaseService.getOrgDocId();
      const targetEventId = this.eventId || 'TRN-1042';

      this.firebaseService.updateTournament(orgDocId, targetEventId, {
        organizerAlertText: this.organizerAlertText,
        alertLevel: this.alertLevel
      }).subscribe({
        next: () => {
          alert(`Organizer Alert Sent (${this.alertLevel}): "${this.organizerAlertText}"`);
        },
        error: (err) => {
          console.error(err);
          alert('Failed to send alert to database.');
        }
      });
    } else {
      alert('Please enter an alert message first.');
    }
  }

  clearAlert() {
    this.organizerAlertText = '';
    const orgDocId = this.firebaseService.getOrgDocId();
    const targetEventId = this.eventId || 'TRN-1042';

    this.firebaseService.updateTournament(orgDocId, targetEventId, {
      organizerAlertText: '',
      alertLevel: 'Info'
    }).subscribe({
      next: () => {
        alert('Alert cleared successfully.');
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  refreshData() {
    this.loadRosterData();
    alert('Roster refreshed successfully.');
  }

  copyRoster() {
    const rosterText = this.teams
      .map(t => `Team ${t.name} (Hole ${t.hole}): Captain ${t.captain}, Players: ${t.players.join(', ')}`)
      .join('\n');
    navigator.clipboard.writeText(rosterText).then(() => {
      alert('Roster copied to clipboard!');
    });
  }

  copyAlphaList() {
    const allPlayers: string[] = [];
    this.teams.forEach(t => allPlayers.push(...t.players));
    allPlayers.sort();
    navigator.clipboard.writeText(allPlayers.join('\n')).then(() => {
      alert('Alphabetical player list copied to clipboard!');
    });
  }

  viewRulesSheet() {
    alert('Displaying Rules Sheet builder...');
  }

  viewLiveLeaderboard() {
    alert('Opening Live Leaderboard...');
  }

  viewTournamentScorecard() {
    const id = this.eventId || 'TRN-1042';
    this.router.navigate(['/admin-dashboard/scorecard', id]);
  }

  autoAssignMissing() {
    let assignedCount = 0;
    this.teams.forEach(t => {
      if (!t.hole || t.hole === 'Unassigned') {
        t.hole = '1B';
        t.assignmentStatus = 'Assigned';
        assignedCount++;
      }
    });
    this.recalculateStats();
    alert(`Auto-assigned ${assignedCount} team(s) to starting holes.`);
  }

  createPairings() {
    alert('Creating pairings and tee times configurations...');
  }

  addTeam() {
    this.router.navigate(['/admin-dashboard/player'], {
      queryParams: {
        eventId: this.eventId || 'TRN-1042',
        playersJoinMode: 'Group / Team Sign-Up'
      }
    });
  }

  importSpreadsheet() {
    alert('Open spreadsheet import dialog...');
  }

  exportCSV() {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Team Name,Hole,Captain,Players\n"
      + this.teams.map(t => `"${t.name}","${t.hole}","${t.captain}","${t.players.join(', ')}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tournament_roster.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printPlacards() {
    alert('Preparing print layout for cart placards...');
  }

  copyPairings() {
    alert('Pairings links copied to clipboard!');
  }

  printPairings() {
    window.print();
  }

  sortByTeeTime() {
    alert('Sorting roster by Tee Time / Assignment Order...');
  }

  openScorecard(team: Team) {
    const scorecardUrl = `https://golfscorepro.com/scorecard/${team.scorecard}`;
    window.open(scorecardUrl, '_blank');
  }

  editScorecard(team: Team) {
    const id = this.eventId || 'TRN-1042';
    this.router.navigate(['/admin-dashboard/scorecard', id]);
  }

  editTeam(team: Team) {
    const isPlayer = team.id.startsWith('PLY-');
    this.router.navigate(['/admin-dashboard/player'], {
      queryParams: {
        eventId: this.eventId || 'TRN-1042',
        [isPlayer ? 'editPlayerId' : 'editTeamId']: team.id,
        playersJoinMode: isPlayer ? 'Individual Sign-Up' : 'Group / Team Sign-Up'
      }
    });
  }

  changeHole(team: Team) {
    const newHole = prompt(`Enter starting hole (e.g. 1B, 2A):`, team.hole);
    if (newHole) {
      const orgDocId = this.firebaseService.getOrgDocId();
      const targetEventId = this.eventId || 'TRN-1042';

      if (team.id.startsWith('TEM-')) {
        this.firebaseService.updateTeam(orgDocId, targetEventId, team.id, { hole: newHole.toUpperCase() }).subscribe({
          next: () => this.loadRosterData(),
          error: (err) => alert('Failed to update hole assignment in database.')
        });
      } else {
        // Fallback for mock data
        team.hole = newHole.toUpperCase();
        team.assignmentStatus = 'Assigned';
        this.recalculateStats();
      }
    }
  }

  cancelTeam(team: Team) {
    const typeLabel = team.id.startsWith('PLY-') ? 'player' : 'team';
    if (confirm(`Are you sure you want to remove this ${typeLabel} from the roster?`)) {
      const orgDocId = this.firebaseService.getOrgDocId();
      const targetEventId = this.eventId || 'TRN-1042';

      if (team.id.startsWith('TEM-')) {
        this.firebaseService.deleteTeam(orgDocId, targetEventId, team.id).subscribe({
          next: () => this.loadRosterData(),
          error: (err) => alert('Failed to delete team from database.')
        });
      } else if (team.id.startsWith('PLY-') && team.id !== 'TEAM-001') {
        this.firebaseService.deletePlayer(orgDocId, targetEventId, team.id).subscribe({
          next: () => this.loadRosterData(),
          error: (err) => alert('Failed to delete player from database.')
        });
      } else {
        // Fallback for mock data
        this.teams = this.teams.filter(t => t.id !== team.id);
        this.recalculateStats();
      }
    }
  }

  copyAllScorecardLinks() {
    const linksText = this.teams
      .map(t => `Team ${t.name}: https://golfscorepro.com/scorecard/${t.scorecard}`)
      .join('\n');
    navigator.clipboard.writeText(linksText).then(() => {
      alert('All team scorecard links copied to clipboard!');
    });
  }

  recalculateStats() {
    this.stats.teams = this.teams.length;
    this.stats.assigned = this.teams.filter(t => t.hole && t.hole !== 'Unassigned').length;
    
    // Calculate total unique players safely
    const uniquePlayers = new Set<string>();
    this.teams.forEach(t => {
      if (t.players && Array.isArray(t.players)) {
        t.players.forEach(p => {
          if (p) uniquePlayers.add(p);
        });
      }
    });
    this.stats.uniquePlayers = uniquePlayers.size;
  }

  getFilteredTeams(): Team[] {
    return this.teams.filter(t => {
      const name = t.name || '';
      const captain = t.captain || '';
      const hole = t.hole || '';
      const players = t.players || [];
      const query = this.searchQuery || '';

      const matchesSearch = name.toLowerCase().includes(query.toLowerCase()) ||
                            captain.toLowerCase().includes(query.toLowerCase()) ||
                            players.some(p => (p || '').toLowerCase().includes(query.toLowerCase())) ||
                            hole.toLowerCase().includes(query.toLowerCase());
      
      if (this.statusFilter === 'All Statuses') {
        return matchesSearch;
      } else if (this.statusFilter === 'Assigned') {
        return matchesSearch && hole !== 'Unassigned';
      } else {
        return matchesSearch && hole === 'Unassigned';
      }
    });
  }
}

