import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RegistrationService } from '../services/registration.service';
import { FirebaseService } from '../services/firebase.service';
import { AdminLayoutComponent } from './admin-layout.component';

interface Course {
  id: string;
  name: string;
  holes: number;
  par: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  url: string;
  logoPreview?: string | null;
  scorecardPreview?: string | null;
  branding?: {
    logoPreview?: string | null;
    scorecardPreview?: string | null;
    logoFileName?: string | null;
    scorecardFileName?: string | null;
  };
}

interface Tournament {
  id: string;
  name: string;
  date: string;
  players: number;
  tag: 'TOURNAMENT' | 'CLINIC' | 'CAMP';
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'ARCHIVED';
  playersJoinMode?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private registrationService = inject(RegistrationService);
  private firebaseService = inject(FirebaseService);
  public layout = inject(AdminLayoutComponent);

  copiedCourseId: string | null = null;
  selectedScorecardUrl: string | null = null;
  showQrModal = false;
  qrCodeUrl = '';
  qrCourseName = '';

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
    // Load dynamic organization details if available
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        
        // Load tournaments from organization if available
        if (org.tournaments && Array.isArray(org.tournaments) && org.tournaments.length > 0) {
          this.tournaments = org.tournaments;
        } else {
          org.tournaments = this.tournaments;
          localStorage.setItem('activeOrganization', JSON.stringify(org));
        }

        // Fetch tournaments from Firebase subcollection to be fresh
        const orgDocId = this.firebaseService.getOrgDocId();
        this.firebaseService.getTournaments(orgDocId).subscribe({
          next: (list) => {
            if (list) {
              this.tournaments = list;
              this.saveTournamentsToStorage();
              this.cdr.detectChanges();
            }
          }
        });
 
        // Fetch courses from Firebase subcollection to be fresh
        this.firebaseService.getCourses(orgDocId).subscribe({
          next: (list) => {
            if (list) {
              this.courses = list;
              this.cdr.detectChanges();
            }
          }
        });
 
