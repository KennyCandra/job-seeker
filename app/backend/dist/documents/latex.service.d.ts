import type { ProfileData, TailoredResumeContent } from "../shared/types";
export declare class LatexService {
    private readonly logger;
    private loadTemplate;
    sanitizeLatex(text: string): string;
    private boldTech;
    private fillTemplate;
    private latexPath;
    private linkify;
    private linkifyWithLabel;
    private buildExperienceHeader;
    private buildExperienceBullets;
    private buildExperience;
    private buildSkills;
    private buildEducation;
    private buildProjects;
    buildTex(resume: TailoredResumeContent, profileData: ProfileData): string;
    compilePdf(tex: string, outputPath: string): Promise<string>;
}
