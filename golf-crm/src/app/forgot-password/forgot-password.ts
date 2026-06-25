import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private firebaseService = inject(FirebaseService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  email = '';
  isLoading = false;

  sendResetLink() {
    const trimmedEmail = this.email.trim();
    if (!trimmedEmail) {
      this.toastService.showWarning('Please enter your email address.');
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.firebaseService.sendPasswordResetEmail(trimmedEmail).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.showSuccess('A password reset link has been sent to your email.');
        this.email = '';
        this.router.navigate(['/']);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Password reset request failed:', err);
        this.toastService.showError(err.message || 'Failed to send password reset link. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }
}
