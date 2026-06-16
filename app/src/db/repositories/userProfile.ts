import { eq } from "drizzle-orm";
import { Repository } from "../repository";
import { userProfile } from "../schema";

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

export type UpdateUserProfileInput = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  portfolio?: string;
  github?: string;
  headline?: string;
  summary?: string;
  skillsJson?: string;
  experienceJson?: string;
  projectsJson?: string;
  educationJson?: string;
  preferencesJson?: string;
};

export class UserProfileRepository extends Repository {
  async get(): Promise<UserProfileRow | undefined> {
    const [row] = await this.db.select().from(userProfile).where(eq(userProfile.id, "default")).limit(1);
    return row as UserProfileRow | undefined;
  }

  async upsert(input: UpdateUserProfileInput): Promise<void> {
    const now = new Date().toISOString();
    await this.db.insert(userProfile).values({
      id: "default",
      fullName: input.fullName ?? "",
      email: input.email ?? "",
      phone: input.phone ?? "",
      location: input.location ?? "",
      linkedin: input.linkedin ?? "",
      portfolio: input.portfolio ?? "",
      github: input.github ?? "",
      headline: input.headline ?? "",
      summary: input.summary ?? "",
      skillsJson: input.skillsJson ?? "[]",
      experienceJson: input.experienceJson ?? "[]",
      projectsJson: input.projectsJson ?? "[]",
      educationJson: input.educationJson ?? "[]",
      preferencesJson: input.preferencesJson ?? "{}",
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: userProfile.id,
      set: {
        ...input,
        updatedAt: now,
      },
    });
  }
}
