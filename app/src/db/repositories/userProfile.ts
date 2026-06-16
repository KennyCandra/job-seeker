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
  get(): UserProfileRow | undefined {
    return this.db.select().from(userProfile).where(eq(userProfile.id, "default")).get() as UserProfileRow | undefined;
  }

  upsert(input: UpdateUserProfileInput): void {
    const now = new Date().toISOString();
    const existing = this.get();
    if (existing) {
      const updates: Record<string, any> = { ...input, updatedAt: now };
      Object.keys(updates).forEach((k) => { if (updates[k] === undefined) delete updates[k]; });
      this.db.update(userProfile).set(updates).where(eq(userProfile.id, "default")).run();
    } else {
      this.db.insert(userProfile).values({
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
      }).run();
    }
  }
}
