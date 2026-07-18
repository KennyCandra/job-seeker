import { ConfigService } from "@nestjs/config";
import { JobsRepository, JobDocumentsRepository, UserProfileRepository, UserAnswersRepository } from "../database/repositories";
import { LatexService } from "./latex.service";
import type { EnvConfig } from "../config/env";
export type GeneratedDocument = {
    id: string;
    jobId: string;
    type: string;
    status: string;
    content: string;
    filePath: string;
    downloadUrl: string | null;
    createdAt: string;
    updatedAt: string;
};
export declare class GeneratorService {
    private readonly config;
    private readonly jobs;
    private readonly documents;
    private readonly profile;
    private readonly userAnswers;
    private readonly latex;
    private readonly logger;
    private readonly client;
    constructor(config: ConfigService<EnvConfig>, jobs: JobsRepository, documents: JobDocumentsRepository, profile: UserProfileRepository, userAnswers: UserAnswersRepository, latex: LatexService);
    list(jobId: string): Promise<GeneratedDocument[]>;
    get(jobId: string, documentId: string): Promise<GeneratedDocument>;
    download(jobId: string, documentId: string): Promise<{
        filePath: string;
        fileName: string;
        contentType: string;
    }>;
    generate(jobId: string, type: string, force?: boolean): Promise<{
        exists: boolean;
        document?: GeneratedDocument;
        message: string;
    }>;
    private generateResumeForJob;
    private generateApplicationForJob;
    private getOrGenerateResume;
    private generateCv;
    private generateCoverLetter;
    private generateRecommendation;
    private serialize;
}
