import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-organization-course',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './organization-course.component.html',
  styleUrl: './organization-course.component.css',
})
export class OrganizationCourseComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  form!: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      orgName: ['', [Validators.required]],
      courseName: ['', [Validators.required]],
      urlSlug: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[+]?[0-9\\s\\-\\(\\)]{7,20}$')]],
      inviteCode: ['', [Validators.required]]
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
  }

  regenerateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.form.get('inviteCode')?.setValue(code);
  }

  onSubmit() {
    // if (this.form.valid) {
    //   localStorage.setItem('orgName', this.form.get('orgName')?.value || '');
    //   localStorage.setItem('courseName', this.form.get('courseName')?.value || '');
    //   localStorage.setItem('websiteUrl', this.form.get('urlSlug')?.value ? `https://${this.form.get('urlSlug')?.value}.golfscorepro.com` : '');
    //   this.router.navigate(['/assets-branding']);
    // } else {
    //   this.form.markAllAsTouched();
    // }
  }
}
