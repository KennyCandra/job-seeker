import type { TailoredResumeContent, SkillGroup, ExperienceItem, ProjectItem } from "./types";

export function normalizeTailoredResumeContent(input: TailoredResumeContent): TailoredResumeContent {
  const skills: string[] | SkillGroup[] = Array.isArray(input?.skills)
    ? input.skills
    : [];
  const experience: ExperienceItem[] = Array.isArray(input?.experience)
    ? input.experience.map((e) => ({
        title: String(e?.title || ""),
        company: String(e?.company || ""),
        dates: String(e?.dates || ""),
        bullets: Array.isArray(e?.bullets) ? e.bullets.map(String) : [],
      }))
    : [];
  const projects: ProjectItem[] = Array.isArray(input?.projects)
    ? input.projects.map((p) => ({
        name: String(p?.name || ""),
        link: p?.link,
        description: p?.description,
        highlights: Array.isArray(p?.highlights) ? p.highlights.map(String) : [],
      }))
    : [];

  return { skills, experience, projects };
}
