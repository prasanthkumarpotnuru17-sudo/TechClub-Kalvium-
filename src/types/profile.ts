export interface PersonalSection {
  name?: string;
  phone?: string;
  city?: string;
  bio?: string;
  avatar?: string;
}

export interface EducationSection {
  college?: string;
  course?: string;
  department?: string;
  academicYear?: string;
  graduationYear?: string;
}

export interface ProfessionalSection {
  company?: string;
  jobTitle?: string;
  yearsOfExperience?: string;
  skills?: string;
  organization?: string;
  designation?: string;
  expertise?: string;
}

export interface SocialsSection {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface InterestsSection {
  domain?: string;
  interestedTeam?: string;
  preferences?: string[];
}

export interface UserProfile {
  userId: string;
  personal: PersonalSection;
  education: EducationSection;
  professional: ProfessionalSection;
  socials: SocialsSection;
  interests: InterestsSection;
  updatedAt: string;
}
