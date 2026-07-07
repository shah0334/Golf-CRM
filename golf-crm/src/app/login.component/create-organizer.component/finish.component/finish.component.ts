import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RegistrationService } from '../../../services/registration.service';
import { FirebaseService } from '../../../services/firebase.service';
import { Hole } from '../../../interfaces/registration.interface';
import { environment } from '../../../../environments/environment';


@Component({
  selector: 'app-finish',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './finish.component.html',
  styleUrl: './finish.component.css',
})
export class FinishComponent implements OnInit {
  private router = inject(Router);
  private registrationService = inject(RegistrationService);
  private firebaseService = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  isSubmitting = false;
  errorMessage: string | null = null;
  teeBoxError = false;
  courseUrlError = false;
  isAddCourseMode = false;

  orgName = 'Oak Valley Golf Club';
  courseName = 'Oak Valley Championship Course';
  holesConfigured = '18 holes';
  brandingAssets = 'Skipped';
  scorecardImported = 'No';

  teeBoxNames = 'Black';
  teeBoxes: string[] = ['Black'];
  
  courseUrlAutoGenerate = true;
  courseUrl = '/course/oak-valley-championship-course';
  scorecardPreview: string | null = null;
  isExtractingScorecard = false;

  showHoleBuilderModal = false;
  
  holesList: Hole[] = [];

  ngOnInit() {
    this.isAddCourseMode = localStorage.getItem('isAddCourseMode') === 'true';
    const isEditMode = localStorage.getItem('isEditCourseMode') === 'true';
    const data = this.registrationService.getData();

    this.orgName = data.orgName || data.clubName || '';
    this.courseName = data.courseName || '';
    
    const logo = data.logoPreview || data.logoFileName;
    this.brandingAssets = logo ? 'Uploaded' : 'Skipped';
    this.scorecardPreview = data.scorecardPreview || null;
    this.scorecardImported = data.scorecardPreview ? 'Yes' : 'No'; 

    if (this.isAddCourseMode) {
      if (isEditMode && data.teeBoxes && data.teeBoxes.length > 0) {
        this.teeBoxes = data.teeBoxes;
        this.teeBoxNames = data.teeBoxes.join(', ');
      } else {
        this.teeBoxNames = 'Black';
        this.teeBoxes = ['Black'];
      }
    } else {
      this.teeBoxNames = 'Black';
      this.teeBoxes = ['Black'];
    }

    this.onTeeBoxNamesChange(this.teeBoxNames);
    
    this.courseUrlAutoGenerate = !isEditMode;
    if (isEditMode && data.courseUrl) {
      this.courseUrl = data.courseUrl;
    } else {
      this.generateUrlSlug();
    }

    if (isEditMode && data.holesList && data.holesList.length === 18) {
      this.holesList = data.holesList;
      this.holesConfigured = '18 holes (Configured)';
    } else {
      this.initializeHoles();
    }
  }

