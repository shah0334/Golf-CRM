import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-login.component',
  imports: [
    RouterLink,
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private firebaseService = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  form!: FormGroup;
  showPassword = false;
  errorMessage: string | null = null;
  isLoading = false;

  ngOnInit() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { email, password } = this.form.value;

    this.firebaseService.login(email, password).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        // Save session data to localStorage
        const orgData = response.user;
        localStorage.setItem('orgName', orgData.orgName || orgData.clubName || 'Oak Valley Golf Club');
        localStorage.setItem('activeOrganization', JSON.stringify(orgData));

        // Redirect to admin dashboard
        this.router.navigate(['/admin-dashboard']);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Login error:', err);
        
        if (err?.message === 'INVALID_LOGIN_CREDENTIALS') {
          this.errorMessage = 'Invalid email or password. Please try again.';
        } else {
          this.errorMessage = 'Failed to sign in. Please verify your connection or console details.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}

