import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-create-organizer',
  imports: [
    RouterLink
  ],
  templateUrl: './create-organizer.component.html',
  styleUrl: './create-organizer.component.css',
})
export class CreateOrganizerComponent {
  private router = inject(Router);

  onSubmit(event: Event) {
    event.preventDefault();
    this.router.navigate(['/organization-course']);
  }
}
