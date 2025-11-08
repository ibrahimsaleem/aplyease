import type { ClientProfile } from "@/types";

/**
 * Check if a client profile has all required fields completed
 */
export function isProfileComplete(profile: ClientProfile | null | undefined): boolean {
  if (!profile) return false;

  // Check required fields based on the database schema
  const requiredFields = [
    profile.fullName,
    profile.phoneNumber,
    profile.mailingAddress,
    profile.situation,
    profile.desiredTitles,
    profile.workAuthorization,
    profile.sponsorshipAnswer,
  ];

  // All required fields must be non-empty strings
  return requiredFields.every(field => 
    typeof field === 'string' && field.trim().length > 0
  );
}

/**
 * Get a list of missing required fields for display to the user
 */
export function getMissingRequiredFields(profile: ClientProfile | null | undefined): string[] {
  if (!profile) {
    return [
      "Full Name",
      "Phone Number", 
      "Mailing Address",
      "Current Situation",
      "Desired Job Titles",
      "Work Authorization",
      "Sponsorship Answer"
    ];
  }

  const missing: string[] = [];

  if (!profile.fullName?.trim()) missing.push("Full Name");
  if (!profile.phoneNumber?.trim()) missing.push("Phone Number");
  if (!profile.mailingAddress?.trim()) missing.push("Mailing Address");
  if (!profile.situation?.trim()) missing.push("Current Situation");
  if (!profile.desiredTitles?.trim()) missing.push("Desired Job Titles");
  if (!profile.workAuthorization?.trim()) missing.push("Work Authorization");
  if (!profile.sponsorshipAnswer?.trim()) missing.push("Sponsorship Answer");

  return missing;
}
