import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { FirebaseService } from '../../services/firebase.service';
import { LoaderComponent } from '../../components/loader.component';
import { ToastService } from '../../services/toast.service';

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
  players?: any[];
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
  imports: [CommonModule, RouterLink, LoaderComponent],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.css',
})
export class LeaderboardComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private firebaseService = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);
  private toastService = inject(ToastService);
  private pollSubscription?: Subscription;

  activeTab: 'leaderboard' | 'sideGames' = 'leaderboard';
  isTVModeActive = false;
  isRefreshing = false;
  lastRefreshTime = '17:49';
  eventId = '';
  isTeamBased = false;
  selectedTeam: TeamLeaderboard | null = null;
  isStaff = false;

  isLoading = true;

  @HostListener('window:storage', ['$event'])
  onStorageChange(event: StorageEvent) {
    if (event.key && event.key.startsWith('scorecard_scores_')) {
      this.loadLeaderboardData(false);
    }
  }

  tournamentInfo = {
    title: '',
    subtitle: '',
    format: '',
    totalPar: 72,
    isLive: false,
  };

  presentingSponsor: Sponsor = {
    name: '',
    initials: '',
    tier: '',
  };

  sponsors: Sponsor[] = [];

  teams: TeamLeaderboard[] = [];

  sideGames: SideGame[] = [
    { name: 'Closest to the Pin', winner: 'M. Diaz (Fairway Kings)', result: '3 ft 2 in', hole: 'Hole 8' },
    { name: 'Longest Drive', winner: 'R. Cole (Fairway Kings)', result: '312 yards', hole: 'Hole 14' },
    { name: 'Skins Game - Skin 1', winner: 'Eagle Eyes', result: 'Eagle on Hole 4', hole: 'Hole 4' },
    { name: 'Skins Game - Skin 2', winner: 'Birdie Brigade', result: 'Birdie on Hole 12', hole: 'Hole 12' },
  ];

  ngOnInit() {
    this.isStaff = this.router.url.includes('/staff-dashboard');
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

    this.firebaseService.scorecardUpdated$.subscribe((updatedTournamentId) => {
      const resolvedEventId = this.eventId || 'TRN-1042';
      if (updatedTournamentId === resolvedEventId) {
        this.loadLeaderboardData(false);
      }
    });

    this.pollSubscription = interval(3000).subscribe(() => {
      this.loadLeaderboardData(false);
    });
  }

  ngOnDestroy() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  loadLeaderboardData(forceSyncWithDb: boolean = true) {
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

          if (currentTrn.sponsors && Array.isArray(currentTrn.sponsors)) {
            this.sponsors = currentTrn.sponsors.map((sp: any) => {
              const displayName = sp.displayName || sp.name || 'Unnamed Sponsor';
              const words = displayName.split(' ').filter((w: string) => w.length > 0);
              const initials = words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : displayName.substring(0, 2).toUpperCase();
              return {
                name: displayName,
                initials: initials,
                tier: sp.tier || 'SPONSOR',
                logoUrl: sp.logoUrl || null,
                website: sp.website || null
              };
            });
            const pres = this.sponsors.find(s => s.tier?.toUpperCase() === 'PRESENTING' || s.tier?.toUpperCase() === 'TOURNAMENT SPONSOR' || s.tier?.toUpperCase() === 'TITLE');
            if (pres) {
              this.presentingSponsor = pres;
            } else if (this.sponsors.length > 0) {
              this.presentingSponsor = this.sponsors[0];
            } else {
              this.presentingSponsor = { name: '', initials: '', tier: '' };
            }
          } else {
            this.sponsors = [];
            this.presentingSponsor = { name: '', initials: '', tier: '' };
          }
        }

        // Fetch Teams/Players
        this.firebaseService.getTeams(orgDocId, resolvedEventId).subscribe({
          next: (teamsList) => {
            this.firebaseService.getPlayers(orgDocId, resolvedEventId).subscribe({
              next: (playersList) => {
                // Read scores from tournament data or localStorage
                let savedScores: any[] = [];
                const scoreKey = `scorecard_scores_${resolvedEventId}`;
                
                if (forceSyncWithDb && currentTrn && currentTrn.scorecardScores) {
                  savedScores = currentTrn.scorecardScores;
                  try {
                    localStorage.setItem(scoreKey, JSON.stringify(savedScores));
                  } catch(e) {}
                } else {
                  try {
                    const savedRaw = localStorage.getItem(scoreKey);
                    if (savedRaw) {
                      savedScores = JSON.parse(savedRaw);
                    }
                  } catch(e) {}
                  
                  if ((!savedScores || savedScores.length === 0) && currentTrn && currentTrn.scorecardScores) {
                    savedScores = currentTrn.scorecardScores;
                    try {
                      localStorage.setItem(scoreKey, JSON.stringify(savedScores));
                    } catch(e) {}
                  }
                }

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

                    // Build list of players with their individual scores
                    const teamPlayers = (t.players || []).map((p: any, pIdx: number) => {
                      let pScoresOut: (number | null)[] = Array(9).fill(null);
                      let pScoresIn: (number | null)[] = Array(9).fill(null);
                      let pOutScore = 0;
                      let pInScore = 0;
                      let pScoreTotal = 0;
                      let pParTotal = 0;

                      const pScores = sTeam?.scores?.[pIdx];
                      if (pScores) {
                        (pScores.out || []).forEach((score: any, idx: number) => {
                          if (idx < 9) {
                            pScoresOut[idx] = score;
                            if (score !== null && score > 0) {
                              pScoreTotal += score;
                              pParTotal += courseParsOut[idx];
                              pOutScore += score;
                            }
                          }
                        });
                        (pScores.in || []).forEach((score: any, idx: number) => {
                          if (idx < 9) {
                            pScoresIn[idx] = score;
                            if (score !== null && score > 0) {
                              pScoreTotal += score;
                              pParTotal += courseParsIn[idx];
                              pInScore += score;
                            }
                          }
                        });
                      }

                      const pNetToPar = pScoreTotal - pParTotal;
                      return {
                        name: p.name || 'Unnamed Player',
                        scoresOut: pScoresOut,
                        scoresIn: pScoresIn,
                        outScore: pOutScore,
                        inScore: pInScore,
                        totalScore: pOutScore + pInScore,
                        netToPar: pNetToPar,
                        netToParStr: pNetToPar === 0 ? 'E' : (pNetToPar > 0 ? `+${pNetToPar}` : `${pNetToPar}`)
                      };
                    });

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
                      inPar,
                      players: teamPlayers
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

                      const pPlayer = {
                        name: p.name || 'Unnamed Player',
                        scoresOut,
                        scoresIn,
                        outScore,
                        inScore,
                        totalScore,
                        netToPar,
                        netToParStr: netToPar === 0 ? 'E' : (netToPar > 0 ? `+${netToPar}` : `${netToPar}`)
                      };

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
                        inPar,
                        players: [pPlayer]
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
                  
                  if (this.selectedTeam) {
                    const updatedSelected = this.teams.find(t => t.name === this.selectedTeam?.name);
                    if (updatedSelected) {
                      this.selectedTeam = updatedSelected;
                    }
                  }
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
      this.toastService.showSuccess('Leaderboard data updated in real-time!');
    }, 500);
  }

  copyLeaderboardLink() {
    const pageUrl = window.location.href;
    navigator.clipboard.writeText(pageUrl).then(() => {
      this.toastService.showSuccess('Leaderboard share link copied to clipboard!');
    }).catch(() => {
      this.toastService.showError('Failed to copy link.');
    });
  }

  toggleTab(tab: 'leaderboard' | 'sideGames') {
    this.activeTab = tab;
  }

  toggleTVMode() {
    this.isTVModeActive = !this.isTVModeActive;
    if (this.isTVModeActive) {
      this.toastService.showInfo('TV Widescreen Presentation Mode Active. Press ESC or click "Close TV Mode" to exit.');
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
                  this.toastService.showSuccess('This leaderboard is now live! Previous live leaderboards have been deactivated.');
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
              this.toastService.showSuccess('This leaderboard is now live!');
            }
          });
        }
      },
      error: () => {
        this.firebaseService.updateTournament(orgDocId, targetEventId, { isLive: true }).subscribe({
          next: () => {
            this.tournamentInfo.isLive = true;
            this.loadLeaderboardData();
            this.toastService.showSuccess('This leaderboard is now live!');
          }
        });
      }
    });
  }
}
