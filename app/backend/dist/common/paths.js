"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATES_DIR = exports.FRONTEND_DIST = exports.JOBS_DIR = exports.SKILLS_DIR = exports.OUTPUT_DIR = exports.DATA_DIR = exports.APP_ROOT = void 0;
exports.slug = slug;
exports.boardUrlForAts = boardUrlForAts;
exports.endpointForAts = endpointForAts;
exports.jobDirForCompany = jobDirForCompany;
exports.resolveContainedPath = resolveContainedPath;
const path_1 = require("path");
const fs_1 = require("fs");
function findRepoRoot(start) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
        if ((0, fs_1.existsSync)((0, path_1.join)(dir, "docker-compose.yml")) && (0, fs_1.existsSync)((0, path_1.join)(dir, "app")))
            return dir;
        const parent = (0, path_1.resolve)(dir, "..");
        if (parent === dir)
            break;
        dir = parent;
    }
    return (0, path_1.resolve)(start, "..", "..", "..", "..");
}
exports.APP_ROOT = findRepoRoot(__dirname);
exports.DATA_DIR = process.env.DATA_DIR ? (0, path_1.resolve)(process.env.DATA_DIR) : (0, path_1.join)(exports.APP_ROOT, "data");
exports.OUTPUT_DIR = (0, path_1.join)(exports.APP_ROOT, "output");
exports.SKILLS_DIR = process.env.SKILLS_DIR ? (0, path_1.resolve)(process.env.SKILLS_DIR) : (0, path_1.join)(exports.APP_ROOT, "app", "skills");
exports.JOBS_DIR = (0, path_1.join)(exports.DATA_DIR, "jobs");
exports.FRONTEND_DIST = process.env.FRONTEND_DIST
    ? (0, path_1.resolve)(process.env.FRONTEND_DIST)
    : (0, path_1.join)(exports.APP_ROOT, "app", "frontend", "dist");
exports.TEMPLATES_DIR = process.env.TEMPLATES_DIR ? (0, path_1.resolve)(process.env.TEMPLATES_DIR) : (0, path_1.join)(exports.APP_ROOT, "templates");
function slug(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
function boardUrlForAts(s, ats) {
    switch (ats) {
        case "greenhouse":
            return `https://boards.greenhouse.io/${s}`;
        case "lever":
            return `https://jobs.lever.co/${s}`;
        case "ashby":
            return `https://jobs.ashbyhq.com/${s}`;
        case "custom":
        default:
            return "manual";
    }
}
function endpointForAts(s, ats) {
    switch (ats) {
        case "greenhouse":
            return `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`;
        case "lever":
            return `https://api.lever.co/v0/postings/${s}?mode=json`;
        case "ashby":
            return `https://api.ashbyhq.com/posting-api/job-board/${s}?includeCompensation=true`;
        case "custom":
        default:
            return "manual";
    }
}
function jobDirForCompany(companySlug) {
    return (0, path_1.join)(exports.JOBS_DIR, slug(companySlug));
}
function resolveContainedPath(baseDir, relativePath) {
    const resolved = (0, path_1.resolve)(baseDir, relativePath);
    const base = (0, path_1.resolve)(baseDir);
    if (resolved !== base && !resolved.startsWith(base + path_1.sep)) {
        return null;
    }
    return resolved;
}
//# sourceMappingURL=paths.js.map