        // Prefill courses list with the actual course configured during signup
        if (org.courseName) {
          const holesCount = org.course?.holesList?.length || 18;
          const parValue = org.course?.holesList 
            ? org.course.holesList.reduce((acc: number, h: any) => acc + (Number(h.par) || 4), 0) 
            : 72;
          const webUrl = org.websiteUrl || `golfscorepro.com/course/${org.urlSlug || 'oak-valley'}`;
 
          const primaryCourse: Course = {
            id: 'CRS-001',
            name: org.courseName,
            holes: holesCount,
            par: parValue,
            status: 'ACTIVE',
            url: webUrl,
            logoPreview: org.logoPreview || org.branding?.logoPreview || null,
            scorecardPreview: org.scorecardPreview || org.branding?.scorecardPreview || null
          };
 
          const additionalCourses: Course[] = (org.courses || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            holes: c.holes,
            par: c.par,
            status: c.status,
            url: c.url,
            logoPreview: c.logoPreview || c.branding?.logoPreview || null,
            scorecardPreview: c.scorecardPreview || c.branding?.scorecardPreview || null
          }));
          
          this.courses = [primaryCourse, ...additionalCourses];
        }
      }
    } catch (e) {
      console.error('Error loading active organization details on dashboard:', e);
    }
  }
 
  getFilteredCourses(): Course[] {
    return this.courses.filter(course => {
      const name = course.name || '';
      const id = course.id || '';
      const status = course.status || '';
      
      const matchesSearch = name.toLowerCase().includes((this.layout.searchQuery || '').toLowerCase()) ||
                            id.toLowerCase().includes((this.layout.searchQuery || '').toLowerCase());
      
      if (this.layout.showArchived) {
        return matchesSearch && status === 'ARCHIVED';
      } else {
        return matchesSearch && status !== 'ARCHIVED';
      }
    });
  }
 
  getFilteredTournaments(): Tournament[] {
    return this.tournaments.filter(trn => {
      const name = trn.name || '';
      const id = trn.id || '';
      const tag = trn.tag || '';
      const status = trn.status || '';
      
      const matchesSearch = name.toLowerCase().includes((this.layout.searchQuery || '').toLowerCase()) ||
                            id.toLowerCase().includes((this.layout.searchQuery || '').toLowerCase()) ||
                            tag.toLowerCase().includes((this.layout.searchQuery || '').toLowerCase()) ||
                            status.toLowerCase().includes((this.layout.searchQuery || '').toLowerCase());
      
      if (this.layout.showArchived) {
        return matchesSearch;
      } else {
        return matchesSearch && status !== 'ARCHIVED';
      }
    });
  }

  getLiveTournament(): Tournament | undefined {
    return this.tournaments.find((t: any) => t.isLive);
  }

  copyLink(course: Course) {
    const scorecardUrl = window.location.origin + '/admin-dashboard/scorecard/' + course.id;
    navigator.clipboard.writeText(scorecardUrl).then(() => {
      this.copiedCourseId = course.id;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copiedCourseId = null;
        this.cdr.detectChanges();
      }, 2000);
    });
  }

  showQrCode(course: Course) {
    const scorecardUrl = window.location.origin + '/admin-dashboard/scorecard/' + course.id;
    this.qrCourseName = course.name;
    this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(scorecardUrl)}`;
    this.showQrModal = true;
  }

  closeQrModal() {
    this.showQrModal = false;
    this.qrCodeUrl = '';
    this.qrCourseName = '';
  }

  addCourse() {
    this.registrationService.clear();
    localStorage.setItem('isAddCourseMode', 'true');
    this.router.navigate(['/organization-course']);
  }

  editCourse(course: Course) {
    this.registrationService.clear();
    localStorage.setItem('isAddCourseMode', 'true');
    localStorage.setItem('isEditCourseMode', 'true');
    localStorage.setItem('editCourseId', course.id);

    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        
        let courseDetails: any = null;
        if (course.id === 'CRS-001') {
          courseDetails = {
            name: org.courseName,
            teeBoxes: org.course?.teeBoxes || org.teeBoxes || [],
            holesList: org.course?.holesList || org.holesList || [],
            courseUrl: org.course?.courseUrl || org.courseUrl || '',
            branding: {
              logoFileName: org.logoFileName || org.branding?.logoFileName || null,
              logoPreview: org.logoPreview || org.branding?.logoPreview || null,
              bannerFileName: org.bannerFileName || org.branding?.bannerFileName || null,
              bannerPreview: org.bannerPreview || org.branding?.bannerPreview || null,
              scorecardFileName: org.scorecardFileName || org.branding?.scorecardFileName || null,
              scorecardPreview: org.scorecardPreview || org.branding?.scorecardPreview || null,
              websiteUrl: org.websiteUrl || org.branding?.websiteUrl || '',
              bookingUrl: org.bookingUrl || org.branding?.bookingUrl || '',
              selectedColor: org.selectedColor || org.branding?.selectedColor || '#0F3D2E'
            }
          };
        } else {
          const found = (org.courses || []).find((c: any) => c.id === course.id);
          if (found) {
            courseDetails = found;
          }
        }

        if (courseDetails) {
          this.registrationService.updateData({
            orgName: org.orgName || org.clubName || '',
            courseName: courseDetails.name || '',
            urlSlug: org.urlSlug || '',
            orgEmail: org.orgEmail || org.email || '',
            phone: org.phone || '',
            inviteCode: org.inviteCode || '',
            logoFileName: courseDetails.branding?.logoFileName || null,
            logoPreview: courseDetails.branding?.logoPreview || null,
            bannerFileName: courseDetails.branding?.bannerFileName || null,
            bannerPreview: courseDetails.branding?.bannerPreview || null,
            scorecardFileName: courseDetails.branding?.scorecardFileName || null,
            scorecardPreview: courseDetails.branding?.scorecardPreview || null,
            websiteUrl: courseDetails.branding?.websiteUrl || courseDetails.url || '',
            bookingUrl: courseDetails.branding?.bookingUrl || '',
            selectedColor: courseDetails.branding?.selectedColor || '#0F3D2E',
            teeBoxes: courseDetails.teeBoxes || [],
            holesList: courseDetails.holesList || [],
            courseUrl: courseDetails.courseUrl || ''
          });
        }
      }
    } catch (e) {
      console.error('Error prefilling course details for editing:', e);
    }

    this.router.navigate(['/organization-course']);
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

  createTournament() {
    this.router.navigate(['/admin-dashboard/create-event']);
  }

  editTournament(id: string) {
    this.router.navigate(['/admin-dashboard/create-event'], { queryParams: { edit: id } });
  }


  archiveTournament(id: string) {
    const trn = this.tournaments.find(t => t.id === id);
    if (trn) {
      const nextStatus = trn.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
      const orgDocId = this.firebaseService.getOrgDocId();
      this.firebaseService.updateTournament(orgDocId, id, { status: nextStatus }).subscribe({
        next: () => {
          trn.status = nextStatus;
          if (nextStatus === 'ACTIVE') {
            alert(`Tournament "${trn.name}" restored successfully.`);
          } else {
            alert(`Tournament "${trn.name}" archived successfully.`);
          }
          this.saveTournamentsToStorage();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to archive tournament in Firebase:', err);
          alert('Failed to archive tournament on server. Please try again.');
        }
      });
    }
  }

  deleteTournament(id: string) {
    const trn = this.tournaments.find(t => t.id === id);
    if (trn && confirm(`Are you sure you want to permanently delete "${trn.name}"?`)) {
      const orgDocId = this.firebaseService.getOrgDocId();
      this.firebaseService.deleteTournament(orgDocId, id).subscribe({
        next: () => {
          this.tournaments = this.tournaments.filter(t => t.id !== id);
          this.saveTournamentsToStorage();
          alert('Tournament deleted successfully.');
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to delete tournament in Firebase:', err);
          alert('Failed to delete tournament on server. Please try again.');
        }
      });
    }
  }

  showScorecard(course: Course) {
    const url = course.scorecardPreview || course.branding?.scorecardPreview || null;
    if (url) {
      this.selectedScorecardUrl = url;
    } else {
      alert('No scorecard image has been uploaded for this course.');
    }
  }
}
