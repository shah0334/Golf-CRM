import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';

interface TeamLeaderboard {
  rank: number;
  name: string;
  playersInfo: string;
  netToPar: number; // For sorting/logic: under par is negative, even is 0, over par is positive
  netToParStr: string; // e.g. "-7", "E", "+2"
  thru: string; // "16", "completed", etc.
  updatedTime: string;
  scoresOut?: (number | null)[];
  scoresIn?: (number | null)[];
  parsOut?: number[];
  parsIn?: number[];
  totalScore?: number;
  totalPar?: number;
  outScore?: number;
  inScore?: number;
  outPar?: number;
  inPar?: number;
}

interface Sponsor {
  name: string;
  initials: string;
  tier: string;
}

interface SideGame {
  name: string;
  winner: string;
  result: string;
  hole: string;
}

@Component({
  selector: 'app-leaderboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.css',
})
export class LeaderboardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private firebaseService = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  activeTab: 'leaderboard' | 'sideGames' = 'leaderboard';
  isTVModeActive = false;
  isRefreshing = false;
  lastRefreshTime = '17:49';
  eventId = '';
  isTeamBased = false;
  selectedTeam: TeamLeaderboard | null = null;

  isLoading = true;

  tournamentInfo = {
    title: '',
    subtitle: '',
    format: '',
    totalPar: 72,
    isLive: false,
  };

  presentingSponsor: Sponsor = {
    name: 'Acme Roofing',
    initials: 'AR',
    tier: 'TOURNAMENT SPONSOR',
  };

  sponsors: Sponsor[] = [
    { name: 'Acme Roofing', initials: 'AR', tier: 'PRESENTING' },
    { name: 'Running Co.', initials: 'RC', tier: 'PLATINUM' },
    { name: 'Silver Star', initials: 'SS', tier: 'GOLD' },
    { name: 'Iron Brew Co.', initials: 'IB', tier: 'HOLE' },
    { name: 'Pinehurst Motors', initials: 'PM', tier: 'CART' },
  ];

  teams: TeamLeaderboard[] = [];

  sideGames: SideGame[] = [
    { name: 'Closest to the Pin', winner: 'M. Diaz (Fairway Kings)', result: '3 ft 2 in', hole: 'Hole 8' },
    { name: 'Longest Drive', winner: 'R. Cole (Fairway Kings)', result: '312 yards', hole: 'Hole 14' },
    { name: 'Skins Game - Skin 1', winner: 'Eagle Eyes', result: 'Eagle on Hole 4', hole: 'Hole 4' },
    { name: 'Skins Game - Skin 2', winner: 'Birdie Brigade', result: 'Birdie on Hole 12', hole: 'Hole 12' },
  ];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.eventId = params['eventId'] || '';
      
      const autoLive = params['autoLive'] === 'true';
      if (autoLive) {
        this.tournamentInfo.isLive = true;
        this.cdr.detectChanges();
        
        const orgDocId = this.firebaseService.getOrgDocId();
        const targetEventId = this.eventId || 'TRN-1042';
        
        this.firebaseService.getTournaments(orgDocId).subscribe({
          next: (tournamentsList) => {
            const updates: any[] = [];
            tournamentsList.forEach((t: any) => {
              if (t.id === targetEventId) {
                if (!t.isLive) {
                  updates.push(this.firebaseService.updateTournament(orgDocId, t.id, { isLive: true }));
                }
              } else {
                if (t.isLive) {
                  updates.push(this.firebaseService.updateTournament(orgDocId, t.id, { isLive: false }));
                }
              }
            });

            if (updates.length > 0) {
              let completed = 0;
              updates.forEach(obs => {
                obs.subscribe({
                  next: () => {
                    completed++;
                    if (completed === updates.length) {
                      this.loadLeaderboardData();
                    }
                  },
                  error: () => {
                    completed++;
                    if (completed === updates.length) {
                      this.loadLeaderboardData();
                    }
                  }
                });
              });
            } else {
              this.firebaseService.updateTournament(orgDocId, targetEventId, { isLive: true }).subscribe({
                next: () => {
                  this.loadLeaderboardData();
                }
              });
            }
          },
          error: () => {
            this.firebaseService.updateTournament(orgDocId, targetEventId, { isLive: true }).subscribe({
              next: () => {
                this.loadLeaderboardData();
              }
            });
          }
        });
      } else {
        this.loadLeaderboardData();
      }
    });
  }

  loadLeaderboardData() {
    const orgDocId = this.firebaseService.getOrgDocId();
    const targetEventId = this.eventId || 'TRN-1042';

    // Retrieve activeOrganization to get course pars
    let courseParsOut = [4, 5, 3, 4, 4, 5, 3, 4, 4];
    let courseParsIn = [4, 3, 5, 4, 4, 3, 5, 4, 4];
    let courseTotalPar = 72;
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        if (org.course?.holesList && org.course.holesList.length === 18) {
          const holes = org.course.holesList;
          courseParsOut = holes.slice(0, 9).map((h: any) => Number(h.par) || 4);
          courseParsIn = holes.slice(9, 18).map((h: any) => Number(h.par) || 4);
          courseTotalPar = holes.reduce((acc: number, h: any) => acc + (Number(h.par) || 4), 0);
        }
      }
    } catch (e) {
      console.error(e);
    }

    this.firebaseService.getTournaments(orgDocId).subscribe({
      next: (tournamentsList) => {
        const list = tournamentsList || [];
        let resolvedEventId = this.eventId;
        if (!resolvedEventId) {
          const liveTrn = list.find(t => t && (t.isLive || t.status === 'Live' || t.status === 'live'));
          resolvedEventId = liveTrn ? liveTrn.id : (list.length > 0 ? list[0].id : 'TRN-1042');
        }

        const currentTrn = list.find(t => t.id === resolvedEventId);
        if (currentTrn) {
          this.tournamentInfo.title = currentTrn.name || 'Tournament';
          this.tournamentInfo.subtitle = `${currentTrn.date || ''} • Round 1 of 1`;
          this.tournamentInfo.format = `FORMAT: ${currentTrn.tag || 'SCRAMBLE'} • ${currentTrn.playersJoinMode || 'NET'}`;
          this.tournamentInfo.totalPar = courseTotalPar;
          this.tournamentInfo.isLive = !!currentTrn.isLive;
          this.isTeamBased = !(currentTrn.playersJoinMode || '').toLowerCase().includes('individual') && !(currentTrn.playersJoinMode || '').toLowerCase().includes('single');
        }

        // Fetch Teams/Players
        this.firebaseService.getTeams(orgDocId, resolvedEventId).subscribe({
          next: (teamsList) => {
            this.firebaseService.getPlayers(orgDocId, resolvedEventId).subscribe({
              next: (playersList) => {
                // Read scores from localStorage
                let savedScores: any[] = [];
                try {
                  const key = `scorecard_scores_${resolvedEventId}`;
                  const savedRaw = localStorage.getItem(key);
                  if (savedRaw) {
                    savedScores = JSON.parse(savedRaw);
                  }
                } catch(e) {}

                // Merge teams and individual players into list of Leaderboard rows
                const leaderboardTeams: TeamLeaderboard[] = [];

                if (teamsList && teamsList.length > 0) {
                  teamsList.forEach(t => {
                    const sTeam = savedScores.find(st => st.teamName === t.name);
                    let netToPar = 0;
                    let thruStr = '0';
                    
                    let scoresOut: (number | null)[] = Array(9).fill(null);
                    let scoresIn: (number | null)[] = Array(9).fill(null);
                    let outScore = 0;
                    let inScore = 0;

                    if (sTeam?.scores?.[0]) {
                      const pScores = sTeam.scores[0];
                      let pScoreTotal = 0;
                      let pParTotal = 0;
                      let pThru = 0;
                      (pScores.out || []).forEach((score: any, idx: number) => {
                        if (idx < 9) {
                          scoresOut[idx] = score;
                          if (score !== null && score > 0) {
                            pScoreTotal += score;
                            pParTotal += courseParsOut[idx];
                            pThru++;
                            outScore += score;
                          }
                        }
                      });
                      (pScores.in || []).forEach((score: any, idx: number) => {
                        if (idx < 9) {
                          scoresIn[idx] = score;
                          if (score !== null && score > 0) {
                            pScoreTotal += score;
                            pParTotal += courseParsIn[idx];
                            pThru++;
                            inScore += score;
                          }
                        }
                      });
                      netToPar = pScoreTotal - pParTotal;
                      thruStr = pThru === 18 ? 'completed' : String(pThru);
                    }

                    const outPar = courseParsOut.reduce((acc, p) => acc + p, 0);
                    const inPar = courseParsIn.reduce((acc, p) => acc + p, 0);
                    const totalPar = outPar + inPar;
                    const totalScore = outScore + inScore;
                    const playersInfoStr = `${(t.players || []).map((p: any) => p.name).join(' • ') || t.captain} • Hole ${t.hole || 'Unassigned'}`;

                    leaderboardTeams.push({
                      rank: 1,
                      name: t.name || 'Unnamed Team',
                      playersInfo: playersInfoStr,
                      netToPar: netToPar,
                      netToParStr: netToPar === 0 ? 'E' : (netToPar > 0 ? `+${netToPar}` : `${netToPar}`),
                      thru: thruStr,
                      updatedTime: 'Just now',
                      scoresOut,
                      scoresIn,
                      parsOut: courseParsOut,
                      parsIn: courseParsIn,
                      totalScore,
                      totalPar,
                      outScore,
                      inScore,
                      outPar,
                      inPar
                    });
                  });
                }

                // Individual players
                if (playersList && playersList.length > 0) {
                  playersList.forEach(p => {
                    const isAlreadyInTeam = teamsList.some(t => (t.players || []).some((tp: any) => tp.name === p.name) || t.captain === p.name);
                    if (!isAlreadyInTeam) {
                      const sTeam = savedScores.find(st => st.teamName === p.name);
                      let netToPar = 0;
                      let thruStr = '0';
                      
                      let scoresOut: (number | null)[] = Array(9).fill(null);
                      let scoresIn: (number | null)[] = Array(9).fill(null);
                      let outScore = 0;
                      let inScore = 0;

                      if (sTeam?.scores?.[0]) {
                        const pScores = sTeam.scores[0];
                        let pScoreTotal = 0;
                        let pParTotal = 0;
                        let pThru = 0;
                        (pScores.out || []).forEach((score: any, idx: number) => {
                          if (idx < 9) {
                            scoresOut[idx] = score;
                            if (score !== null && score > 0) {
                              pScoreTotal += score;
                              pParTotal += courseParsOut[idx];
                              pThru++;
                              outScore += score;
                            }
                          }
                        });
                        (pScores.in || []).forEach((score: any, idx: number) => {
                          if (idx < 9) {
                            scoresIn[idx] = score;
                            if (score !== null && score > 0) {
                              pScoreTotal += score;
                              pParTotal += courseParsIn[idx];
                              pThru++;
                              inScore += score;
                            }
                          }
                        });
                        netToPar = pScoreTotal - pParTotal;
                        thruStr = pThru === 18 ? 'completed' : String(pThru);
                      }

                      const outPar = courseParsOut.reduce((acc, val) => acc + val, 0);
                      const inPar = courseParsIn.reduce((acc, val) => acc + val, 0);
                      const totalPar = outPar + inPar;
                      const totalScore = outScore + inScore;

                      leaderboardTeams.push({
                        rank: 1,
                        name: p.name || 'Unnamed Player',
                        playersInfo: `${p.name} • Net • Hole ${p.hole || 'Unassigned'}`,
                        netToPar: netToPar,
                        netToParStr: netToPar === 0 ? 'E' : (netToPar > 0 ? `+${netToPar}` : `${netToPar}`),
                        thru: thruStr,
                        updatedTime: 'Just now',
                        scoresOut,
                        scoresIn,
                        parsOut: courseParsOut,
                        parsIn: courseParsIn,
                        totalScore,
                        totalPar,
                        outScore,
                        inScore,
                        outPar,
                        inPar
                      });
                    }
                  });
                }

                if (leaderboardTeams.length > 0) {
                  // Sort by netToPar ascending
                  leaderboardTeams.sort((a, b) => a.netToPar - b.netToPar);

                  // Assign ranks (handle ties)
                  let currentRank = 1;
                  leaderboardTeams.forEach((t, index) => {
                    if (index > 0 && t.netToPar > leaderboardTeams[index - 1].netToPar) {
                      currentRank = index + 1;
                    }
                    t.rank = currentRank;
                  });

                  this.teams = leaderboardTeams;
                } else {
                  this.teams = [];
                }
                this.isLoading = false;
                this.cdr.detectChanges();
              },
              error: () => {
                this.isLoading = false;
                this.cdr.detectChanges();
              }
            });
          },
          error: () => {
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  refreshLeaderboard() {
    this.isRefreshing = true;
    this.loadLeaderboardData();
    setTimeout(() => {
      this.isRefreshing = false;
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      this.lastRefreshTime = `${hours}:${minutes}`;
      this.cdr.detectChanges();
      alert('Leaderboard data updated in real-time!');
    }, 500);
  }

  copyLeaderboardLink() {
    const pageUrl = window.location.href;
    navigator.clipboard.writeText(pageUrl).then(() => {
      alert('Leaderboard share link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link.');
    });
  }

  toggleTab(tab: 'leaderboard' | 'sideGames') {
    this.activeTab = tab;
  }

  toggleTVMode() {
    this.isTVModeActive = !this.isTVModeActive;
    if (this.isTVModeActive) {
      alert('TV Widescreen Presentation Mode Active. Press ESC or click "Close TV Mode" to exit.');
    }
  }

  openScorecard(team: TeamLeaderboard) {
    this.selectedTeam = team;
  }

  closeScorecard() {
    this.selectedTeam = null;
  }

  goLive() {
    const orgDocId = this.firebaseService.getOrgDocId();
    const targetEventId = this.eventId || 'TRN-1042';

    this.tournamentInfo.isLive = true;
    this.cdr.detectChanges();

    this.firebaseService.getTournaments(orgDocId).subscribe({
      next: (tournamentsList) => {
        const updates: any[] = [];
        tournamentsList.forEach((t: any) => {
          if (t.id === targetEventId) {
            if (!t.isLive) {
              updates.push(this.firebaseService.updateTournament(orgDocId, t.id, { isLive: true }));
            }
          } else {
            if (t.isLive) {
              updates.push(this.firebaseService.updateTournament(orgDocId, t.id, { isLive: false }));
            }
          }
        });

        if (updates.length > 0) {
          let completed = 0;
          updates.forEach(obs => {
            obs.subscribe({
              next: () => {
                completed++;
                if (completed === updates.length) {
                  this.tournamentInfo.isLive = true;
                  this.loadLeaderboardData();
                  alert('This leaderboard is now live! Previous live leaderboards have been deactivated.');
                }
              },
              error: () => {
                completed++;
                if (completed === updates.length) {
                  this.loadLeaderboardData();
                }
              }
            });
          });
        } else {
          this.firebaseService.updateTournament(orgDocId, targetEventId, { isLive: true }).subscribe({
            next: () => {
              this.tournamentInfo.isLive = true;
              this.loadLeaderboardData();
              alert('This leaderboard is now live!');
            }
          });
        }
      },
      error: () => {
        this.firebaseService.updateTournament(orgDocId, targetEventId, { isLive: true }).subscribe({
          next: () => {
            this.tournamentInfo.isLive = true;
            this.loadLeaderboardData();
            alert('This leaderboard is now live!');
          }
        });
      }
    });
  }
}
