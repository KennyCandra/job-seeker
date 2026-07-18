"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.structureDataForLLM = structureDataForLLM;
exports.getApplicationPrefsForLlm = getApplicationPrefsForLlm;
const utils_1 = require("./utils");
const paths_1 = require("../common/paths");
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function structureDataForLLM(data) {
    const lines = [];
    const skills = asArray(data.skills);
    if (skills.length) {
        lines.push("## Skills");
        for (const s of skills) {
            if (typeof s === "string")
                lines.push(`- ${s}`);
            else if (s?.category && s?.items)
                lines.push(`- ${s.category}: ${asArray(s.items).join(", ")}`);
        }
        lines.push("");
    }
    const experience = asArray(data.experience);
    if (experience.length) {
        lines.push("## Experience");
        for (const e of experience) {
            lines.push(`### ${e.title} at ${e.company}`);
            if (e.dates)
                lines.push(`*${e.dates}*`);
            asArray(e.bullets).forEach((b) => lines.push(`- ${b}`));
            lines.push("");
        }
    }
    const projects = asArray(data.projects);
    if (projects.length) {
        lines.push("## Projects");
        for (const p of projects) {
            lines.push(`### ${p.name}${p.link ? ` (${p.link})` : ""}`);
            if (p.description)
                lines.push(p.description);
            asArray(p.highlights).forEach((h) => lines.push(`- ${h}`));
            lines.push("");
        }
    }
    return lines.join("\n");
}
function getApplicationPrefsForLlm(profile, answers = []) {
    if (!profile) {
        try {
            return (0, utils_1.readText)(paths_1.SKILLS_DIR + "/application_prefs.md");
        }
        catch {
            return "You are preparing application text for a job based on the resume and job description. Return JSON only with keys cover_letter, email_subject, email_body.";
        }
    }
    const lines = [
        "# Application Context",
        "",
        "Use the saved profile and answers below as the source of truth for application materials.",
        "Return the requested JSON only.",
        "",
    ];
    if (profile.preferencesJson && profile.preferencesJson !== "{}") {
        lines.push("## Preferences");
        try {
            const prefs = JSON.parse(profile.preferencesJson);
            for (const [key, value] of Object.entries(prefs)) {
                lines.push(`- ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
            }
        }
        catch {
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
//# sourceMappingURL=personal.js.map