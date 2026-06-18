import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface TeamLeaderboard {
  rank: number;
  name: string;
  playersInfo: string;
  netToPar: number; // For sorting/logic: under par is negative, even is 0, over par is positive
  netToParStr: string; // e.g. "-7", "E", "+2"
  thru: string; // "16", "completed", etc.
  updatedTime: string;
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
export class LeaderboardComponent {
  activeTab: 'leaderboard' | 'sideGames' = 'leaderboard';
  isTVModeActive = false;
  isRefreshing = false;
  lastRefreshTime = '17:49';

  tournamentInfo = {
    title: 'Back Nine Baymon Golf Course',
    subtitle: 'Saturday Scrambles • Round 1 of 1',
    format: 'FORMAT: SCRAMBLE • NET • SIDE GAMES',
    totalPar: 73,
    isLive: true,
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

  teams: TeamLeaderboard[] = [
    {
      rank: 1,
      name: 'Fairway Kings',
      playersInfo: 'M. Diaz • J. Tan • K. Park • R. Cole • Scramble • H1 • Scorer: M. Diaz',
      netToPar: -7,
      netToParStr: '-7',
      thru: '16',
      updatedTime: '4:53 PM',
    },
    {
      rank: 2,
      name: 'Bogey Busters',
      playersInfo: 'S. Reyes • L. Kim • A. Patel • N. Wu • Scramble • H1 • Scorer: S. Reyes',
      netToPar: -5,
      netToParStr: '-5',
      thru: 'completed',
      updatedTime: '4:51 PM',
    },
    {
      rank: 3,
      name: 'Eagle Eyes',
      playersInfo: 'T. Brooks • V. Singh • J. Ortega • H. Yu • Scramble • H1 • Scorer: T. Brooks',
      netToPar: -3,
      netToParStr: '-3',
      thru: '15',
      updatedTime: '4:49 PM',
    },
    {
      rank: 4,
      name: 'Putt Pirates',
      playersInfo: 'C. Adams • D. Liu • G. Khan • B. Cruz • Scramble • H1 • Scorer: C. Adams',
      netToPar: -2,
      netToParStr: '-2',
      thru: '14',
      updatedTime: '4:48 PM',
    },
    {
      rank: 5,
      name: 'Me',
      playersInfo: 'Me • Net • H1 • Scorer: Me',
      netToPar: 0,
      netToParStr: 'E',
      thru: '9',
      updatedTime: '4:53 PM',
    },
    {
      rank: 6,
      name: 'Sand Trappers',
      playersInfo: 'P. Owens • E. Vega • U. Park • Z. Beck • Scramble • H1 • Scorer: P. Owens',
      netToPar: 2,
      netToParStr: '+2',
      thru: '11',
      updatedTime: '4:45 PM',
    },
    {
      rank: 7,
      name: 'Birdie Brigade',
      playersInfo: 'F. Reyes • O. Cruz • Q. Lim • X. Tan • Scramble • H1 • Scorer: F. Reyes',
      netToPar: 4,
      netToParStr: '+4',
      thru: '13',
      updatedTime: '4:42 PM',
    },
    {
      rank: 8,
      name: 'Grip It & Sip It',
      playersInfo: 'W. Mora • L. Bell • Y. Cho • R. Sato • Scramble • H1 • Scorer: W. Mora',
      netToPar: 6,
      netToParStr: '+6',
      thru: '7',
      updatedTime: '4:38 PM',
    },
  ];

  sideGames: SideGame[] = [
    { name: 'Closest to the Pin', winner: 'M. Diaz (Fairway Kings)', result: '3 ft 2 in', hole: 'Hole 8' },
    { name: 'Longest Drive', winner: 'R. Cole (Fairway Kings)', result: '312 yards', hole: 'Hole 14' },
    { name: 'Skins Game - Skin 1', winner: 'Eagle Eyes', result: 'Eagle on Hole 4', hole: 'Hole 4' },
    { name: 'Skins Game - Skin 2', winner: 'Birdie Brigade', result: 'Birdie on Hole 12', hole: 'Hole 12' },
  ];

  refreshLeaderboard() {
    this.isRefreshing = true;
    setTimeout(() => {
      this.isRefreshing = false;
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      this.lastRefreshTime = `${hours}:${minutes}`;
      
      // Update a mock team score or updated time to simulate refresh action
      this.teams[0].updatedTime = `${now.getHours() % 12 || 12}:${minutes} PM`;
      
      alert('Leaderboard data updated in real-time!');
    }, 800);
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
      // Small alert notifying user of TV Mode behavior
      alert('TV Widescreen Presentation Mode Active. Press ESC or click "Close TV Mode" to exit.');
    }
  }

  openScorecard(team: TeamLeaderboard) {
    alert(`Opening live scorecard details for ${team.name}...`);
  }
}
