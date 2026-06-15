import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-finish',
  imports: [CommonModule],
  templateUrl: './finish.component.html',
  styleUrl: './finish.component.css',
})
export class FinishComponent {
  @Output() prev = new EventEmitter<void>();

  private router = inject(Router);

  // Mock summary details
  orgName = 'Oakmont Country Club';
  urlSlug = 'oakmont-cc';
  inviteCode = 'F8V3NGSF';
  contactEmail = 'admin@oakmontcc.com';

  goBack() {
    this.prev.emit();
  }

  finishSetup() {
    // Navigate to homepage or dashboard
    this.router.navigate(['/']);
  }
}
