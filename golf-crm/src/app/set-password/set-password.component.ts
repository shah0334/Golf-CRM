import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-cover bg-center bg-no-repeat text-[#FAF7F2] py-8 px-4 flex items-center justify-center font-sans"
      style="background-image: linear-gradient(rgba(5, 27, 17, 0.8), rgba(5, 27, 17, 0.85)), url('/golf_course_bg.png');">
      
      <div class="w-full max-w-md bg-[#133824]/40 border border-[#FAF7F2]/10 backdrop-blur-md rounded-[32px] p-8 shadow-2xl relative overflow-hidden text-[#FAF7F2]">
        <!-- Watermark Behind -->
        <div class="absolute -right-4 -bottom-10 opacity-5 pointer-events-none text-white select-none">
          <svg class="w-64 h-64" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2a5 5 0 100 10 5 5 0 000-10zM5 20a7 7 0 0114 0H5z" />
          </svg>
        </div>

        <div class="text-center space-y-3 mb-6 relative z-10">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-[#051B11] border border-[#DCAE5A]/45 text-[#DCAE5A] flex items-center justify-center shadow-lg">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h1 class="text-2xl font-serif font-black text-white tracking-tight">Set Your Password</h1>
          <p class="text-xs text-[#7A9A8A] font-semibold uppercase tracking-wider">Account Setup for {{ email }}</p>
        </div>

        <form (ngSubmit)="submitPassword()" class="space-y-4 relative z-10">
          <div>
            <label class="block text-[10px] font-bold text-[#7A9A8A] uppercase tracking-widest mb-1.5">New Password</label>
            <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••"
              class="block w-full rounded-xl border border-[#FAF7F2]/10 bg-[#051B11]/50 py-2.5 px-4 text-xs font-semibold focus:border-[#DCAE5A] focus:outline-none focus:ring-1 focus:ring-[#DCAE5A] transition-all text-white placeholder-white/20">
          </div>

          <div>
            <label class="block text-[10px] font-bold text-[#7A9A8A] uppercase tracking-widest mb-1.5">Confirm Password</label>
            <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required placeholder="••••••••"
              class="block w-full rounded-xl border border-[#FAF7F2]/10 bg-[#051B11]/50 py-2.5 px-4 text-xs font-semibold focus:border-[#DCAE5A] focus:outline-none focus:ring-1 focus:ring-[#DCAE5A] transition-all text-white placeholder-white/20">
          </div>

          <div *ngIf="errorMessage" class="text-red-400 text-xs font-semibold bg-red-950/30 border border-red-500/20 p-3 rounded-xl">
            {{ errorMessage }}
          </div>

          <button type="submit"
            class="w-full py-3 bg-[#DCAE5A] hover:bg-[#cdaf6d] text-[#051B11] text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md select-none uppercase tracking-wider mt-2 hover:scale-[1.01]">
            Activate Account
          </button>
        </form>
      </div>

    </div>
  `
})
export class SetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firebaseService = inject(FirebaseService);

  email = '';
  orgId = '';
  staffId = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.email = (params['email'] || '').trim().toLowerCase();
      this.orgId = params['orgId'] || '';
      this.staffId = params['staffId'] || '';
    });
  }

  submitPassword() {
    this.email = this.email.trim().toLowerCase();
    if (!this.email) {
      this.errorMessage = 'Invalid setup link. Missing email parameter.';
      return;
    }
    if (!this.password || this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    const saveLocallyAndRedirect = () => {
      try {
        const key = 'mock_firebase_organizers';
        const existingRaw = localStorage.getItem(key);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];

        const index = existing.findIndex((u: any) => u.email === this.email);
        if (index !== -1) {
          existing[index].password = this.password;
          existing[index].role = 'Staff';
          existing[index].orgId = this.orgId;
          existing[index].staffId = this.staffId;
          localStorage.setItem(key, JSON.stringify(existing));
        } else {
          existing.push({
            id: 'org_' + Math.random().toString(36).substring(2, 11),
            createdAt: new Date().toISOString(),
            email: this.email,
            password: this.password,
            role: 'Staff',
            orgId: this.orgId,
            staffId: this.staffId
          });
          localStorage.setItem(key, JSON.stringify(existing));
        }

        alert('Password set successfully! You can now log in with your credentials.');
        this.router.navigate(['/']);
      } catch (e: any) {
        this.errorMessage = 'Failed to save password locally: ' + (e.message || String(e));
      }
    };

    if (this.firebaseService.isFirebaseConfigured) {
      this.firebaseService.updateOrganization(this.email, '', {
        password: this.password,
        role: 'Staff',
        orgId: this.orgId,
        staffId: this.staffId
      }).subscribe({
        next: () => {
          saveLocallyAndRedirect();
        },
        error: (err) => {
          this.errorMessage = 'Failed to save password in database: ' + (err.message || String(err));
        }
      });
    } else {
      saveLocallyAndRedirect();
    }
  }
}
