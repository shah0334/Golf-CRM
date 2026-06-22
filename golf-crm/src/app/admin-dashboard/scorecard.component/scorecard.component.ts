import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import html2canvas from 'html2canvas-pro';
import { FirebaseService } from '../../services/firebase.service';

interface Player {
  name: string;
  avatar: string;
  outScores: (number | null)[];
  inScores: (number | null)[];
}

interface TeamData {
  teamName: string;
  captainName?: string;
  players: Player[];
}

@Component({
  selector: 'app-scorecard.component',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './scorecard.component.html',
  styleUrl: './scorecard.component.css',
})
export class ScorecardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private firebaseService = inject(FirebaseService);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-dropdown-container')) {
      this.isDropdownOpen = false;
    }
  }

  tournamentId = '';
  isTeamBased = false;
  tournamentName = 'Loading...';
  courseName = 'Loading...';
  totalHoles = 18;
  totalPar = 72;

  // Search and selector state
  searchQuery = '';
  selectedTeamName = '';
  isDropdownOpen = false;

  // Core scorecard static data
  holeNumbersOut = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  holeNumbersIn = [10, 11, 12, 13, 14, 15, 16, 17, 18];
  
  parsOut = [4, 5, 3, 4, 4, 5, 3, 4, 4]; // sum = 36
  parsIn = [4, 3, 5, 4, 4, 3, 5, 4, 4]; // sum = 36
  
  hcpsOut = [7, 1, 17, 11, 5, 2, 15, 13, 9];
  hcpsIn = [8, 18, 2, 12, 6, 16, 4, 14, 10];

  // Teams mock data
  teams: TeamData[] = [];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.tournamentId = params.get('id') || 'TRN-1042';
      this.loadTournamentDetails();
    });

    this.loadScoresFromStorage();
  }

  loadTournamentDetails() {
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        
        if (this.tournamentId.startsWith('CRS-')) {
          let targetCourseName = '';
          let targetPar = 72;
          
          if (this.tournamentId === 'CRS-001') {
            targetCourseName = org.courseName || 'Oak Valley Championship Course';
            targetPar = org.course?.holesList
              ? org.course.holesList.reduce((acc: number, h: any) => acc + (Number(h.par) || 4), 0)
              : 72;
          } else {
            const foundCourse = (org.courses || []).find((c: any) => c.id === this.tournamentId);
            if (foundCourse) {
              targetCourseName = foundCourse.name;
              targetPar = foundCourse.par || 72;
            }
          }
          
          this.courseName = targetCourseName || 'Oak Valley Championship Course';
          this.tournamentName = `${this.courseName} - Scorecard`;
          this.totalPar = targetPar;
          return;
        }

        const orgDocId = this.firebaseService.getOrgDocId();
        this.firebaseService.getTournaments(orgDocId).subscribe({
          next: (list) => {
            const found = (list || []).find((t: any) => t.id === this.tournamentId);
            if (found) {
              this.tournamentName = found.name;
              this.courseName = org.courseName || 'Oak Valley Championship Course';
              this.totalPar = org.course?.holesList
                ? org.course.holesList.reduce((acc: number, h: any) => acc + (Number(h.par) || 4), 0)
                : 72;
              
              const mode = (found.playersJoinMode || found.tag || '').toLowerCase();
              const tag = (found.tag || '').toUpperCase();
              this.isTeamBased = mode.includes('team') || mode.includes('group') || tag === 'CLINIC' || tag === 'CAMP' || this.tournamentId === 'TRN-1043' || this.tournamentId === 'TRN-1044';
              
              if (this.isTeamBased) {
                this.loadTeamsFromFirebase(orgDocId);
              } else {
                this.loadPlayersFromFirebase(orgDocId);
              }
            } else {
              // Fallback
              const fallbackTournaments = [
                { id: 'TRN-1042', name: 'Spring Member Open', course: 'Oak Valley Championship Course', joinMode: 'Individual Sign-Up' },
                { id: 'TRN-1043', name: 'Junior Skills Clinic', course: 'Pine Ridge Executive Course', joinMode: 'Group / Team Sign-Up' },
                { id: 'TRN-1044', name: 'Summer Pro Camp', course: 'Pine Ridge Executive Course', joinMode: 'Group / Team Sign-Up' },
                { id: 'TRN-1038', name: 'Winter Classic', course: 'Oak Valley Championship Course', joinMode: 'Individual Sign-Up' }
              ];
              const f = fallbackTournaments.find(t => t.id === this.tournamentId);
              if (f) {
                this.tournamentName = f.name;
                this.courseName = f.course;
                this.isTeamBased = f.joinMode.toLowerCase().includes('team') || f.joinMode.toLowerCase().includes('group');
              } else {
                this.isTeamBased = this.tournamentId === 'TRN-1043' || this.tournamentId === 'TRN-1044';
              }

              if (this.isTeamBased) {
                this.loadTeamsFromFirebase(orgDocId);
              } else {
                this.loadPlayersFromFirebase(orgDocId);
              }
            }
          },
          error: () => {
            this.isTeamBased = this.tournamentId === 'TRN-1043' || this.tournamentId === 'TRN-1044';
            if (this.isTeamBased) {
              this.loadTeamsFromFirebase(orgDocId);
            } else {
              this.loadPlayersFromFirebase(orgDocId);
            }
          }
        });
      }
    } catch (e) {
      console.error('Error loading tournament/course details:', e);
    }
  }

  loadTeamsFromFirebase(orgDocId: string) {
    this.firebaseService.getTeams(orgDocId, this.tournamentId).subscribe({
      next: (teamsList) => {
        if (teamsList && teamsList.length > 0) {
          this.teams = teamsList.map(t => {
            return {
              teamName: t.name || 'Unnamed Team',
              captainName: t.captain || 'No Captain',
              players: (t.players || []).map((p: any) => ({
                name: p.name || 'Unnamed Player',
                avatar: (p.name || 'P')[0].toUpperCase(),
                outScores: [null, null, null, null, null, null, null, null, null],
                inScores: [null, null, null, null, null, null, null, null, null]
              }))
            };
          });
          
          if (this.teams.length > 0) {
            this.selectedTeamName = this.teams[0].teamName;
          }
          this.loadScoresFromStorage();
          this.cdr.detectChanges();
        }
      }
    });
  }

  loadPlayersFromFirebase(orgDocId: string) {
    this.firebaseService.getPlayers(orgDocId, this.tournamentId).subscribe({
      next: (playersList) => {
        if (playersList && playersList.length > 0) {
          this.teams = playersList.map(p => {
            return {
              teamName: p.name || 'Unnamed Player',
              captainName: p.name || 'Unnamed Player',
              players: [{
                name: p.name || 'Unnamed Player',
                avatar: (p.name || 'P')[0].toUpperCase(),
                outScores: [null, null, null, null, null, null, null, null, null],
                inScores: [null, null, null, null, null, null, null, null, null]
              }]
            };
          });
          
          if (this.teams.length > 0) {
            this.selectedTeamName = this.teams[0].teamName;
          }
          this.loadScoresFromStorage();
          this.cdr.detectChanges();
        }
      }
    });
  }

  getFilteredTeams() {
    const query = (this.searchQuery || '').toLowerCase();
    if (!query) {
      return this.teams;
    }
    return this.teams.filter(t => {
      const teamNameMatch = (t.teamName || '').toLowerCase().includes(query);
      const captainMatch = (t.captainName || '').toLowerCase().includes(query);
      return teamNameMatch || captainMatch;
    });
  }

  getSelectedTeamCaptain(): string {
    const team = this.getSelectedTeam();
    return team ? (team.captainName || '') : '';
  }

  selectTeam(teamName: string) {
    this.selectedTeamName = teamName;
    this.isDropdownOpen = false;
    this.saveScoresToStorage();
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  getSelectedTeam(): TeamData {
    return this.teams.find(t => t.teamName === this.selectedTeamName) || this.teams[0] || { teamName: '', players: [] };
  }

  getOutTotal(player: Player): number {
    return player.outScores.reduce<number>((acc, score) => acc + (score || 0), 0);
  }

  getInTotal(player: Player): number {
    return player.inScores.reduce<number>((acc, score) => acc + (score || 0), 0);
  }

  getOutCompletedCount(player: Player): number {
    return player.outScores.filter(score => score !== null && score > 0).length;
  }

  getInCompletedCount(player: Player): number {
    return player.inScores.filter(score => score !== null && score > 0).length;
  }

  getOutTotalDisplay(player: Player): string {
    const completed = this.getOutCompletedCount(player);
    if (completed === 0) return '-';
    return String(this.getOutTotal(player));
  }

  getInTotalDisplay(player: Player): string {
    const completed = this.getInCompletedCount(player);
    if (completed === 0) return '-';
    return String(this.getInTotal(player));
  }

  getOverallTotal(player: Player): number {
    return this.getOutTotal(player) + this.getInTotal(player);
  }

  getOverallTotalDisplay(player: Player): string {
    const completed = this.getCompletedHolesCount(player);
    if (completed === 0) return '-';
    return String(this.getOverallTotal(player));
  }

  getCompletedHolesCount(player: Player): number {
    const outCount = this.getOutCompletedCount(player);
    const inCount = this.getInCompletedCount(player);
    return outCount + inCount;
  }

  getParDiff(player: Player): string {
    let playedScore = 0;
    let playedPar = 0;

    player.outScores.forEach((score, idx) => {
      if (score !== null && score > 0) {
        playedScore += score;
        playedPar += this.parsOut[idx];
      }
    });

    player.inScores.forEach((score, idx) => {
      if (score !== null && score > 0) {
        playedScore += score;
        playedPar += this.parsIn[idx];
      }
    });

    const diff = playedScore - playedPar;
    if (diff === 0) return 'E';
    return diff > 0 ? `+${diff}` : `${diff}`;
  }

  getParDiffClass(player: Player): string {
    const diffText = this.getParDiff(player);
    if (diffText === 'E') return 'text-[#5E806D]';
    return diffText.startsWith('+') ? 'text-[#DCAE5A]' : 'text-green-500';
  }

  getCurrentHole(): number {
    const team = this.getSelectedTeam();
    if (!team || !team.players || team.players.length === 0) return 1;
    for (let i = 0; i < 9; i++) {
      const allFilled = team.players.every(p => p.outScores[i] !== null && p.outScores[i]! > 0);
      if (!allFilled) {
        return i + 1;
      }
    }
    for (let i = 0; i < 9; i++) {
      const allFilled = team.players.every(p => p.inScores[i] !== null && p.inScores[i]! > 0);
      if (!allFilled) {
        return 10 + i;
      }
    }
    return 18;
  }

  getCompletedHoles(): number {
    const team = this.getSelectedTeam();
    if (!team || !team.players || team.players.length === 0) return 0;
    let completed = 0;
    for (let i = 0; i < 9; i++) {
      const allFilled = team.players.every(p => p.outScores[i] !== null && p.outScores[i]! > 0);
      if (allFilled) {
        completed++;
      }
    }
    for (let i = 0; i < 9; i++) {
      const allFilled = team.players.every(p => p.inScores[i] !== null && p.inScores[i]! > 0);
      if (allFilled) {
        completed++;
      }
    }
    return completed;
  }

  getRemainingHoles(): number {
    return 18 - this.getCompletedHoles();
  }

  getThroughValue(): string {
    return `${this.getCompletedHoles()}/18`;
  }

  onScoreInput(player: Player, holeIdx: number, event: Event, type: 'out' | 'in') {
    const input = event.target as HTMLInputElement;
    // Strip out all non-numeric characters immediately
    let val = input.value.replace(/[^0-9]/g, '');
    input.value = val;
    const scores = type === 'out' ? player.outScores : player.inScores;

    if (!val) {
      scores[holeIdx] = null;
    } else {
      const num = parseInt(val, 10);
      if (num >= 0 && num <= 15) { // allow 0
        scores[holeIdx] = num;
      } else {
        input.value = (scores[holeIdx] !== null && scores[holeIdx] !== undefined) ? String(scores[holeIdx]) : '';
      }
    }
    this.saveScoresToStorage();
    this.cdr.detectChanges();
  }

  saveScoresToStorage() {
    try {
      const key = `scorecard_scores_${this.tournamentId}`;
      const data = this.teams.map(t => ({
        teamName: t.teamName,
        scores: t.players.map(p => ({
          out: p.outScores,
          in: p.inScores
        }))
      }));
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving scores:', e);
    }
  }

  loadScoresFromStorage() {
    try {
      const key = `scorecard_scores_${this.tournamentId}`;
      const savedRaw = localStorage.getItem(key);
      if (savedRaw) {
        const savedData = JSON.parse(savedRaw);
        savedData.forEach((sTeam: any) => {
          const matchingTeam = this.teams.find(t => t.teamName === sTeam.teamName);
          if (matchingTeam) {
            matchingTeam.players.forEach((p, pIdx) => {
              const savedPlayer = sTeam.scores?.[pIdx];
              if (savedPlayer) {
                if (Array.isArray(savedPlayer)) {
                  // Old format: savedPlayer is an array of inScores
                  p.inScores = savedPlayer;
                } else {
                  // New format: savedPlayer is { out: ..., in: ... }
                  if (savedPlayer.out) p.outScores = savedPlayer.out;
                  if (savedPlayer.in) p.inScores = savedPlayer.in;
                }
              }
            });
          }
        });
      }
    } catch (e) {
      console.error('Error loading scores:', e);
    }
  }

  clearScores() {
    if (confirm('Are you sure you want to clear all scores and set them to 0?')) {
      const team = this.getSelectedTeam();
      team.players.forEach(p => {
        p.outScores = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        p.inScores = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      });
      this.saveScoresToStorage();
      alert('Scores cleared and set to 0 successfully.');
    }
  }

  finishRound() {
    const team = this.getSelectedTeam();
    const incompleteOut = team.players.some(p => p.outScores.some(s => s === null || s === undefined));
    const incompleteIn = team.players.some(p => p.inScores.some(s => s === null || s === undefined));
    
    if (incompleteOut || incompleteIn) {
      alert('Cannot finish the round yet. Some player scores are still missing for the scorecard holes.');
    } else {
      alert(`Round successfully completed for Team ${this.selectedTeamName}! All player scores have been finalized.`);
      this.router.navigate(['/admin-dashboard']);
    }
  }

  share() {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Scorecard share link copied to clipboard!');
    });
  }

  saveAsImage() {
    const element = document.getElementById('scorecard-container');
    if (!element) {
      alert('Scorecard element not found!');
      return;
    }

    const options = {
      backgroundColor: '#051B11', // Dark green matching the scorecard card bg
      scale: 2, // Capture at 2x resolution for clean text render
      useCORS: true,
      logging: false
    };

    // Handle ESM/CommonJS module interop
    const captureFn = (html2canvas as any).default || html2canvas;
    if (typeof captureFn !== 'function') {
      alert('Failed to save scorecard as image: html2canvas library is not loaded properly.');
      return;
    }

    captureFn(element, options).then((canvas: any) => {
      const link = document.createElement('a');
      link.download = `scorecard_team_${this.selectedTeamName.toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch((err: any) => {
      console.error('Error generating scorecard image:', err);
      alert('Failed to save scorecard as image. Details: ' + (err?.message || err));
    });
  }
}
