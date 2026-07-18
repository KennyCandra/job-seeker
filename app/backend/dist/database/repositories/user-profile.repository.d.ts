import { DataSource } from "typeorm";
export type UserProfileRow = {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    portfolio: string;
    github: string;
    headline: string;
    summary: string;
    skillsJson: string;
    experienceJson: string;
    projectsJson: string;
    educationJson: string;
    preferencesJson: string;
    createdAt: string;
    updatedAt: string;
};
export declare class UserProfileRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    get(): Promise<UserProfileRow | undefined>;
    upsert(data: Partial<UserProfileRow>): Promise<void>;
}
