import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (fullPage) {
      <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-golf-dark/85 backdrop-blur-sm transition-all duration-300">
        <div class="relative flex items-center justify-center">
          <!-- Outer Spinning Ring -->
          <div class="w-16 h-16 rounded-full border-4 border-golf-accent/25 border-t-golf-accent animate-spin"></div>
          <!-- Inner Pulsing Golf Ball Core -->
          <div class="absolute w-8 h-8 rounded-full bg-white shadow-inner flex items-center justify-center animate-pulse">
            <div class="w-2 h-2 rounded-full bg-golf-dark/20"></div>
          </div>
        </div>
        <p class="mt-4 text-golf-accent font-sans text-sm tracking-widest uppercase font-semibold animate-pulse">{{ message }}</p>
      </div>
    } @else {
      <div class="flex flex-col items-center justify-center py-12 w-full h-full transition-all duration-300">
        <div class="relative flex items-center justify-center">
          <div class="w-12 h-12 rounded-full border-3 border-golf-accent/20 border-t-golf-accent animate-spin"></div>
          <div class="absolute w-6 h-6 rounded-full bg-white shadow-inner flex items-center justify-center animate-pulse"></div>
        </div>
        <p class="mt-3 text-golf-text-muted font-sans text-xs tracking-wider uppercase">{{ message }}</p>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class LoaderComponent {
  @Input() fullPage = false;
  @Input() message = 'Loading CRM Data...';
}
