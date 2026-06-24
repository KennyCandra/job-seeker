import { userAnswers, userProfile } from "../db";
import type { StructuredDataForLlm, RawProfileJsonForLlm } from "@shared/types";

export async function structureDataForLLM({
  skills,
  experience,
  projects,
}: StructuredDataForLlm): Promise<string> {
  const lines: string[] = [];
  if (skills && skills.length > 0) {
    try {
      if (Array.isArray(skills) && skills.length > 0) {
        lines.push("## Skills");
        for (const s of skills) {
          if (typeof s === "string") lines.push(`- ${s}`);
          else if (s.category && s.items)
            lines.push(`- ${s.category}: ${s.items.join(", ")}`);
        }
        lines.push("");
      }
    } catch {}
  }

  if (experience && experience.length > 0) {
    try {
      if (Array.isArray(experience) && experience.length > 0) {
        lines.push("## Experience");
        for (const e of experience) {
          lines.push(`### ${e.title} at ${e.company}`);
          if (e.dates) lines.push(`*${e.dates}*`);
          if (e.bullets) e.bullets.forEach((b: string) => lines.push(`- ${b}`));
          lines.push("");
        }
      }
    } catch {}
  }


  if (projects && projects.length > 0) {
    try {
      if (Array.isArray(projects) && projects.length > 0) {
        lines.push("## Projects");
        for (const p of projects) {
          lines.push(`### ${p.name}${p.link ? ` (${p.link})` : ""}`);
          if (p.description) lines.push(p.description);
          if (p.highlights)
            p.highlights.forEach((h: string) => lines.push(`- ${h}`));
          lines.push("");
        }
      }
    } catch {}
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
        lines.push(
          `- ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`,
        );
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
