import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RegistrationService } from '../../../services/registration.service';

@Component({
  selector: 'app-assets-branding',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './assets-branding.component.html',
  styleUrl: './assets-branding.component.css',
})
export class AssetsBrandingComponent implements OnInit {
  private router = inject(Router);
  private registrationService = inject(RegistrationService);
  private cdr = inject(ChangeDetectorRef);

  errorMessage: string | null = null;
  isUploadingLogo = false;
  isUploadingScorecard = false;

  clubName = 'Your Club';

  logoFileName: string | null = null;
  logoPreview: string | null = null;
  logoUrl = '';
  
  bannerFileName: string | null = null;
  bannerPreview: string | null = null;
  scorecardFileName: string | null = null;
  scorecardPreview: string | null = null;
  websiteUrl = '';
  bookingUrl = '';

  selectedColor = '#0F3D2E'; 
  customColor = '#0F3D2E';
  isCopied = false;
  
  colorPresets = [
    { name: 'Forest Green', hex: '#0F3D2E', tailwindClass: 'bg-[#0F3D2E]' },
    { name: 'Grass Green', hex: '#15803D', tailwindClass: 'bg-[#15803D]' },
    { name: 'Light Green', hex: '#16A34A', tailwindClass: 'bg-[#16A34A]' },
    { name: 'Teal', hex: '#0D9488', tailwindClass: 'bg-[#0D9488]' },
    { name: 'Gold', hex: '#EAB308', tailwindClass: 'bg-[#EAB308]' },
    { name: 'Navy', hex: '#1E3A8A', tailwindClass: 'bg-[#1E3A8A]' },
    { name: 'Blue', hex: '#2563EB', tailwindClass: 'bg-[#2563EB]' },
    { name: 'Red', hex: '#DC2626', tailwindClass: 'bg-[#DC2626]' }
  ];

  ngOnInit() {
    const data = this.registrationService.getData();
    this.clubName = data.orgName || data.clubName || 'Your Club';
    this.websiteUrl = data.websiteUrl || (data.urlSlug ? `https://${data.urlSlug}.golfscorepro.com` : '');
    
    // Load previously saved values if they exist
    if (data.selectedColor) {
      this.selectedColor = data.selectedColor;
      this.customColor = data.selectedColor;
    }
    this.logoFileName = data.logoFileName || null;
    this.logoPreview = data.logoPreview || null;
    this.bannerFileName = data.bannerFileName || null;
    this.bannerPreview = data.bannerPreview || null;
    this.scorecardFileName = data.scorecardFileName || null;
    this.scorecardPreview = data.scorecardPreview || null;
    this.bookingUrl = data.bookingUrl || '';
  }

  selectColor(hex: string) {
    this.selectedColor = hex;
    this.customColor = hex;
  }

  onCustomColorChange(hex: string) {
    this.selectedColor = hex;
  }

  private compressImage(base64Str: string, maxDim: number, quality: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  }

  onLogoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.isUploadingLogo = true;
      this.logoFileName = null;
      this.logoPreview = null;
      this.errorMessage = null;
      this.cdr.detectChanges();

      const file = input.files[0];
      this.logoFileName = file.name;
      
      const reader = new FileReader();
      reader.onload = () => {
        const rawBase64 = reader.result as string;
        this.compressImage(rawBase64, 250, 0.7).then((compressedBase64) => {
          setTimeout(() => {
            this.logoPreview = compressedBase64;
            this.isUploadingLogo = false;
            this.cdr.detectChanges();
          }, 700);
        });
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
        const rawBase64 = reader.result as string;
        this.compressImage(rawBase64, 250, 0.7).then((compressedBase64) => {
          this.bannerPreview = compressedBase64;
        });
      };
      reader.readAsDataURL(file);
    }
  }

  onScorecardUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.isUploadingScorecard = true;
      this.scorecardFileName = null;
      this.scorecardPreview = null;
      this.errorMessage = null;
      this.cdr.detectChanges();

      const file = input.files[0];
      this.scorecardFileName = file.name;
      
      const reader = new FileReader();
      reader.onload = () => {
        const rawBase64 = reader.result as string;
        this.compressImage(rawBase64, 300, 0.6).then((compressedBase64) => {
          setTimeout(() => {
            this.scorecardPreview = compressedBase64;
            this.isUploadingScorecard = false;
            this.cdr.detectChanges();
          }, 700);
        });
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

  removeScorecard() {
    this.scorecardFileName = null;
    this.scorecardPreview = null;
  }

  copyHex() {
    navigator.clipboard.writeText(this.selectedColor).then(() => {
      this.isCopied = true;
      setTimeout(() => {
        this.isCopied = false;
      }, 2000);
    });
  }

  extractFromLogo() {
    this.selectColor('#0F3D2E');
  }

  skipStep() {
    this.registrationService.updateData({ skippedStep4: true });
    this.router.navigate(['/finish']);
  }

  onSubmit() {
    this.errorMessage = null;

    const isUrlValid = (url: string) => {
      if (!url) return false;
      try {
        const testUrl = url.startsWith('http://') || url.startsWith('https://') ? url : 'https://' + url;
        new URL(testUrl);
        return true;
      } catch (_) {
        return false;
      }
    };

    const missing: string[] = [];
    const invalid: string[] = [];

    if (!(this.logoPreview || this.logoUrl)) {
      missing.push('Logo');
    }
    if (!this.websiteUrl) {
      missing.push('Website URL');
    } else if (!isUrlValid(this.websiteUrl)) {
      invalid.push('Website URL');
    }
    if (!this.bookingUrl) {
      missing.push('Book Online URL');
    } else if (!isUrlValid(this.bookingUrl)) {
      invalid.push('Book Online URL');
    }

    if (missing.length > 0 || invalid.length > 0) {
      const messages: string[] = [];
      if (missing.length > 0) {
        messages.push(`Required fields are empty: ${missing.join(', ')}.`);
      }
      if (invalid.length > 0) {
        messages.push(`Invalid URL format for: ${invalid.join(', ')}.`);
      }
      this.errorMessage = messages.join(' ');
      this.cdr.detectChanges();
      return;
    }

    this.registrationService.updateData({
      selectedColor: this.selectedColor,
      logoFileName: this.logoFileName || (this.logoUrl ? 'custom_logo_url' : null),
      logoPreview: this.logoPreview || this.logoUrl || null,
      bannerFileName: this.bannerFileName,
      bannerPreview: this.bannerPreview,
      scorecardFileName: this.scorecardFileName,
      scorecardPreview: this.scorecardPreview,
      websiteUrl: this.websiteUrl,
      bookingUrl: this.bookingUrl,
      skippedStep4: false
    });
    
    // Also set localStorage for compatibility with existing components
    localStorage.setItem('primaryColor', this.selectedColor);
    localStorage.setItem('logoUrl', this.logoPreview || this.logoUrl || '');
    
    this.router.navigate(['/finish']);
    this.cdr.detectChanges();
  }
}

