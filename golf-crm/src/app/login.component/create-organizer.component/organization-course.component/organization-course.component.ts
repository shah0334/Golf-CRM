import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RegistrationService } from '../../../services/registration.service';

@Component({
  selector: 'app-organization-course',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './organization-course.component.html',
  styleUrl: './organization-course.component.css',
})
export class OrganizationCourseComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private registrationService = inject(RegistrationService);
  form!: FormGroup;
  isAddCourseMode = false;

  ngOnInit() {
    this.isAddCourseMode = localStorage.getItem('isAddCourseMode') === 'true';
    
    const data = this.registrationService.getData();

    const initialInvite = data.inviteCode || '';
    const initialOrgName = data.orgName || data.clubName || '';
    const initialEmail = data.orgEmail || data.email || '';
    const initialPhone = data.phone || '';
    let initialSlug = data.urlSlug || '';
    
    if (!initialSlug && initialOrgName) {
      initialSlug = initialOrgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    this.form = this.fb.group({
      orgName: [initialOrgName, [Validators.required]],
      courseName: [data.courseName || '', [Validators.required]],
      urlSlug: [initialSlug, []],
      email: [initialEmail, [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      phone: [initialPhone, [Validators.required, Validators.pattern('^[+]?[0-9\\s\\-\\(\\)]{7,20}$')]],
      inviteCode: [initialInvite, [Validators.required]]
    });

    this.form.get('orgName')?.valueChanges.subscribe(val => {
      if (val) {
        const slug = val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        this.form.get('urlSlug')?.setValue(slug, { emitEvent: false });
      } else {
        this.form.get('urlSlug')?.setValue('', { emitEvent: false });
      }
      this.form.get('urlSlug')?.markAsTouched();
    });

    this.form.get('urlSlug')?.valueChanges.subscribe(val => {
      if (val) {
        const sanitized = val
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '')
          .replace(/--+/g, '-'); // prevent double dashes
        if (val !== sanitized) {
          this.form.get('urlSlug')?.setValue(sanitized, { emitEvent: false });
        }
      }
    });
  }

  skipStep() {
    this.registrationService.updateData({ skippedStep3: true });
    this.router.navigate(['/assets-branding']);
  }

  onSubmit() {
    if (this.form.valid) {
      const formValue = this.form.getRawValue();
      this.registrationService.updateData({
        orgName: formValue.orgName,
        courseName: formValue.courseName,
        urlSlug: formValue.urlSlug,
        orgEmail: formValue.email,
        phone: formValue.phone,
        inviteCode: formValue.inviteCode,
        websiteUrl: formValue.urlSlug ? `https://${formValue.urlSlug}.golfscorepro.com` : '',
        skippedStep3: false // reset skipped flag if filled in
      });
      this.router.navigate(['/assets-branding']);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
