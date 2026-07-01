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
    
    let data = this.registrationService.getData();

    let activeOrg: any = null;
    if (this.isAddCourseMode) {
      const activeOrgRaw = localStorage.getItem('activeOrganization');
      if (activeOrgRaw) {
        try {
          activeOrg = JSON.parse(activeOrgRaw);
        } catch (e) {
          console.error('Error parsing active organization in ngOnInit:', e);
        }
      }
    }

    // If step 3 opens from a different email session, clear stale data
    const activeOrgEmail = (activeOrg?.orgEmail || activeOrg?.email || '').trim().toLowerCase();
    const storedEmail = (data.orgEmail || data.email || '').trim().toLowerCase();
    if (this.isAddCourseMode && activeOrgEmail && storedEmail && activeOrgEmail !== storedEmail) {
      this.registrationService.clear();
      data = {};
    }

    const isEditMode = localStorage.getItem('isEditCourseMode') === 'true';

    const initialInvite = (this.isAddCourseMode && activeOrg?.inviteCode) || data.inviteCode || '';
    const initialOrgName = (this.isAddCourseMode && (activeOrg?.orgName || activeOrg?.clubName)) || data.orgName || data.clubName || '';
    const initialEmail = (this.isAddCourseMode && !isEditMode) ? '' : (data.orgEmail || data.email || '');
    const initialPhone = (this.isAddCourseMode && !isEditMode) ? '' : (data.phone || '');
    let initialSlug = (this.isAddCourseMode && activeOrg?.urlSlug) || data.urlSlug || '';
    
    if (!initialSlug && initialOrgName) {
      initialSlug = initialOrgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const optionalPhoneValidator = (control: any) => {
      const val = control.value;
      if (val === null || val === undefined || val === '') {
        return null;
      }
      const regex = /^[+]?[0-9\s\-\(\)]{7,20}$/;
      return regex.test(val) ? null : { pattern: true };
    };

    this.form = this.fb.group({
      orgName: [initialOrgName, [Validators.required]],
      courseName: [data.courseName || '', [Validators.required]],
      urlSlug: [initialSlug, []],
      email: [initialEmail, [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      phone: [initialPhone, [optionalPhoneValidator]],
      inviteCode: [initialInvite, [Validators.required]]
    });

    if (this.isAddCourseMode) {
      this.form.get('orgName')?.disable();
      this.form.get('urlSlug')?.disable();
      this.form.get('inviteCode')?.disable();
    }

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

      // Check for duplicate course names under this organization
      if (this.isAddCourseMode) {
        let activeOrg: any = null;
        const activeOrgRaw = localStorage.getItem('activeOrganization');
        if (activeOrgRaw) {
          try {
            activeOrg = JSON.parse(activeOrgRaw);
          } catch (e) {
            console.error('Error parsing active organization in onSubmit:', e);
          }
        }
        
        if (activeOrg) {
          const isEditMode = localStorage.getItem('isEditCourseMode') === 'true';
          const editCourseId = localStorage.getItem('editCourseId');
          const newCourseName = formValue.courseName?.trim().toLowerCase();
          
          let isDuplicate = false;
          
          const primaryCourseName = (activeOrg.courseName || '').trim().toLowerCase();
          if (newCourseName === primaryCourseName) {
            if (!isEditMode || editCourseId !== 'CRS-001') {
              isDuplicate = true;
            }
          }
          
          if (!isDuplicate) {
            const otherCourses = activeOrg.courses || [];
            for (const c of otherCourses) {
              if ((c.name || '').trim().toLowerCase() === newCourseName) {
                if (!isEditMode || c.id !== editCourseId) {
                  isDuplicate = true;
                  break;
                }
              }
            }
          }
          
          if (isDuplicate) {
            this.form.get('courseName')?.setErrors({ duplicateCourse: true });
            this.form.markAllAsTouched();
            return;
          }
        }
      }

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
  onInviteCodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const cleanValue = input.value.replace(/[^0-9]/g, '');
    input.value = cleanValue;
    this.form.get('inviteCode')?.setValue(cleanValue, { emitEvent: false });
  }
}
