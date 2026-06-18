import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-stepper-layout',
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './stepper-layout.component.html',
  styleUrl: './stepper-layout.component.css',
})
export class StepperLayoutComponent implements OnInit {
  private router = inject(Router);
  currentStep = 3;
  isAddCourseMode = false;
  isEditCourseMode = false;

  ngOnInit() {
    this.updateStep();
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateStep();
    });
  }

  private updateStep() {
    this.isAddCourseMode = localStorage.getItem('isAddCourseMode') === 'true';
    this.isEditCourseMode = localStorage.getItem('isEditCourseMode') === 'true';
    
    const url = this.router.url;
    if (url.includes('organization-course')) {
      this.currentStep = 3;
    } else if (url.includes('assets-branding')) {
      this.currentStep = 4;
    } else if (url.includes('finish')) {
      this.currentStep = 5;
    }
  }
}
