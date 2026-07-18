import { describe, it, expect } from "bun:test";
import { buildApplicantProfile } from "../src/apply/profile";
import type { UserProfileRow } from "../src/database/repositories/user-profile.repository";
import type { UserAnswerRow } from "../src/database/repositories/user-answers.repository";

function makeProfileRow(overrides: Partial<UserProfileRow> = {}): UserProfileRow {
  return {
    id: "default",
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+44 20 1234 5678",
    location: "London, United Kingdom",
    linkedin: "https://linkedin.com/in/ada",
    portfolio: "https://ada.dev",
    github: "https://github.com/ada",
    headline: "Backend Engineer",
    summary: "Analytical engine enthusiast",
    skillsJson: "[]",
    experienceJson: "[]",
    projectsJson: "[]",
    educationJson: "[]",
    preferencesJson: "{}",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("buildApplicantProfile", () => {
  it("splits full name into first/last and parses city/country from location", () => {
    const { profile } = buildApplicantProfile(makeProfileRow(), []);
    expect(profile.firstName).toBe("Ada");
    expect(profile.lastName).toBe("Lovelace");
    expect(profile.city).toBe("London");
    expect(profile.country).toBe("United Kingdom");
  });

  it("prefers portfolio over github for website", () => {
    const { profile } = buildApplicantProfile(makeProfileRow(), []);
    expect(profile.website).toBe("https://ada.dev");
  });

  it("falls back to github when portfolio is empty", () => {
    const { profile } = buildApplicantProfile(makeProfileRow({ portfolio: "" }), []);
    expect(profile.website).toBe("https://github.com/ada");
  });

  it("reads resumePath/coverLetterPath and sponsorship prefs from preferencesJson", () => {
    const row = makeProfileRow({
      preferencesJson: JSON.stringify({
        resumePath: "/data/applicant/resume.pdf",
        coverLetterPath: "/data/applicant/cover.pdf",
        requiresSponsorship: "No",
        pronouns: "she/her",
      }),
    });
    const { profile } = buildApplicantProfile(row, []);
    expect(profile.resumePath).toBe("/data/applicant/resume.pdf");
    expect(profile.coverLetterPath).toBe("/data/applicant/cover.pdf");
    expect(profile.requiresSponsorship).toBe("No");
    expect(profile.pronouns).toBe("she/her");
  });

  it("tolerates malformed preferencesJson without throwing", () => {
    const row = makeProfileRow({ preferencesJson: "{not json" });
    expect(() => buildApplicantProfile(row, [])).not.toThrow();
    const { profile } = buildApplicantProfile(row, []);
    expect(profile.resumePath).toBe("");
  });

  it("handles a missing profile row entirely", () => {
    const { profile, answersMarkdown } = buildApplicantProfile(undefined, []);
    expect(profile.firstName).toBe("");
    expect(profile.email).toBe("");
    expect(profile.rawMarkdown).toBe("");
    expect(answersMarkdown).toBe("");
  });

  it("renders saved answers as markdown blocks", () => {
    const answers: UserAnswerRow[] = [
      { id: "a1", category: "sponsorship", question: "Do you need sponsorship?", answer: "No", tagsJson: "[]", createdAt: "", updatedAt: "" },
      { id: "a2", category: "pronouns", question: "What are your pronouns?", answer: "she/her", tagsJson: "[]", createdAt: "", updatedAt: "" },
    ];
    const { answersMarkdown } = buildApplicantProfile(makeProfileRow(), answers);
    expect(answersMarkdown).toContain("Category: sponsorship");
    expect(answersMarkdown).toContain("Question: Do you need sponsorship?");
    expect(answersMarkdown).toContain("Answer: No");
    expect(answersMarkdown).toContain("Category: pronouns");
  });

  it("builds a markdown rendering of the profile for AI prompts", () => {
    const { profile } = buildApplicantProfile(makeProfileRow(), []);
    expect(profile.rawMarkdown).toContain("Name: Ada Lovelace");
    expect(profile.rawMarkdown).toContain("Email: ada@example.com");
    expect(profile.rawMarkdown).toContain("Location: London, United Kingdom");
  });
});
