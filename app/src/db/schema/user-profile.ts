import { index, pgTable, text } from "drizzle-orm/pg-core";

export const userProfile = pgTable("user_profile", {
  id: text("id").primaryKey().default("default"),
  fullName: text("full_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  location: text("location").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  portfolio: text("portfolio").notNull().default(""),
  github: text("github").notNull().default(""),
  headline: text("headline").notNull().default(""),
  summary: text("summary").notNull().default(""),
  skillsJson: text("skills_json").notNull().default("[]"),
  experienceJson: text("experience_json").notNull().default("[]"),
  projectsJson: text("projects_json").notNull().default("[]"),
  educationJson: text("education_json").notNull().default("[]"),
  preferencesJson: text("preferences_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const userAnswers = pgTable("user_answers", {
  id: text("id").primaryKey(),
  category: text("category").notNull().default(""),
  question: text("question").notNull().default(""),
  answer: text("answer").notNull().default(""),
  tagsJson: text("tags_json").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  categoryCreatedIdx: index("idx_user_answers_category_created").on(t.category, t.createdAt),
}));
