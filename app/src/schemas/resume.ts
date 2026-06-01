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

const educationItem = z.object({
  degree: z.string(),
  school: z.string(),
  year: z.string(),
});

const projectItem = z.object({
  name: z.string(),
  link: z.string().optional(),
  description: z.string().optional(),
  techStack: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  skillsUsed: z.string().optional(),
});

export const resumeSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  linkedin: z.string(),
  portfolio: z.string().optional(),
  experience: z.array(experienceItem),
  skills: z.union([z.array(z.string()), z.array(skillCategory)]),
  education: z.array(educationItem).optional().default([]),
  projects: z.array(projectItem).optional(),
});
