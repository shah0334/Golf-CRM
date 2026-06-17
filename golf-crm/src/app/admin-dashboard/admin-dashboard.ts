import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface Course {
  id: string;
  name: string;
  holes: number;
  par: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  url: string;
}

interface Tournament {
  id: string;
  name: string;
  date: string;
  players: number;
  tag: 'TOURNAMENT' | 'CLINIC' | 'CAMP';
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private router = inject(Router);

  orgName = 'Oak Valley Golf Club';
  userName = 'Tournament Admin';
  userInitials = 'OV';

  searchQuery = '';
  showArchived = false;
  isMobileMenuOpen = false;
  copiedCourseId: string | null = null;

  courses: Course[] = [
    {
      id: 'CRS-001',
      name: 'Oak Valley Championship Course',
      holes: 18,
      par: 72,
      status: 'ACTIVE',
      url: 'golfscorepro.com/course/oak-valley-championship',
    },
    {
      id: 'CRS-002',
      name: 'Pine Ridge Executive Course',
      holes: 9,
      par: 36,
      status: 'DRAFT',
      url: 'golfscorepro.com/course/pine-ridge-executive',
    }
  ];

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
    this.orgName = localStorage.getItem('orgName') || 'Oak Valley Golf Club';
        const words = this.orgName.split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      this.userInitials = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1) {
      this.userInitials = words[0].substring(0, 2).toUpperCase();
    } else {
      this.userInitials = 'OV';
    }
  }

  getFilteredCourses(): Course[] {
    return this.courses.filter(course => {
      const matchesSearch = course.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            course.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      if (this.showArchived) {
        return matchesSearch && course.status === 'ARCHIVED';
      } else {
        return matchesSearch && course.status !== 'ARCHIVED';
      }
    });
  }

  getFilteredTournaments(): Tournament[] {
    return this.tournaments.filter(trn => {
      return trn.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
             trn.id.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
             trn.tag.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
             trn.status.toLowerCase().includes(this.searchQuery.toLowerCase());
    });
  }

  copyLink(course: Course) {
    navigator.clipboard.writeText(course.url).then(() => {
      this.copiedCourseId = course.id;
      setTimeout(() => {
        this.copiedCourseId = null;
      }, 2000);
    });
  }

  addCourse() {
    const nextId = `CRS-00${this.courses.length + 1}`;
    this.courses.push({
      id: nextId,
      name: `New Augusta Club Course`,
      holes: 18,
      par: 72,
      status: 'DRAFT',
      url: `golfscorepro.com/course/new-augusta-${this.courses.length + 1}`,
    });
  }

  createTournament() {
    const nextId = `TRN-${1045 + this.tournaments.length}`;
    this.tournaments.push({
      id: nextId,
      name: `Fall Invitational Cup`,
      date: 'Oct 12, 2026',
      players: 48,
      tag: 'TOURNAMENT',
      status: 'UPCOMING',
    });
  }

  archiveTournament(id: string) {
    alert(`Tournament ${id} archived successfully.`);
  }

  deleteTournament(id: string) {
    this.tournaments = this.tournaments.filter(t => t.id !== id);
  }

  signOut() {
    localStorage.clear();
    this.router.navigate(['/']);
  }
}
