import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RegistrationService } from '../../services/registration.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-create-organizer',
  imports: [
    RouterLink,
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './create-organizer.component.html',
  styleUrl: './create-organizer.component.css',
})
export class CreateOrganizerComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private registrationService = inject(RegistrationService);
  private firebaseService = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  form!: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage: string | null = null;

  ngOnInit() {
    const data = this.registrationService.getData();
    this.form = this.fb.group({
      clubName: [data.clubName || '', [Validators.required]],
      email: [data.email || '', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: [data.password || '', [Validators.required, Validators.minLength(6)]]
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    
    if (this.form.valid) {
      this.isLoading = true;
      this.errorMessage = null;

      const email = this.form.value.email ? this.form.value.email.trim().toLowerCase() : '';
      this.form.patchValue({ email: email });
      this.firebaseService.checkEmailExists(email).subscribe({
        next: (exists: boolean) => {
          this.isLoading = false;
          if (exists) {
            this.errorMessage = 'This email is already registered. Please use a different email or sign in.';
          } else {
            const currentData = this.registrationService.getData();
            const oldEmail = currentData.email;
            if (oldEmail && oldEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
              this.registrationService.clear();
            }
            this.registrationService.updateData(this.form.value);
            this.router.navigate(['/organization-course']);
          }
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.isLoading = false;
          console.error('Error checking email availability:', err);
          this.errorMessage = 'Failed to verify email availability. Please check your network connection.';
          this.cdr.detectChanges();
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}

