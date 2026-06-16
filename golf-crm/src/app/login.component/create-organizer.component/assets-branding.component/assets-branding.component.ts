import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-assets-branding',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './assets-branding.component.html',
  styleUrl: './assets-branding.component.css',
})
export class AssetsBrandingComponent implements OnInit {
  private router = inject(Router);

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
    // this.clubName = localStorage.getItem('orgName') || 'Your Club';
    // this.websiteUrl = localStorage.getItem('websiteUrl') || '';
  }

  selectColor(hex: string) {
    // this.selectedColor = hex;
    // this.customColor = hex;
  }

  onCustomColorChange(hex: string) {
    // this.selectedColor = hex;
  }

  onLogoUpload(event: Event) {
  //   const input = event.target as HTMLInputElement;
  //   if (input.files && input.files.length > 0) {
  //     const file = input.files[0];
  //     this.logoFileName = file.name;
      
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       this.logoPreview = reader.result as string;
  //     };
  //     reader.readAsDataURL(file);
  //   }
  }

  onBannerUpload(event: Event) {
    // const input = event.target as HTMLInputElement;
    // if (input.files && input.files.length > 0) {
    //   const file = input.files[0];
    //   this.bannerFileName = file.name;
      
    //   const reader = new FileReader();
    //   reader.onload = () => {
    //     this.bannerPreview = reader.result as string;
    //   };
    //   reader.readAsDataURL(file);
    // }
  }

  onScorecardUpload(event: Event) {
    // const input = event.target as HTMLInputElement;
    // if (input.files && input.files.length > 0) {
    //   const file = input.files[0];
    //   this.scorecardFileName = file.name;
      
    //   const reader = new FileReader();
    //   reader.onload = () => {
    //     this.scorecardPreview = reader.result as string;
    //   };
    //   reader.readAsDataURL(file);
    // }
  }

  removeLogo() {
    // this.logoFileName = null;
    // this.logoPreview = null;
  }

  removeBanner() {
    // this.bannerFileName = null;
    // this.bannerPreview = null;
  }

  removeScorecard() {
    // this.scorecardFileName = null;
    // this.scorecardPreview = null;
  }

  copyHex() {
    // navigator.clipboard.writeText(this.selectedColor).then(() => {
    //   this.isCopied = true;
    //   setTimeout(() => {
    //     this.isCopied = false;
    //   }, 2000);
    // });
  }

  extractFromLogo() {
    // this.selectColor('#0F3D2E');
  }

  onSubmit() {
    // localStorage.setItem('primaryColor', this.selectedColor);
    // localStorage.setItem('logoUrl', this.logoUrl || this.logoPreview || '');
    this.router.navigate(['/finish']);
  }
}
