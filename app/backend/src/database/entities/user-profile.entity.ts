import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("user_profile")
export class UserProfile {
  @PrimaryColumn({ type: "text", default: "default" })
  id: string;

  @Column({ name: "full_name", type: "text", nullable: false, default: "" })
  fullName: string;

  @Column({ type: "text", nullable: false, default: "" })
  email: string;

  @Column({ type: "text", nullable: false, default: "" })
  phone: string;

  @Column({ type: "text", nullable: false, default: "" })
  location: string;

  @Column({ type: "text", nullable: false, default: "" })
  linkedin: string;

  @Column({ type: "text", nullable: false, default: "" })
  portfolio: string;

  @Column({ type: "text", nullable: false, default: "" })
  github: string;

  @Column({ type: "text", nullable: false, default: "" })
  headline: string;

  @Column({ type: "text", nullable: false, default: "" })
  summary: string;

  @Column({ name: "skills_json", type: "text", nullable: false, default: "[]" })
  skillsJson: string;

  @Column({ name: "experience_json", type: "text", nullable: false, default: "[]" })
  experienceJson: string;

  @Column({ name: "projects_json", type: "text", nullable: false, default: "[]" })
  projectsJson: string;

  @Column({ name: "education_json", type: "text", nullable: false, default: "[]" })
  educationJson: string;

  @Column({ name: "preferences_json", type: "text", nullable: false, default: "{}" })
  preferencesJson: string;

  @Column({ name: "created_at", type: "text", nullable: false })
  createdAt: string;

  @Column({ name: "updated_at", type: "text", nullable: false })
  updatedAt: string;
}
