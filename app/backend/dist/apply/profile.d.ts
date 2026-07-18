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
export declare function buildApplicantProfile(profile: UserProfileRow | undefined, answers: UserAnswerRow[]): {
    profile: ApplicantProfile;
    answersMarkdown: string;
};
