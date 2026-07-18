import { Injectable } from "@nestjs/common";
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

@Injectable()
export class UserProfileRepository {
  constructor(private readonly dataSource: DataSource) {}

  async get(): Promise<UserProfileRow | undefined> {
    const rows = await this.dataSource.query(
      `SELECT id, full_name AS "fullName", email, phone, location, linkedin, portfolio, github, headline, summary,
              skills_json AS "skillsJson", experience_json AS "experienceJson", projects_json AS "projectsJson",
              education_json AS "educationJson", preferences_json AS "preferencesJson",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM user_profile WHERE id = 'default' LIMIT 1`,
    );
    return rows[0] as UserProfileRow | undefined;
  }

  async upsert(data: Partial<UserProfileRow>): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.get();
    const merged: Record<string, unknown> = {
      id: "default",
      full_name: data.fullName ?? existing?.fullName ?? "",
      email: data.email ?? existing?.email ?? "",
      phone: data.phone ?? existing?.phone ?? "",
      location: data.location ?? existing?.location ?? "",
      linkedin: data.linkedin ?? existing?.linkedin ?? "",
      portfolio: data.portfolio ?? existing?.portfolio ?? "",
      github: data.github ?? existing?.github ?? "",
      headline: data.headline ?? existing?.headline ?? "",
      summary: data.summary ?? existing?.summary ?? "",
      skills_json: data.skillsJson ?? existing?.skillsJson ?? "[]",
      experience_json: data.experienceJson ?? existing?.experienceJson ?? "[]",
      projects_json: data.projectsJson ?? existing?.projectsJson ?? "[]",
      education_json: data.educationJson ?? existing?.educationJson ?? "[]",
      preferences_json: data.preferencesJson ?? existing?.preferencesJson ?? "{}",
      created_at: existing?.createdAt ?? now,
      updated_at: now,
    };
    const cols = Object.keys(merged);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const updateSets = cols.filter((c) => c !== "id").map((c) => `${c} = EXCLUDED.${c}`).join(", ");
    await this.dataSource.query(
      `INSERT INTO user_profile (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateSets}`,
      cols.map((c) => merged[c]),
    );
  }
}
