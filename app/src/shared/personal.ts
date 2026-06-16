import { userAnswers, userProfile } from "../db";

export async function getPersonalData() {
  const profile = await userProfile.instance.get();
  return {
    name: profile?.fullName || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    location: profile?.location || "",
    linkedin: profile?.linkedin || "",
    portfolio: profile?.portfolio || undefined,
    github: profile?.github || undefined,
  };
}

export async function getProfileForLlm(): Promise<string> {
  const profile = await userProfile.instance.get();
  if (!profile) return "";

  const lines: string[] = [];
  lines.push("# Candidate Profile");
  lines.push("");
  lines.push(`Name: ${profile.fullName}`);
  lines.push(`Email: ${profile.email}`);
  lines.push(`Phone: ${profile.phone}`);
  lines.push(`Location: ${profile.location}`);
  if (profile.linkedin) lines.push(`LinkedIn: ${profile.linkedin}`);
  if (profile.portfolio) lines.push(`Portfolio: ${profile.portfolio}`);
  if (profile.github) lines.push(`GitHub: ${profile.github}`);
  if (profile.headline) lines.push(`Headline: ${profile.headline}`);
  lines.push("");

  if (profile.summary) {
    lines.push("## Summary");
    lines.push(profile.summary);
    lines.push("");
  }

  if (profile.skillsJson && profile.skillsJson !== "[]") {
    try {
      const skills = JSON.parse(profile.skillsJson);
      if (Array.isArray(skills) && skills.length > 0) {
        lines.push("## Skills");
        for (const s of skills) {
          if (typeof s === "string") lines.push(`- ${s}`);
          else if (s.category && s.items) lines.push(`- ${s.category}: ${s.items.join(", ")}`);
        }
        lines.push("");
      }
    } catch { }
  }

  if (profile.experienceJson && profile.experienceJson !== "[]") {
    try {
      const exp = JSON.parse(profile.experienceJson);
      if (Array.isArray(exp) && exp.length > 0) {
        lines.push("## Experience");
        for (const e of exp) {
          lines.push(`### ${e.title} at ${e.company}`);
          if (e.dates) lines.push(`*${e.dates}*`);
          if (e.bullets) e.bullets.forEach((b: string) => lines.push(`- ${b}`));
          lines.push("");
        }
      }
    } catch { }
  }

  if (profile.educationJson && profile.educationJson !== "[]") {
    try {
      const edu = JSON.parse(profile.educationJson);
      if (Array.isArray(edu) && edu.length > 0) {
        lines.push("## Education");
        for (const e of edu) {
          lines.push(`- ${e.degree} at ${e.school}${e.year ? ` (${e.year})` : ""}`);
        }
        lines.push("");
      }
    } catch { }
  }

  if (profile.projectsJson && profile.projectsJson !== "[]") {
    try {
      const proj = JSON.parse(profile.projectsJson);
      if (Array.isArray(proj) && proj.length > 0) {
        lines.push("## Projects");
        for (const p of proj) {
          lines.push(`### ${p.name}${p.link ? ` (${p.link})` : ""}`);
          if (p.description) lines.push(p.description);
          if (p.highlights) p.highlights.forEach((h: string) => lines.push(`- ${h}`));
          if (p.techStack) lines.push(`Tech: ${p.techStack}`);
          lines.push("");
        }
      }
    } catch { }
  }

  return lines.join("\n");
}

export async function getApplicationPrefsForLlm(): Promise<string> {
  const profile = await userProfile.instance.get();
  const answers = await userAnswers.instance.getAll();
  const lines: string[] = [
    "# Application Context",
    "",
    "Use the saved profile and answers below as the source of truth for application materials.",
    "Return the requested JSON only.",
    "",
  ];

  if (profile?.preferencesJson && profile.preferencesJson !== "{}") {
    lines.push("## Preferences");
    try {
      const prefs = JSON.parse(profile.preferencesJson);
      for (const [key, value] of Object.entries(prefs)) {
        lines.push(`- ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
      }
    } catch {
      lines.push(profile.preferencesJson);
    }
    lines.push("");
  }

  if (answers.length > 0) {
    lines.push("## Saved Application Answers");
    for (const item of answers) {
      lines.push(`- Category: ${item.category}`);
      lines.push(`  Question: ${item.question}`);
      lines.push(`  Answer: ${item.answer}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
