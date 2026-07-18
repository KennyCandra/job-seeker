"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTailoredResumeContent = normalizeTailoredResumeContent;
function normalizeTailoredResumeContent(input) {
    const skills = Array.isArray(input?.skills)
        ? input.skills
        : [];
    const experience = Array.isArray(input?.experience)
        ? input.experience.map((e) => ({
            title: String(e?.title || ""),
            company: String(e?.company || ""),
            dates: String(e?.dates || ""),
            bullets: Array.isArray(e?.bullets) ? e.bullets.map(String) : [],
        }))
        : [];
    const projects = Array.isArray(input?.projects)
        ? input.projects.map((p) => ({
            name: String(p?.name || ""),
            link: p?.link,
            description: p?.description,
            highlights: Array.isArray(p?.highlights) ? p.highlights.map(String) : [],
        }))
        : [];
    return { skills, experience, projects };
}
//# sourceMappingURL=resume.js.map