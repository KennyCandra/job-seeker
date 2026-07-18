import { z } from "zod";

const experienceItem = z.object({
  title: z.string(),
  company: z.string(),
  dates: z.string(),
  bullets: z.array(z.string()),
});

const skillCategory = z.object({
  category: z.string(),
  items: z.array(z.string()),
});

const projectItem = z.object({
  name: z.string(),
  link: z.string().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

export const resumeSchema = z.object({
  experience: z.array(experienceItem),
  skills: z.union([z.array(z.string()), z.array(skillCategory)]),
  projects: z.array(projectItem).optional(),
});

export const applicationSchema = z.object({
  cover_letter: z.string(),
  email_subject: z.string(),
  email_body: z.string(),
});
