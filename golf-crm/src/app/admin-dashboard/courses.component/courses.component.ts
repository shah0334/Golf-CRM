import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RegistrationService } from '../../services/registration.service';
import { AdminLayoutComponent } from '../admin-layout.component';

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

@Component({
  selector: 'app-courses-component',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './courses.component.html',
  styleUrl: './courses.component.css',
})
export class CoursesComponent implements OnInit {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private registrationService = inject(RegistrationService);
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

  ngOnInit() {
    // Load dynamic organization details if available
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);

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
      console.error('Error loading active organization details on courses view:', e);
    }
  }

  getFilteredCourses(): Course[] {
    return this.courses.filter(course => {
      const matchesSearch = course.name.toLowerCase().includes(this.layout.searchQuery.toLowerCase()) ||
                            course.id.toLowerCase().includes(this.layout.searchQuery.toLowerCase()) ||
                            course.url.toLowerCase().includes(this.layout.searchQuery.toLowerCase());
      
      if (this.layout.showArchived) {
        return matchesSearch;
      } else {
        return matchesSearch && course.status !== 'ARCHIVED';
      }
    });
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

  saveCoursesToStorage() {
    try {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        const org = JSON.parse(activeOrgRaw);
        
        // Split courses into primary (CRS-001) and additional courses
        const primaryCourse = this.courses.find(c => c.id === 'CRS-001');
        if (primaryCourse) {
          org.courseName = primaryCourse.name;
          org.logoPreview = primaryCourse.logoPreview;
          org.scorecardPreview = primaryCourse.scorecardPreview;
        }
        
        const additionalCourses = this.courses.filter(c => c.id !== 'CRS-001').map(c => ({
          id: c.id,
          name: c.name,
          holes: c.holes,
          par: c.par,
          status: c.status,
          url: c.url,
          logoPreview: c.logoPreview,
          scorecardPreview: c.scorecardPreview
        }));
        org.courses = additionalCourses;
        
        localStorage.setItem('activeOrganization', JSON.stringify(org));
      }
    } catch (e) {
      console.error('Error saving updated courses list to storage:', e);
    }
  }

  archiveCourse(id: string) {
    const course = this.courses.find(c => c.id === id);
    if (course) {
      if (course.status === 'ARCHIVED') {
        course.status = 'ACTIVE';
        alert(`Course "${course.name}" restored successfully.`);
      } else {
        course.status = 'ARCHIVED';
        alert(`Course "${course.name}" archived successfully.`);
      }
      this.saveCoursesToStorage();
    }
  }

  deleteCourse(id: string) {
    if (confirm(`Are you sure you want to permanently delete "${this.courses.find(c => c.id === id)?.name}"?`)) {
      this.courses = this.courses.filter(c => c.id !== id);
      this.saveCoursesToStorage();
      alert('Course deleted successfully.');
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
