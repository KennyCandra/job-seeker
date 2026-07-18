import type { JobRecord, TailoredResumeContent } from "./types";
export declare function buildFilterPrompt(job: JobRecord, filterMd: string, targetCompanies?: string[]): {
    system: string;
    user: string;
};
export declare function buildResumePrompt(job: JobRecord, cvInstructions: string, profileMd: string): {
    system: string;
    user: string;
};
export declare function buildApplicationPrompt(job: JobRecord, resume: TailoredResumeContent, appPrefs: string): {
    system: string;
    user: string;
};
export declare function buildDocumentPrompt(docType: "recommendation" | "custom", job: JobRecord, docsContext: string, customInstruction?: string): {
    system: string;
    user: string;
};
export declare function getNormalFilterPrompt(job: JobRecord, userAnswers: {
    question: string;
    answer: string;
}[]): {
    system: string;
    user: string;
};
export declare function getSmartFilterPrompt(job: JobRecord, userAnswers: {
    question: string;
    answer: string;
}[]): {
    system: string;
    user: string;
};
export declare function buildExtractPrompt(text: string): {
    system: string;
    user: string;
};
