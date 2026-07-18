import type { UserProfileRow } from "../database/repositories/user-profile.repository";
import type { UserAnswerRow } from "../database/repositories/user-answers.repository";
export declare function structureDataForLLM(data: {
    skills: unknown;
    experience: unknown;
    projects: unknown;
}): string;
export declare function getApplicationPrefsForLlm(profile?: UserProfileRow, answers?: UserAnswerRow[]): string;