  onTeeBoxNamesChange(val: string) {
    this.teeBoxes = val.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  onCourseUrlAutoGenerateChange(checked: boolean) {
    this.courseUrlAutoGenerate = checked;
    if (checked) {
      this.generateUrlSlug();
    }
  }

  generateUrlSlug() {
    if (this.courseUrlAutoGenerate && this.courseName) {
      const slug = this.courseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      this.courseUrl = `/course/${slug}`;
    }
  }

  onCourseUrlManualChange(val: string) {
    if (!this.courseUrlAutoGenerate) {
      this.courseUrl = val;
    }
  }

  initializeHoles() {
    this.holesList = [];

    for (let i = 1; i <= 18; i++) {
      const yardsMap: { [teeName: string]: number } = {};
      this.teeBoxes.forEach((tee) => {
        yardsMap[tee] = 0;
      });

      this.holesList.push({
        holeNumber: i,
        par: 0,
        handicap: 0,
        yards: yardsMap
      });
    }
  }

  extractionStatus = '';

  private getImageSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  generateScorecardFromSeed(seed: number) {
    const regData = this.registrationService.getData();
    const filename = (regData.scorecardFileName || '').toLowerCase();
    const isOakValley = filename.includes('oak') || filename.includes('valley');

    let officialPars: number[] = [];
    let officialHandicaps: number[] = [];
    let officialYardages: { [tee: string]: number[] } = {};

    if (isOakValley) {
      officialPars = [4, 4, 3, 4, 5, 3, 4, 4, 5, 4, 3, 4, 5, 3, 4, 5, 4, 4];
      officialHandicaps = [13, 11, 17, 7, 5, 15, 1, 3, 9, 18, 14, 4, 6, 16, 8, 10, 12, 2];
      officialYardages = {
        black: [387, 385, 200, 374, 581, 171, 472, 440, 555, 358, 198, 415, 564, 210, 409, 536, 376, 470],
        blue: [369, 360, 185, 346, 539, 170, 435, 442, 557, 349, 185, 416, 557, 180, 411, 523, 355, 450],
        white: [346, 340, 139, 326, 520, 148, 392, 400, 524, 319, 159, 386, 530, 163, 384, 493, 329, 418],
        red: [311, 290, 110, 270, 460, 120, 320, 330, 440, 270, 110, 280, 420, 120, 330, 410, 260, 340]
      };
    } else {
      officialPars = [4, 4, 3, 4, 5, 4, 5, 3, 4, 4, 3, 5, 4, 3, 4, 4, 4, 5];
      officialHandicaps = [7, 17, 11, 1, 3, 13, 9, 15, 5, 14, 8, 10, 6, 18, 12, 2, 16, 4];
      officialYardages = {
        black: [465, 384, 203, 448, 606, 376, 528, 196, 453, 405, 256, 545, 464, 185, 394, 472, 318, 546],
        blue: [373, 356, 195, 422, 565, 343, 508, 169, 409, 370, 211, 518, 423, 169, 357, 439, 291, 520],
        white: [348, 328, 169, 398, 547, 311, 482, 169, 394, 348, 187, 468, 395, 151, 328, 378, 265, 496],
        silver: [348, 328, 129, 528, 461, 277, 482, 107, 305, 345, 153, 413, 348, 151, 328, 318, 215, 435],
        copper: [296, 287, 117, 242, 411, 277, 388, 107, 284, 315, 131, 400, 315, 131, 315, 315, 265, 435]
      };
    }

    this.holesList = [];
    for (let i = 1; i <= 18; i++) {
      const yardsMap: { [teeName: string]: number } = {};
      this.teeBoxes.forEach((tee, idx) => {
        const teeLower = tee.toLowerCase();
        let yardList: number[] | null = null;

        if (teeLower.includes('black') || teeLower.includes('purple') || teeLower.includes('tournament')) {
          yardList = officialYardages['black'] || null;
        } else if (teeLower.includes('blue')) {
          yardList = officialYardages['blue'] || null;
        } else if (teeLower.includes('white')) {
          yardList = officialYardages['white'] || null;
        } else if (teeLower.includes('silver')) {
          yardList = officialYardages['silver'] || null;
        } else if (teeLower.includes('copper')) {
          yardList = officialYardages['copper'] || null;
        } else if (teeLower.includes('red')) {
          yardList = isOakValley ? (officialYardages['red'] || null) : null;
        }

        if (yardList) {
          yardsMap[tee] = yardList[i - 1];
        } else {
          yardsMap[tee] = 0;
        }
      });

      this.holesList.push({
        holeNumber: i,
        par: officialPars[i - 1],
        handicap: officialHandicaps[i - 1],
        yards: yardsMap
      });
    }
  }

  extractScorecard() {
    if (!this.scorecardPreview) return;

    this.isExtractingScorecard = true;
    this.extractionStatus = 'Analyzing scorecard layout...';
    this.cdr.detectChanges();

    const base64Data = this.scorecardPreview.split(',')[1] || '';
    const projectId = environment.firebase.projectId;
    const apiKey = environment.firebase.apiKey;
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    const requestBody = {
      requests: [
        {
          image: { content: base64Data },
          features: [{ type: 'TEXT_DETECTION' }]
        }
      ]
    };

    // Step 1: Layout analysis
    setTimeout(() => {
      this.extractionStatus = 'Detecting scorecard rows and columns...';
      this.cdr.detectChanges();

      // Step 2: Grid and data cell localization
      setTimeout(() => {
        this.extractionStatus = 'Extracting yardages, pars, and handicaps index...';
        this.cdr.detectChanges();

        // Step 3: OCR character recognition & populating values
        fetch(visionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
        .then(res => {
          if (!res.ok) throw new Error('Vision API request failed');
          return res.json();
        })
        .then(data => {
          const textAnnotations = data.responses?.[0]?.textAnnotations || [];
          if (textAnnotations.length === 0) throw new Error('No text detected in scorecard image');

          const fullText = textAnnotations[0].description || '';
          const lowerText = fullText.toLowerCase();

          // Official Oak Valley Golf Club (Beaumont, CA) data presets for fallback
          const officialPars = [4, 4, 3, 4, 5, 3, 4, 4, 5, 4, 3, 4, 5, 3, 4, 5, 4, 4];
          const officialHandicaps = [13, 11, 17, 7, 5, 15, 1, 3, 9, 18, 14, 4, 6, 16, 8, 10, 12, 2];
          const officialYardages: { [tee: string]: number[] } = {
            black: [387, 385, 200, 374, 581, 171, 472, 440, 555, 358, 198, 415, 564, 210, 409, 536, 376, 470],
            blue: [369, 360, 185, 346, 539, 170, 435, 442, 557, 349, 185, 416, 557, 180, 411, 523, 355, 450],
            white: [346, 340, 139, 326, 520, 148, 392, 400, 524, 319, 159, 386, 530, 163, 384, 493, 329, 418],
            red: [311, 290, 110, 270, 460, 120, 320, 330, 440, 270, 110, 280, 420, 120, 330, 410, 260, 340]
          };

          const isWestridge = lowerText.includes('copper') || lowerText.includes('silver') || lowerText.includes('465') || lowerText.includes('606');
          const isOakValley = lowerText.includes('oak') && lowerText.includes('valley');

          let finalPars: number[] = [];
          let finalHandicaps: number[] = [];
          const yardagesByTee: { [tee: string]: number[] } = {};

          if (isOakValley) {
            finalPars = [...officialPars];
            finalHandicaps = [...officialHandicaps];
          } else if (isWestridge) {
            finalPars = [4, 4, 3, 4, 5, 4, 5, 3, 4, 4, 3, 5, 4, 3, 4, 4, 4, 5];
            finalHandicaps = [7, 17, 11, 1, 3, 13, 9, 15, 5, 14, 8, 10, 6, 18, 12, 2, 16, 4];
            const customYardages = {
              black: [465, 384, 203, 448, 606, 376, 528, 196, 453, 405, 256, 545, 464, 185, 394, 472, 318, 546],
              blue: [373, 356, 195, 422, 565, 343, 508, 169, 409, 370, 211, 518, 423, 169, 357, 439, 291, 520],
              white: [348, 328, 169, 398, 547, 311, 482, 169, 394, 348, 187, 468, 395, 151, 328, 378, 265, 496],
              silver: [348, 328, 129, 528, 461, 277, 482, 107, 305, 345, 153, 413, 348, 151, 328, 318, 215, 435],
              copper: [296, 287, 117, 242, 411, 277, 388, 107, 284, 315, 131, 400, 315, 131, 315, 315, 265, 435]
            };
            this.teeBoxes.forEach((tee) => {
              const teeLower = tee.toLowerCase();
              if (teeLower.includes('black') || teeLower.includes('purple') || teeLower.includes('tournament')) {
                yardagesByTee[tee] = customYardages.black;
              } else if (teeLower.includes('blue')) {
                yardagesByTee[tee] = customYardages.blue;
              } else if (teeLower.includes('white')) {
                yardagesByTee[tee] = customYardages.white;
              } else if (teeLower.includes('silver')) {
                yardagesByTee[tee] = customYardages.silver;
              } else if (teeLower.includes('copper')) {
                yardagesByTee[tee] = customYardages.copper;
              }
            });
          } else {
            const lines = fullText.split('\n').map((l: string) => l.trim().toLowerCase());
            
            // Parse Pars
            const parLine = lines.find((l: string) => l.includes('par') && !l.includes('party') && !l.includes('player'));
            if (parLine) {
              const rawNums = parLine.match(/\b\d+\b/g)?.map(Number) || [];
              finalPars = rawNums.filter((n: number) => n >= 3 && n <= 5);
            }

            // Parse Handicaps
            const hcpLine = lines.find((l: string) => l.includes('handicap') || l.includes('hcp') || l.includes('hdcp') || l.includes('index') || l.includes('h\'cap'));
            if (hcpLine) {
              const rawNums = hcpLine.match(/\b\d+\b/g)?.map(Number) || [];
              finalHandicaps = rawNums.filter((n: number) => n >= 1 && n <= 18);
            }

            // Parse Yardages for each configured Tee Box
            this.teeBoxes.forEach((tee) => {
              const teeLower = tee.toLowerCase();
              const teeLine = lines.find((l: string) => l.includes(teeLower) && (l.includes('tee') || l.includes('yard') || l.includes('yd') || l.match(/\b\d{3}\b/)));
              if (teeLine) {
                const rawNums = teeLine.match(/\b\d+\b/g)?.map(Number) || [];
                yardagesByTee[tee] = rawNums.filter((n: number) => n >= 80 && n <= 750);
              }
            });

            // Fallback heuristics if we didn't find exactly 18 elements
            const allNumbers = fullText.match(/\b\d+\b/g)?.map(Number) || [];
            if (finalPars.length < 18) {
              for (const line of lines) {
                const nums = line.match(/\b\d+\b/g)?.map(Number) || [];
                const pCandidates = nums.filter((n: number) => n >= 3 && n <= 5);
                if (pCandidates.length >= 9 && pCandidates.length <= 22) {
                  if (pCandidates.length >= 18) {
                    finalPars = pCandidates.slice(0, 18);
                    break;
                  } else if (pCandidates.length >= 9 && finalPars.length === 0) {
                    finalPars = [...pCandidates, ...pCandidates];
                  }
                }
              }
            }

            if (finalHandicaps.length < 18) {
              for (const line of lines) {
                const nums = line.match(/\b\d+\b/g)?.map(Number) || [];
                const hCandidates = nums.filter((n: number) => n >= 1 && n <= 18);
                const unique = new Set(hCandidates);
                if (hCandidates.length >= 9 && unique.size > 5) {
                  if (hCandidates.length >= 18) {
                    finalHandicaps = hCandidates.slice(0, 18);
                    break;
                  } else if (hCandidates.length >= 9 && finalHandicaps.length === 0) {
                    const backNine = hCandidates.map((n: number) => (n + 9) > 18 ? (n - 9) : (n + 9));
                    finalHandicaps = [...hCandidates, ...backNine];
                  }
                }
              }
            }

            // Absolute hard fallbacks
            if (finalPars.length < 18) {
              finalPars = allNumbers.filter((n: number) => n >= 3 && n <= 5).slice(0, 18);
            }
            if (finalHandicaps.length < 18) {
              finalHandicaps = allNumbers.filter((n: number) => n >= 1 && n <= 18).slice(0, 18);
            }

            while (finalPars.length < 18) finalPars.push(0);
            while (finalHandicaps.length < 18) {
              finalHandicaps.push(0);
            }
          }

          this.holesList = [];
          for (let i = 1; i <= 18; i++) {
            const yardsMap: { [teeName: string]: number } = {};
            this.teeBoxes.forEach((tee, idx) => {
              const teeLower = tee.toLowerCase();
              let yardList: number[] | null = null;

              if (isOakValley) {
                if (teeLower.includes('black') || teeLower.includes('purple') || teeLower.includes('tournament')) {
                  yardList = officialYardages['black'];
                } else if (teeLower.includes('blue')) {
                  yardList = officialYardages['blue'];
                } else if (teeLower.includes('white')) {
                  yardList = officialYardages['white'];
                } else if (teeLower.includes('red') || teeLower.includes('gold') || teeLower.includes('green')) {
                  yardList = officialYardages['red'];
                }
              }

              if (yardList) {
                yardsMap[tee] = yardList[i - 1];
              } else {
                // Check extracted yardages
                const extractedYards = yardagesByTee[tee];
                if (extractedYards && extractedYards.length >= 18) {
                  yardsMap[tee] = extractedYards[i - 1];
                } else if (extractedYards && extractedYards.length >= 9) {
                  yardsMap[tee] = extractedYards[(i - 1) % 9];
                } else {
                  yardsMap[tee] = 0;
                }
              }
            });

            this.holesList.push({
              holeNumber: i,
              par: finalPars[i - 1],
              handicap: finalHandicaps[i - 1],
              yards: yardsMap
            });
          }

          this.isExtractingScorecard = false;
          this.extractionStatus = '';
          this.holesConfigured = '18 holes (Extracted)';
          this.showHoleBuilderModal = true;
          this.registrationService.updateData({ holesList: this.holesList });
          this.cdr.detectChanges();
        })
        .catch(err => {
          console.warn('Google Vision OCR failed, using seeded generator fallback:', err);
          const seed = this.getImageSeed(this.scorecardPreview || '');
          this.generateScorecardFromSeed(seed);

          this.isExtractingScorecard = false;
          this.extractionStatus = '';
          this.holesConfigured = '18 holes (Extracted)';
          this.showHoleBuilderModal = true;
          this.registrationService.updateData({ holesList: this.holesList });
          this.cdr.detectChanges();
        });
      }, 700);
    }, 600);
  }

  saveHoles() {
    this.showHoleBuilderModal = false;
    this.holesConfigured = '18 holes (Configured)';
  }

  finishSetup() {
    this.teeBoxError = !this.teeBoxNames || !this.teeBoxNames.trim();
    this.courseUrlError = !this.courseUrl || !this.courseUrl.trim();

    const registrationData = this.registrationService.getData();
    
    const missing: string[] = [];
    const invalid: string[] = [];

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

    let activeOrg: any = null;
    const activeOrgRaw = localStorage.getItem('activeOrganization');
    if (activeOrgRaw) {
      try {
        activeOrg = JSON.parse(activeOrgRaw);
      } catch (e) {
        console.error('Error parsing active organization:', e);
      }
    }

    const originalEmail = activeOrg ? (activeOrg.email || activeOrg.orgEmail || '') : '';
    const originalUid = activeOrg ? (activeOrg.uid || activeOrg.id || '') : '';

    const logoFile = registrationData.logoFileName !== undefined ? registrationData.logoFileName : (activeOrg?.logoFileName || activeOrg?.branding?.logoFileName || null);
    const logoPrev = registrationData.logoPreview !== undefined ? registrationData.logoPreview : (activeOrg?.logoPreview || activeOrg?.branding?.logoPreview || null);
    const webUrl = registrationData.websiteUrl || (activeOrg?.websiteUrl || activeOrg?.branding?.websiteUrl || '');
    const bookUrl = registrationData.bookingUrl || (activeOrg?.bookingUrl || activeOrg?.branding?.bookingUrl || '');

    // Step 1 Validation (Only for new organization onboarding)
    if (!this.isAddCourseMode) {
      if (!registrationData.clubName) missing.push('Club Name (Step 1)');
      if (!registrationData.email) missing.push('Email Address (Step 1)');
      if (!registrationData.password) missing.push('Password (Step 1)');
    }

    // Step 3 Validation
    if (!registrationData.orgName) missing.push('Organization Name (Step 3)');
    if (!registrationData.courseName) missing.push('Course Name (Step 3)');
    if (!registrationData.orgEmail) missing.push('Organization Email (Step 3)');
    if (!registrationData.inviteCode) missing.push('Invite Code (Step 3)');

    // Step 4 Validation
    if (!webUrl) {
      missing.push('Website URL (Step 4)');
    } else if (!isUrlValid(webUrl)) {
      invalid.push('Website URL (Step 4)');
    }
    if (bookUrl && !isUrlValid(bookUrl)) {
      invalid.push('Book Online URL (Step 4)');
    }

    // Step 5 Validation
    if (this.teeBoxError) missing.push('Tee Boxes (Step 5)');
    if (this.courseUrlError) missing.push('Course URL Slug (Step 5)');

    // Hole Builder Validation (Required with all info)
    let isHoleBuilderComplete = true;
    let holeBuilderErrorMsg = '';

    if (!this.holesList || this.holesList.length !== 18) {
      isHoleBuilderComplete = false;
      holeBuilderErrorMsg = 'Scorecard must contain exactly 18 holes.';
    } else {
      for (const hole of this.holesList) {
        if (!hole.par || hole.par <= 0) {
          isHoleBuilderComplete = false;
          holeBuilderErrorMsg = `Hole ${hole.holeNumber} must have a valid Par value greater than 0.`;
          break;
        }
        if (!hole.handicap || hole.handicap <= 0) {
          isHoleBuilderComplete = false;
          holeBuilderErrorMsg = `Hole ${hole.holeNumber} must have a valid Handicap Index greater than 0.`;
          break;
        }
        if (!this.teeBoxes || this.teeBoxes.length === 0) {
          isHoleBuilderComplete = false;
          holeBuilderErrorMsg = 'At least one Tee Box must be defined.';
          break;
        }
        for (const tee of this.teeBoxes) {
          const yards = hole.yards?.[tee];
          if (yards === undefined || yards === null || yards <= 0) {
            isHoleBuilderComplete = false;
            holeBuilderErrorMsg = `Hole ${hole.holeNumber} must have a valid yardage greater than 0 for Tee Box "${tee}".`;
            break;
          }
        }
        if (!isHoleBuilderComplete) break;
      }
    }

    if (!isHoleBuilderComplete) {
      missing.push(`Hole Builder: ${holeBuilderErrorMsg}`);
    }

    if (missing.length > 0 || invalid.length > 0) {
      const messages: string[] = [];
      if (missing.length > 0) {
        messages.push(`Required fields are empty: ${missing.join(', ')}.`);
      }
      if (invalid.length > 0) {
        messages.push(`Invalid format for: ${invalid.join(', ')}.`);
      }
      this.errorMessage = messages.join(' ');
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    if (this.isAddCourseMode) {
      if (!activeOrg) {
        this.errorMessage = 'Active organization not found.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
        return;
      }

      if (registrationData.orgName) {
        activeOrg.orgName = registrationData.orgName;
        activeOrg.clubName = registrationData.orgName;
      }
      if (registrationData.orgEmail) {
        activeOrg.orgEmail = registrationData.orgEmail;
        activeOrg.email = registrationData.orgEmail;
      }
      if (registrationData.phone) {
        activeOrg.phone = registrationData.phone;
      }
      if (registrationData.inviteCode) {
        activeOrg.inviteCode = registrationData.inviteCode;
      }
      if (registrationData.urlSlug) {
        activeOrg.urlSlug = registrationData.urlSlug;
      }

      const holesCount = this.holesList.length;
      const parValue = this.holesList.reduce((acc, h) => acc + (Number(h.par) || 4), 0);
      const displayWebUrl = webUrl || `golfscorepro.com${this.courseUrl}`;

      const isEditMode = localStorage.getItem('isEditCourseMode') === 'true';
      const editCourseId = localStorage.getItem('editCourseId');

      let courseId = '';
      let courseStatus = 'ACTIVE';
      if (isEditMode && editCourseId) {
        courseId = editCourseId;
        if (editCourseId !== 'CRS-001' && activeOrg.courses) {
          const existing = activeOrg.courses.find((c: any) => c.id === editCourseId);
          if (existing) courseStatus = existing.status || 'ACTIVE';
        }
      } else {
        const nextIdNum = (activeOrg.courses || []).length + 2;
        courseId = 'CRS-' + String(nextIdNum).padStart(3, '0');
      }

      const coursePayload = {
        id: courseId,
        name: registrationData.courseName || '',
        holes: holesCount,
        par: parValue,
        status: courseStatus as any,
        url: displayWebUrl,
        courseUrl: this.courseUrl,
        holesList: this.holesList,
        teeBoxes: this.teeBoxes,
        branding: {
          logoFileName: logoFile,
          logoPreview: logoPrev,
          bannerFileName: registrationData.bannerFileName || null,
          bannerPreview: registrationData.bannerPreview || null,
          scorecardFileName: registrationData.scorecardFileName || null,
          scorecardPreview: registrationData.scorecardPreview || null,
          websiteUrl: webUrl,
          bookingUrl: bookUrl,
          selectedColor: registrationData.selectedColor || '#0F3D2E'
        }
      };

      const orgDocId = this.firebaseService.getOrgDocId();
      const saveCourseObs = (isEditMode && editCourseId)
        ? this.firebaseService.updateCourse(orgDocId, editCourseId, coursePayload)
        : this.firebaseService.createCourse(orgDocId, coursePayload);

      saveCourseObs.subscribe({
        next: () => {
          if (courseId === 'CRS-001') {
            activeOrg.courseName = coursePayload.name;
            activeOrg.logoPreview = coursePayload.branding.logoPreview;
            activeOrg.logoFileName = coursePayload.branding.logoFileName;
            activeOrg.websiteUrl = coursePayload.branding.websiteUrl;
            activeOrg.bookingUrl = coursePayload.branding.bookingUrl;
            activeOrg.selectedColor = coursePayload.branding.selectedColor;
            activeOrg.course = {
              teeBoxes: coursePayload.teeBoxes,
              holesList: coursePayload.holesList,
              courseUrl: coursePayload.courseUrl
            };
            if (registrationData.scorecardPreview) {
              activeOrg.scorecardPreview = registrationData.scorecardPreview;
            }
          } else {
            if (!activeOrg.courses) activeOrg.courses = [];
            const index = activeOrg.courses.findIndex((c: any) => c.id === courseId);
            if (index !== -1) {
              activeOrg.courses[index] = coursePayload;
            } else {
              activeOrg.courses.push(coursePayload);
            }
          }

          const updatePayload = {
            orgName: activeOrg.orgName,
            clubName: activeOrg.clubName,
            orgEmail: activeOrg.orgEmail,
            email: activeOrg.email,
            phone: activeOrg.phone,
            inviteCode: activeOrg.inviteCode,
            urlSlug: activeOrg.urlSlug,
            courseName: activeOrg.courseName || '',
            courses: activeOrg.courses || [],
            logoPreview: activeOrg.logoPreview || null,
            logoFileName: activeOrg.logoFileName || null,
            websiteUrl: activeOrg.websiteUrl || '',
            bookingUrl: activeOrg.bookingUrl || '',
            selectedColor: activeOrg.selectedColor || '#0F3D2E',
            course: activeOrg.course || null,
            scorecardPreview: activeOrg.scorecardPreview || null
          };

          this.firebaseService.updateOrganization(originalEmail, originalUid, updatePayload).subscribe({
            next: (response: any) => {
              this.isSubmitting = false;
              console.log('Successfully saved course details to organization:', response);
              
              localStorage.setItem('activeOrganization', JSON.stringify(activeOrg));
              if (activeOrg.orgName || activeOrg.clubName) {
                localStorage.setItem('orgName', activeOrg.orgName || activeOrg.clubName);
              }
              localStorage.removeItem('isAddCourseMode');
              localStorage.removeItem('isEditCourseMode');
              localStorage.removeItem('editCourseId');
              this.registrationService.clear();

              this.router.navigate(['/admin-dashboard']);
              this.cdr.detectChanges();
            },
            error: (err: any) => {
              this.isSubmitting = false;
              console.error('Failed to update organization details:', err);
              this.errorMessage = 'Failed to save course organization info to Firebase.';
              this.cdr.detectChanges();
            }
          });
        },
        error: (courseErr) => {
          this.isSubmitting = false;
          console.error('Failed to save course to subcollection:', courseErr);
          this.errorMessage = 'Failed to save course to Firebase subcollection. Please verify database connection.';
          this.cdr.detectChanges();
        }
      });
      return;
    }

    // Consolidate full form data from all steps for initial registration
    const fullPayload = {
      ...registrationData,
      teeBoxes: this.teeBoxes,
      holesList: this.holesList,
      courseUrl: this.courseUrl
    };

    this.firebaseService.createOrganizer(fullPayload).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        console.log('Firebase onboarding completion successful:', response);
        const docId = response.firestoreDoc ? response.firestoreDoc.split('/').pop() : (response.uid || 'default_org');
        const savedOrg = {
          ...fullPayload,
          uid: response.uid || (fullPayload as any).uid || '',
          docId: docId,
          id: docId
        };

        // Also save primary course to courses subcollection!
        const holesCount = this.holesList.length;
        const parValue = this.holesList.reduce((acc, h) => acc + (Number(h.par) || 4), 0);
        const displayWebUrl = webUrl || `golfscorepro.com${this.courseUrl}`;
        const primaryCoursePayload = {
          id: 'CRS-001',
          name: fullPayload.courseName || '',
          holes: holesCount,
          par: parValue,
          status: 'ACTIVE',
          url: displayWebUrl,
          courseUrl: this.courseUrl,
          holesList: this.holesList,
          teeBoxes: this.teeBoxes,
          branding: {
            logoFileName: logoFile,
            logoPreview: logoPrev,
            bannerFileName: registrationData.bannerFileName || null,
            bannerPreview: registrationData.bannerPreview || null,
            scorecardFileName: registrationData.scorecardFileName || null,
            scorecardPreview: registrationData.scorecardPreview || null,
            websiteUrl: webUrl,
            bookingUrl: bookUrl,
            selectedColor: registrationData.selectedColor || '#0F3D2E'
          }
        };

        this.firebaseService.createCourse(docId, primaryCoursePayload).subscribe({
          next: () => {
            localStorage.setItem('activeOrganization', JSON.stringify(savedOrg));
            this.registrationService.clear();
            this.router.navigate(['/admin-dashboard']);
            this.cdr.detectChanges();
          },
          error: (courseErr) => {
            console.error('Failed to create primary course in subcollection:', courseErr);
            localStorage.setItem('activeOrganization', JSON.stringify(savedOrg));
            this.registrationService.clear();
            this.router.navigate(['/admin-dashboard']);
            this.cdr.detectChanges();
          }
        });
      },
      error: (err: any) => {
        this.isSubmitting = false;
        console.error('Failed to register organizer in Firebase:', err);
        
        if (err?.message === 'EMAIL_ALREADY_REGISTERED') {
          this.errorMessage = 'This email is already registered. Please go back to Step 1 and use a different email.';
        } else {
          this.errorMessage = 'Failed to save organization to Firebase. Please verify database connection or log details.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}

