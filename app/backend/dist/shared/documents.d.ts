import type { JobRecord, ApplicationPayload } from "./types";
export declare function renderApplicationMarkdown(job: JobRecord, application: ApplicationPayload): string;
export declare function generateDocument(docType: "recommendation" | "custom", job: JobRecord, customInstruction?: string): Promise<string>;
export declare function extractJobFromText(text: string): Promise<JobRecord>;
