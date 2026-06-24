import type { TailoredResumeContent } from "./types";

export function normalizeTailoredResumeContent(raw: any): TailoredResumeContent {
  const educationArray = Array.isArray(raw.education) ? raw.education : raw.education ? [raw.education] : [];
  const experienceArray = Array.isArray(raw.experience) ? raw.experience : raw.experience ? [raw.experience] : Array.isArray(raw.work) ? raw.work : raw.work ? [raw.work] : [];
  const projectsArray = Array.isArray(raw.projects) ? raw.projects : raw.projects ? [raw.projects] : [];

  const skillsArray = (() => {
    if (!Array.isArray(raw.skills)) {
      if (raw.skills && typeof raw.skills === "object") {
        return Object.entries(raw.skills).map(([category, items]) => ({
          category,
          items: Array.isArray(items) ? items : [String(items)],
        }));
      }
      return [];
    }
    const first = raw.skills[0] || {};
    if ("keywords" in first) {
      return raw.skills.map((s: any) => ({ category: s.name || s.category || "", items: s.keywords }));
    }
    return raw.skills;
  })();

  const basics = raw.basics || raw.personal || raw.personalInfo || raw.contact || raw.personal_info || {};
  const basicsUrls = basics.urls || {};

  return {
    experience: experienceArray.map((item: any) => ({
      title: item.title || item.position || item.role || "",
      company: item.company || item.name || "",
      dates: item.dates || [item.start_date || item.startDate, item.end_date || item.endDate].filter(Boolean).join(" - ") || "",
      bullets: Array.isArray(item.bullets) ? item.bullets : Array.isArray(item.highlights) ? item.highlights : item.bullets ? [String(item.bullets)] : [],
    })),
    skills: skillsArray,
    education: educationArray.map((item: any) => {
      if (typeof item === "string") {
        const dash = item.indexOf("—") !== -1 ? "—" : item.indexOf("-") !== -1 ? "-" : null;
        if (dash) {
          const parts = item.split(dash).map((s: string) => s.trim());
          return { degree: parts[0] || "", school: parts[1]?.replace(/\(.*?\)/g, "").trim() || "", year: parts[1]?.match(/\((\d{4})\)/)?.[1] || "" };
        }
        return { degree: item, school: "", year: "" };
      }
      return {
        degree: item.degree || item.area || "",
        school: item.school || item.institution || "",
        year: String(item.year || item.endDate || ""),
      };
    }),
    projects: projectsArray.map((item: any) => ({
      name: item.name || "",
      link: item.link || item.url,
      description: item.description,
      highlights: Array.isArray(item.highlights) ? item.highlights : item.bullets,
    })),
  };
}
