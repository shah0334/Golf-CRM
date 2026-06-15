import { Routes } from '@angular/router';
import { LoginComponent } from './login.component/login.component';
import { CreateOrganizerComponent } from './login.component/create-organizer.component/create-organizer.component';
import { OrganizationCourseComponent } from './login.component/create-organizer.component/organization-course.component/organization-course.component';
import { AssetsBrandingComponent } from './login.component/create-organizer.component/assets-branding.component/assets-branding.component';
import { FinishComponent } from './login.component/create-organizer.component/finish.component/finish.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'create-organizer', component: CreateOrganizerComponent },
  { path: 'organization-course', component: OrganizationCourseComponent },
  { path: 'assets-branding', component: AssetsBrandingComponent },
  { path: 'finish', component: FinishComponent }
];

