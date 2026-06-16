import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface Hole {
  holeNumber: number;
  par: number;
  handicap: number;
  yards: { [teeName: string]: number };
}

@Component({
  selector: 'app-finish',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './finish.component.html',
  styleUrl: './finish.component.css',
})
export class FinishComponent implements OnInit {
  private router = inject(Router);

  orgName = 'Oak Valley Golf Club';
  courseName = 'Oak Valley Championship Course';
  holesConfigured = '18 holes';
  brandingAssets = 'Skipped';
  scorecardImported = 'No';

  teeBoxNames = 'Black, Blue, White, Red';
  teeBoxes: string[] = ['Black', 'Blue', 'White', 'Red'];
  
  courseUrlAutoGenerate = true;
  courseUrl = '/course/oak-valley-championship-course';

  showHoleBuilderModal = false;
  
  holesList: Hole[] = [];

  ngOnInit() {
    // this.orgName = localStorage.getItem('orgName') || 'Oak Valley Golf Club';
    // this.courseName = localStorage.getItem('courseName') || 'Oak Valley Championship Course';
    // const logo = localStorage.getItem('logoUrl');
    // this.brandingAssets = logo ? 'Uploaded' : 'Skipped';
    // this.scorecardImported = logo ? 'Yes' : 'No'; 

    // this.onTeeBoxNamesChange(this.teeBoxNames);
    // this.generateUrlSlug();
    // this.initializeHoles();
  }

  onTeeBoxNamesChange(val: string) {
    // this.teeBoxes = val.split(',')
    //   .map(s => s.trim())
    //   .filter(s => s.length > 0);
  }

  onCourseUrlAutoGenerateChange(checked: boolean) {
    // this.courseUrlAutoGenerate = checked;
    // if (checked) {
    //   this.generateUrlSlug();
    // }
  }

  generateUrlSlug() {
    // if (this.courseUrlAutoGenerate && this.courseName) {
    //   const slug = this.courseName
    //     .toLowerCase()
    //     .replace(/[^a-z0-9]+/g, '-')
    //     .replace(/(^-|-$)/g, '');
    //   this.courseUrl = `/course/${slug}`;
    // }
  }

  onCourseUrlManualChange(val: string) {
    // if (!this.courseUrlAutoGenerate) {
    //   this.courseUrl = val;
    // }
  }

  initializeHoles() {
    // this.holesList = [];
    // for (let i = 1; i <= 18; i++) {
    //   const yardsMap: { [teeName: string]: number } = {};
    //   this.teeBoxes.forEach((tee, idx) => {
    //     const base = 450 - idx * 40;
    //     yardsMap[tee] = base + (i * 7) % 30;
    //   });

    //   this.holesList.push({
    //     holeNumber: i,
    //     par: i % 3 === 0 ? 3 : i % 5 === 0 ? 5 : 4,
    //     handicap: i,
    //     yards: yardsMap
    //   });
    // }
  }

  saveHoles() {
    // this.showHoleBuilderModal = false;
    // this.holesConfigured = '18 holes (Configured)';
  }

  finishSetup() {
    // this.router.navigate(['/']);
  }
}
