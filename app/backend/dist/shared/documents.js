"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderApplicationMarkdown = renderApplicationMarkdown;
exports.generateDocument = generateDocument;
exports.extractJobFromText = extractJobFromText;
const path_1 = require("path");
const client_1 = require("./client");
const utils_1 = require("./utils");
const llm_1 = require("./llm");
const prompts_1 = require("./prompts");
const paths_1 = require("../common/paths");
function renderApplicationMarkdown(job, application) {
    return [
        "# Application Package",
        "",
        "## Job",
        `- Title: ${job.title}`,
        `- Company: ${job.company}`,
        `- Location: ${job.location}`,
        `- URL: ${job.url}`,
        "",
        "## Cover Letter",
        application.cover_letter,
        "",
        "## Email",
        `Subject: ${application.email_subject}`,
        "",
        application.email_body,
    ].join("\n");
}
async function generateDocument(docType, job, customInstruction) {
    const docsMd = (0, utils_1.readText)((0, path_1.join)(paths_1.SKILLS_DIR, "documents.md"));
    const client = (0, client_1.createClient)();
    const prompt = (0, prompts_1.buildDocumentPrompt)(docType, job, docsMd, customInstruction);
    const result = await client.completeJson(prompt.system, prompt.user);
    const parsed = (0, llm_1.parseJsonFromText)(result);
    return parsed.content || result;
}
async function extractJobFromText(text) {
    const client = (0, client_1.createClient)();
    const prompt = (0, prompts_1.buildExtractPrompt)(text);
    const result = await client.completeJson(prompt.system, prompt.user);
    const data = (0, llm_1.parseJsonFromText)(result);
    return {
        id: `manual-${Date.now()}`,
        site: "manual",
        title: data.title || "Unknown Position",
        company: data.company || "Unknown Company",
        location: data.location || "Unknown",
        url: data.url || "",
        description: (data.description || text).slice(0, 2000),
        posted_at: new Date().toISOString(),
    };
}
//# sourceMappingURL=documents.js.map