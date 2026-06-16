import { join } from "path";
import { DATA_DIR } from "../shared/paths";
import { userAnswers, userProfile } from "../db";

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

export const DEFAULT_PROFILE_PATH = join(DATA_DIR, "applicant", "profile.md");
export const DEFAULT_ANSWERS_PATH = join(DATA_DIR, "applicant", "answers.md");

export function resolveProfilePath(override?: string): string {
  return override || DEFAULT_PROFILE_PATH;
}

export async function loadProfileMarkdown(path: string): Promise<string> {
  return profileMarkdownFromDb();
}

export function normalizeProfileKey(value: string): string {
  return value.toLowerCase().replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
}

export function parseProfileValues(markdown: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:[-*]\s*)?([^:#]+?)\s*:\s*(.*?)\s*$/);
    if (!match) continue;
    const key = normalizeProfileKey(match[1]);
    const value = match[2].trim();
    if (key && value) values.set(key, value);
  }
  return values;
}

export function getProfileValue(profileValues: Map<string, string>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = profileValues.get(normalizeProfileKey(key));
    if (value) return value;
  }
  return fallback;
}

export async function parseProfile(path?: string): Promise<ApplicantProfile> {
  const rawMarkdown = await profileMarkdownFromDb();
  const profile = await userProfile.instance.get();
  const values = parseProfileValues(rawMarkdown);

  const [personalCity, ...personalCountryParts] = (profile?.location || "").replace(/\([^)]*\)/g, "").split(",").map((part) => part.trim()).filter(Boolean);
  const profileName = profile?.fullName || getProfileValue(values, ["name", "full name"]);
  const [profileFirstName, ...profileLastNameParts] = profileName.split(/\s+/).filter(Boolean);

  return {
    firstName: getProfileValue(values, ["first name", "given name"], profileFirstName || ""),
    lastName: getProfileValue(values, ["last name", "family name", "surname"], profileLastNameParts.join(" ") || ""),
    email: profile?.email || getProfileValue(values, ["email", "email address"]),
    phone: profile?.phone || getProfileValue(values, ["phone", "phone number", "mobile"]),
    linkedin: profile?.linkedin || getProfileValue(values, ["linkedin", "linkedin profile"]),
    website: profile?.portfolio || profile?.github || getProfileValue(values, ["website", "portfolio", "personal website"]),
    city: getProfileValue(values, ["city", "location city"], personalCity || ""),
    country: getProfileValue(values, ["country"], personalCountryParts.join(", ") || ""),
    headline: profile?.headline || getProfileValue(values, ["headline", "title"]),
    targetRoles: await getPreferenceValue("targetRoles") || await getPreferenceValue("target_roles") || getProfileValue(values, ["target roles", "target role"]),
    summary: profile?.summary || getProfileValue(values, ["summary", "background"]),
    resumePath: await getPreferenceValue("resumePath") || await getPreferenceValue("resume_path") || getProfileValue(values, ["resume path", "cv path", "resume", "cv"]),
    coverLetterPath: await getPreferenceValue("coverLetterPath") || await getPreferenceValue("cover_letter_path") || getProfileValue(values, ["cover letter path", "cover letter"]),
    requiresSponsorship: getProfileValue(values, ["requires sponsorship", "sponsorship"]),
    authorizedCountries: getProfileValue(values, ["authorized countries"]),
    pronouns: getProfileValue(values, ["pronouns"]),
    demographicAnswers: getProfileValue(values, ["demographic answers"]),
    veteranStatus: getProfileValue(values, ["veteran status"]),
    disabilityStatus: getProfileValue(values, ["disability status"]),
    notes: getProfileValue(values, ["application notes", "notes"]),
    rawMarkdown,
  };
}

export async function loadAnswersMarkdown(path?: string): Promise<string> {
  const answers = await userAnswers.instance.getAll();
  return answers.map((item) => [
    `Category: ${item.category}`,
    `Question: ${item.question}`,
    `Answer: ${item.answer}`,
  ].join("\n")).join("\n\n");
}

async function profileMarkdownFromDb(): Promise<string> {
  const profile = await userProfile.instance.get();
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

async function getPreferenceValue(key: string): Promise<string> {
  const profile = await userProfile.instance.get();
  if (!profile?.preferencesJson) return "";
  try {
    const prefs = JSON.parse(profile.preferencesJson);
    const value = prefs?.[key];
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}
