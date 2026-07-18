"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFilterPrompt = buildFilterPrompt;
exports.buildResumePrompt = buildResumePrompt;
exports.buildApplicationPrompt = buildApplicationPrompt;
exports.buildDocumentPrompt = buildDocumentPrompt;
exports.getNormalFilterPrompt = getNormalFilterPrompt;
exports.getSmartFilterPrompt = getSmartFilterPrompt;
exports.buildExtractPrompt = buildExtractPrompt;
const path_1 = require("path");
const utils_1 = require("./utils");
const paths_1 = require("../common/paths");
function readSkill(name) {
    try {
        return (0, utils_1.readText)((0, path_1.join)(paths_1.SKILLS_DIR, name));
    }
    catch {
        return "";
    }
}
function buildFilterPrompt(job, filterMd, targetCompanies) {
    const system = filterMd || "You are a strict job filter. Return JSON only.";
    const targetLine = targetCompanies?.length
        ? `\nPriority target companies: ${targetCompanies.join(", ")}.`
        : "";
    const user = [
        `Evaluate the following job and return ONLY JSON.`,
        ``,
        `Job title: ${job.title}`,
        `Company: ${job.company}`,
        `Location: ${job.location}`,
        `URL: ${job.url}`,
        ``,
        `Description:`,
        job.description.slice(0, 6000),
        targetLine,
        ``,
        `Respond with JSON only: { "verdict": "accept"|"reject", "score": 0-100, "reasons": [string], "must_have_hits": [string], "missing": [string] }`,
    ].join("\n");
    return { system, user };
}
function buildResumePrompt(job, cvInstructions, profileMd) {
    const system = cvInstructions ||
        "Return JSON only. Select and rewrite dynamic resume sections (skills, experience, projects) for the job.";
    const user = [
        `Job:`,
        `Title: ${job.title}`,
        `Company: ${job.company}`,
        `Location: ${job.location}`,
        `Description: ${job.description.slice(0, 4000)}`,
        ``,
        `Candidate profile:`,
        profileMd,
    ].join("\n");
    return { system, user };
}
function buildApplicationPrompt(job, resume, appPrefs) {
    const system = appPrefs ||
        "You prepare application text for a job based on the resume and job description. Return JSON only.";
    const user = [
        `Job: ${job.title} at ${job.company}`,
        `Location: ${job.location}`,
        `Description: ${job.description.slice(0, 3000)}`,
        ``,
        `Resume:`,
        JSON.stringify(resume).slice(0, 4000),
    ].join("\n");
    return { system, user };
}
function buildDocumentPrompt(docType, job, docsContext, customInstruction) {
    const system = docsContext || "Generate the requested application document. Return JSON only.";
    const user = customInstruction
        ? customInstruction
        : [
            `Document type: ${docType}`,
            `Job: ${job.title} at ${job.company}`,
            `Location: ${job.location}`,
            `Description: ${job.description.slice(0, 3000)}`,
        ].join("\n");
    return { system, user };
}
function getNormalFilterPrompt(job, userAnswers) {
    const system = "You are an expert technical recruiter. Evaluate how well a job matches a candidate. " +
        "Return ONLY valid JSON with no markdown: " +
        '{ "category": "strong"|"good"|"weak"|"no-fit", "score": number 0-100, "recommendation": "apply"|"consider"|"skip", "reason": string }';
    const userAnswersText = userAnswers.length
        ? userAnswers.map((a) => `- ${a.question}: ${a.answer}`).join("\n")
        : "(no candidate profile answers provided)";
    const user = [
        `Job:`,
        `Title: ${job.title}`,
        `Company: ${job.company}`,
        `Location: ${job.location}`,
        `Description: ${job.description.slice(0, 6000)}`,
        ``,
        `Candidate profile answers:`,
        userAnswersText,
    ].join("\n");
    return { system, user };
}
function getSmartFilterPrompt(job, userAnswers) {
    const system = "You are a senior hiring-manager reviewer performing a final fit pass on jobs already accepted by a basic filter. " +
        "Return ONLY valid JSON with no markdown: " +
        '{ "category": "strong"|"good"|"weak"|"no-fit", "score": number 0-100, "recommendation": "apply"|"consider"|"skip", "reason": string }';
    const userAnswersText = userAnswers.length
        ? userAnswers.map((a) => `- ${a.question}: ${a.answer}`).join("\n")
        : "(no candidate profile answers provided)";
    const user = [
        `Job:`,
        `Title: ${job.title}`,
        `Company: ${job.company}`,
        `Location: ${job.location}`,
        `Description: ${job.description.slice(0, 6000)}`,
        ``,
        `Candidate profile answers:`,
        userAnswersText,
    ].join("\n");
    return { system, user };
}
function buildExtractPrompt(text) {
    const system = "Extract a job posting from the pasted text. Return JSON only with shape: " +
        '{ "title": string, "company": string, "location": string, "url": string, "description": string }';
    const user = text.slice(0, 6000);
    return { system, user };
}
//# sourceMappingURL=prompts.js.map