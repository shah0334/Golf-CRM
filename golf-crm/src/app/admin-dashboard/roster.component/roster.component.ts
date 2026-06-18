import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

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
export class RosterComponent {
  organizerAlertText = 'Cart path only on hole 7 — play as ground under repair.';
  alertLevel = 'Info';
  alertLevels = ['Info', 'Warning', 'Alert'];
  
  searchQuery = '';
  statusFilter = 'All Statuses';
  sortBy = 'Assignment Order';
  
  stats = {
    teams: 1,
    assigned: 1,
    nextOpenHole: '1B',
    uniquePlayers: 3
  };

  teams: Team[] = [
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
    }
  ];

  pairingMode = 'One Row Per Sign-Up (Default)';

  // Interaction handlers
  sendAlert() {
    if (this.organizerAlertText.trim()) {
      alert(`Organizer Alert Sent (${this.alertLevel}): "${this.organizerAlertText}"`);
    } else {
      alert('Please enter an alert message first.');
    }
  }

  clearAlert() {
    this.organizerAlertText = '';
  }

  refreshData() {
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
    alert('Opening Tournament Scorecard...');
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
    const letters = 'BCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextIndex = this.teams.length;
    const nextLetter = letters[nextIndex % letters.length];
    const newTeam: Team = {
      id: `TEAM-00${nextIndex + 1}`,
      name: `TEAM ${nextLetter}`,
      letter: nextLetter,
      hole: 'Unassigned',
      registeredDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updatedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      captain: 'player1',
      players: ['player1', 'player2'],
      scorecard: `SC - TEAM${nextLetter} - 00${nextIndex + 1}`,
      rosterName: `TEAM ${nextLetter} Roster`,
      assignmentStatus: 'Unassigned'
    };
    this.teams.push(newTeam);
    this.recalculateStats();
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
    alert(`Opening scorecard for Team ${team.name} (${team.scorecard})`);
  }

  copyTeamLink(team: Team) {
    navigator.clipboard.writeText(`https://golfscorepro.com/scorecard/${team.scorecard}`).then(() => {
      alert(`Copied link for Team ${team.name} to clipboard!`);
    });
  }

  editScorecard(team: Team) {
    alert(`Editing scorecard details for Team ${team.name}`);
  }

  editTeam(team: Team) {
    const newName = prompt(`Edit team name:`, team.name);
    if (newName) {
      team.name = newName.toUpperCase();
      team.letter = team.name.charAt(0);
      team.updatedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  changeHole(team: Team) {
    const newHole = prompt(`Enter starting hole for Team ${team.name} (e.g. 1B, 2A):`, team.hole);
    if (newHole) {
      team.hole = newHole.toUpperCase();
      team.assignmentStatus = 'Assigned';
      this.recalculateStats();
    }
  }

  cancelTeam(team: Team) {
    if (confirm(`Are you sure you want to remove Team ${team.name} from the roster?`)) {
      this.teams = this.teams.filter(t => t.id !== team.id);
      this.recalculateStats();
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
    this.stats.assigned = this.teams.filter(t => t.hole !== 'Unassigned').length;
    
    // Calculate total unique players
    const uniquePlayers = new Set<string>();
    this.teams.forEach(t => t.players.forEach(p => uniquePlayers.add(p)));
    this.stats.uniquePlayers = uniquePlayers.size;
  }

  getFilteredTeams(): Team[] {
    return this.teams.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            t.captain.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            t.players.some(p => p.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
                            t.hole.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      if (this.statusFilter === 'All Statuses') {
        return matchesSearch;
      } else if (this.statusFilter === 'Assigned') {
        return matchesSearch && t.hole !== 'Unassigned';
      } else {
        return matchesSearch && t.hole === 'Unassigned';
      }
    });
  }
}

