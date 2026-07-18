import type { UserProfileRow } from "../database/repositories/user-profile.repository";
import type { UserAnswerRow } from "../database/repositories/user-answers.repository";

export type ApplicantProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedin: string;
  website: string;
  city: string;
  country: string;
  headline: string;
  targetRoles: string;
  summary: string;
  resumePath: string;
  coverLetterPath: string;
  requiresSponsorship: string;
  authorizedCountries: string;
  pronouns: string;
  demographicAnswers: string;
  veteranStatus: string;
  disabilityStatus: string;
  notes: string;
  rawMarkdown: string;
};

function preferenceValue(profile: UserProfileRow | undefined, key: string): string {
  if (!profile?.preferencesJson) return "";
  try {
    const prefs = JSON.parse(profile.preferencesJson);
    const value = prefs?.[key];
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

function profileMarkdown(profile: UserProfileRow | undefined): string {
  if (!profile) return "";
  const lines = [
    `Name: ${profile.fullName}`,
    `Email: ${profile.email}`,
    `Phone: ${profile.phone}`,
    `LinkedIn: ${profile.linkedin}`,
    `Website: ${profile.portfolio || profile.github}`,
    `Headline: ${profile.headline}`,
    `Summary: ${profile.summary}`,
    `Location: ${profile.location}`,
  ];
  return lines.filter((line) => !line.endsWith(": ")).join("\n");
}

/**
 * Builds the applicant profile the apply runner fills forms with, plus a
 * markdown rendering of the saved answer bank for AI-answered free-text
 * questions. Pure — the caller (ApplyProcessor) already holds the profile
 * and answers rows via injected repositories.
 */
export function buildApplicantProfile(
  profile: UserProfileRow | undefined,
  answers: UserAnswerRow[],
): { profile: ApplicantProfile; answersMarkdown: string } {
  const rawMarkdown = profileMarkdown(profile);

  const [personalCity, ...personalCountryParts] = (profile?.location || "")
    .replace(/\([^)]*\)/g, "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const profileName = profile?.fullName || "";
  const [profileFirstName, ...profileLastNameParts] = profileName.split(/\s+/).filter(Boolean);

  const answersMarkdown = answers
    .map((item) => [`Category: ${item.category}`, `Question: ${item.question}`, `Answer: ${item.answer}`].join("\n"))
    .join("\n\n");

  const applicantProfile: ApplicantProfile = {
    firstName: profileFirstName || "",
    lastName: profileLastNameParts.join(" ") || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    linkedin: profile?.linkedin || "",
    website: profile?.portfolio || profile?.github || "",
    city: personalCity || "",
    country: personalCountryParts.join(", ") || "",
    headline: profile?.headline || "",
    targetRoles: preferenceValue(profile, "targetRoles") || preferenceValue(profile, "target_roles"),
    summary: profile?.summary || "",
    resumePath: preferenceValue(profile, "resumePath") || preferenceValue(profile, "resume_path"),
    coverLetterPath: preferenceValue(profile, "coverLetterPath") || preferenceValue(profile, "cover_letter_path"),
    requiresSponsorship: preferenceValue(profile, "requiresSponsorship"),
    authorizedCountries: preferenceValue(profile, "authorizedCountries"),
    pronouns: preferenceValue(profile, "pronouns"),
    demographicAnswers: preferenceValue(profile, "demographicAnswers"),
    veteranStatus: preferenceValue(profile, "veteranStatus"),
    disabilityStatus: preferenceValue(profile, "disabilityStatus"),
    notes: preferenceValue(profile, "notes"),
    rawMarkdown,
  };

  return { profile: applicantProfile, answersMarkdown };
}
