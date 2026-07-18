"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationSchema = exports.resumeSchema = void 0;
const zod_1 = require("zod");
const experienceItem = zod_1.z.object({
    title: zod_1.z.string(),
    company: zod_1.z.string(),
    dates: zod_1.z.string(),
    bullets: zod_1.z.array(zod_1.z.string()),
});
const skillCategory = zod_1.z.object({
    category: zod_1.z.string(),
    items: zod_1.z.array(zod_1.z.string()),
});
const projectItem = zod_1.z.object({
    name: zod_1.z.string(),
    link: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    highlights: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.resumeSchema = zod_1.z.object({
    experience: zod_1.z.array(experienceItem),
    skills: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.array(skillCategory)]),
    projects: zod_1.z.array(projectItem).optional(),
});
exports.applicationSchema = zod_1.z.object({
    cover_letter: zod_1.z.string(),
    email_subject: zod_1.z.string(),
    email_body: zod_1.z.string(),
});
//# sourceMappingURL=schemas.js.map