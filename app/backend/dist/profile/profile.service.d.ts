import { UserProfileRepository, UserAnswersRepository } from "../database/repositories";
export declare class ProfileService {
    private readonly profile;
    private readonly answers;
    constructor(profile: UserProfileRepository, answers: UserAnswersRepository);
    getProfile(): Promise<import("../database/repositories/user-profile.repository").UserProfileRow | undefined>;
    upsertProfile(data: Record<string, unknown>): Promise<import("../database/repositories/user-profile.repository").UserProfileRow | undefined>;
    getAnswers(): Promise<import("../database/repositories/user-answers.repository").UserAnswerRow[]>;
    getAnswer(id: string): Promise<import("../database/repositories/user-answers.repository").UserAnswerRow | undefined>;
    createAnswer(input: {
        category: string;
        question: string;
        answer: string;
        tagsJson?: string;
    }): Promise<import("../database/repositories/user-answers.repository").UserAnswerRow | undefined>;
    updateAnswer(id: string, data: Record<string, unknown>): Promise<void>;
    deleteAnswer(id: string): Promise<void>;
}
