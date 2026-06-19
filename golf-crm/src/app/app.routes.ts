import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { LoginComponent } from './login.component/login.component';
import { CreateOrganizerComponent } from './login.component/create-organizer.component/create-organizer.component';
import { StepperLayoutComponent } from './login.component/create-organizer.component/stepper-layout.component';
import { OrganizationCourseComponent } from './login.component/create-organizer.component/organization-course.component/organization-course.component';
import { AssetsBrandingComponent } from './login.component/create-organizer.component/assets-branding.component/assets-branding.component';
import { FinishComponent } from './login.component/create-organizer.component/finish.component/finish.component';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { RosterComponent } from './admin-dashboard/roster.component/roster.component';
import { ScorecardComponent } from './admin-dashboard/scorecard.component/scorecard.component';
import { CreateEventComponent } from './admin-dashboard/create-event.component/create-event.component';
import { LeaderboardComponent } from './admin-dashboard/leaderboard.component/leaderboard.component';
import { CoursesComponent } from './admin-dashboard/courses.component/courses.component';
import { EventsComponent } from './admin-dashboard/events.component/events.component';
import { AdminLayoutComponent } from './admin-dashboard/admin-layout.component';
import { RegistrationService } from './services/registration.service';

import { PlayerComponent } from './admin-dashboard/player.component/player.component';

const authGuard = () => {
  const router = inject(Router);
  const activeOrg = localStorage.getItem('activeOrganization');
  if (activeOrg) {
    return true;
  }
  router.navigate(['/']);
  return false;
};

const step3Guard = () => {
  const router = inject(Router);
  const regService = inject(RegistrationService);
  const data = regService.getData();
  if (localStorage.getItem('isAddCourseMode') === 'true') {
    return true;
  }
  if (data.clubName && data.email && data.password) {
    return true;
  }
  router.navigate(['/create-organizer']);
  return false;
};

const step4Guard = () => {
  const router = inject(Router);
  const regService = inject(RegistrationService);
  const data = regService.getData();
  if (localStorage.getItem('isAddCourseMode') === 'true') {
    return true;
  }
  const step3Complete = data.orgName && data.courseName && data.orgEmail && data.phone && data.inviteCode;
  if (step3Complete || data.skippedStep3) {
    return true;
  }
  router.navigate(['/organization-course']);
  return false;
};

const step5Guard = () => {
  const router = inject(Router);
  const regService = inject(RegistrationService);
  const data = regService.getData();
  if (localStorage.getItem('isAddCourseMode') === 'true') {
    return true;
  }
  const step3Complete = data.orgName && data.courseName && data.orgEmail && data.phone && data.inviteCode;
  if (step3Complete || data.skippedStep3) {
    return true;
  }
  router.navigate(['/organization-course']);
  return false;
};

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'create-organizer', component: CreateOrganizerComponent },
  {
    path: '',
    component: StepperLayoutComponent,
    children: [
      { path: 'organization-course', component: OrganizationCourseComponent, canActivate: [step3Guard] },
      { path: 'assets-branding', component: AssetsBrandingComponent, canActivate: [step4Guard] },
      { path: 'finish', component: FinishComponent, canActivate: [step5Guard] }
    ]
  },
  {
    path: 'admin-dashboard',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: AdminDashboard },
      { path: 'courses', component: CoursesComponent },
      { path: 'events', component: EventsComponent },
      { path: 'roster', component: RosterComponent },
      { path: 'create-event', component: CreateEventComponent },
      { path: 'leaderboard', component: LeaderboardComponent },

      { path: 'player', component: PlayerComponent }
    ]
  },
  { path: 'admin-dashboard/scorecard/:id', component: ScorecardComponent },

];


