import { ProfileService } from "./profile.service";
export declare class ProfileController {
    private readonly profile;
    constructor(profile: ProfileService);
    get(): Promise<{
        ok: boolean;
        profile: import("../database/repositories/user-profile.repository").UserProfileRow | null;
    }>;
    put(body: unknown): Promise<{
        ok: boolean;
        profile: import("../database/repositories/user-profile.repository").UserProfileRow | undefined;
    }>;
    answers(): Promise<{
        ok: boolean;
        answers: import("../database/repositories/user-answers.repository").UserAnswerRow[];
    }>;
    createAnswer(body: {
        category: string;
        question: string;
        answer: string;
        tagsJson?: string;
    }): Promise<{
        ok: boolean;
        answer: import("../database/repositories/user-answers.repository").UserAnswerRow | undefined;
    }>;
    updateAnswer(id: string, body: Record<string, unknown>): Promise<{
        ok: boolean;
        answer: import("../database/repositories/user-answers.repository").UserAnswerRow | undefined;
    }>;
    deleteAnswer(id: string): Promise<{
        ok: boolean;
    }>;
}
