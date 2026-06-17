export interface Hole {
  holeNumber: number;
  par: number;
  handicap: number;
  yards: { [teeName: string]: number };
}

export interface RegistrationData {
  clubName?: string;
  email?: string;
  password?: string;
  orgName?: string;
  courseName?: string;
  urlSlug?: string;
  orgEmail?: string;
  phone?: string;
  inviteCode?: string;
  selectedColor?: string;
  logoFileName?: string | null;
  logoPreview?: string | null;
  bannerFileName?: string | null;
  bannerPreview?: string | null;
  scorecardFileName?: string | null;
  scorecardPreview?: string | null;
  websiteUrl?: string;
  bookingUrl?: string;
  teeBoxes?: string[];
  holesList?: Hole[];
  courseUrl?: string;
  skippedStep3?: boolean;
  skippedStep4?: boolean;
}
