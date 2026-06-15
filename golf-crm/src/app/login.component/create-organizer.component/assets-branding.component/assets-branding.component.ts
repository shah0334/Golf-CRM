import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-assets-branding',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './assets-branding.component.html',
  styleUrl: './assets-branding.component.css',
})
export class AssetsBrandingComponent {
  private router = inject(Router);

  // Assets Upload States
  logoFileName: string | null = null;
  logoPreview: string | null = null;
  
  bannerFileName: string | null = null;
  bannerPreview: string | null = null;

  // Theme Colors
  selectedColor = '#DCAE5A'; // Default Classic Gold
  customColor = '#DCAE5A';
  
  colorPresets = [
    { name: 'Classic Gold', hex: '#DCAE5A', tailwindClass: 'bg-[#DCAE5A]' },
    { name: 'Forest Green', hex: '#051B11', tailwindClass: 'bg-[#051B11]' },
    { name: 'Golf Grass', hex: '#16A34A', tailwindClass: 'bg-[#16A34A]' },
    { name: 'Fairway Green', hex: '#15803D', tailwindClass: 'bg-[#15803D]' },
    { name: 'Royal Blue', hex: '#1D4ED8', tailwindClass: 'bg-[#1D4ED8]' },
    { name: 'Warm Crimson', hex: '#DC2626', tailwindClass: 'bg-[#DC2626]' }
  ];

  selectColor(hex: string) {
    this.selectedColor = hex;
    this.customColor = hex;
  }

  onCustomColorChange(hex: string) {
    this.selectedColor = hex;
  }

  onLogoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.logoFileName = file.name;
      
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onBannerUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.bannerFileName = file.name;
      
      const reader = new FileReader();
      reader.onload = () => {
        this.bannerPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeLogo() {
    this.logoFileName = null;
    this.logoPreview = null;
  }

  removeBanner() {
    this.bannerFileName = null;
    this.bannerPreview = null;
  }

  onSubmit() {
    this.router.navigate(['/finish']);
  }
}
