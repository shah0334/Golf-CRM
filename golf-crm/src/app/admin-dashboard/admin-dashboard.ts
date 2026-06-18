import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RegistrationService } from '../services/registration.service';
import { FirebaseService } from '../services/firebase.service';

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
  private cdr = inject(ChangeDetectorRef);
  private registrationService = inject(RegistrationService);
  private firebaseService = inject(FirebaseService);

  isSigningOut = false;

  orgName = 'Oak Valley Golf Club';
  userName = 'Tournament Admin';
  userInitials = 'OV';

  searchQuery = '';
  showArchived = false;
  isMobileMenuOpen = false;
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
    this.orgName = localStorage.getItem('orgName') || 'Oak Valley Golf Club';
    
    // Default user initials calculation
    const words = this.orgName.split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      this.userInitials = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1) {
      this.userInitials = words[0].substring(0, 2).toUpperCase();
    } else {
      this.userInitials = 'OV';
    }

    // Load dynamic organization details if available
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        
        this.orgName = org.orgName || org.clubName || this.orgName;
        
        // Recalculate initials for the loaded organization name
        const updatedWords = this.orgName.split(' ').filter(w => w.length > 0);
        if (updatedWords.length >= 2) {
          this.userInitials = (updatedWords[0][0] + updatedWords[1][0]).toUpperCase();
        } else if (updatedWords.length === 1) {
          this.userInitials = updatedWords[0].substring(0, 2).toUpperCase();
        }

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
    const scorecardUrl = window.location.origin + '/admin-dashboard/scorecard/' + course.id;
    navigator.clipboard.writeText(scorecardUrl).then(() => {
      this.copiedCourseId = course.id;
      setTimeout(() => {
        this.copiedCourseId = null;
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

  showScorecard(course: Course) {
    const url = course.scorecardPreview || course.branding?.scorecardPreview || null;
    if (url) {
      this.selectedScorecardUrl = url;
    } else {
      alert('No scorecard image has been uploaded for this course.');
    }
  }

  signOut() {
    this.isSigningOut = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      localStorage.clear();
      this.router.navigate(['/']);
    }, 800);
  }
}
