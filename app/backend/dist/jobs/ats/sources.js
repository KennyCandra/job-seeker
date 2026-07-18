"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobSources = exports.ashbySource = exports.leverSource = exports.greenhouseSource = void 0;
exports.greenhouseBoardSlug = greenhouseBoardSlug;
exports.leverCompanySlug = leverCompanySlug;
exports.ashbyOrgSlug = ashbyOrgSlug;
exports.getSource = getSource;
const errors_1 = require("../../common/errors");
const GREENHOUSE_LIST_ENDPOINT = (board) => `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
const GREENHOUSE_JOB_ENDPOINT = (board, id) => `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}?questions=false`;
const LEVER_POSTINGS_ENDPOINT = (company) => `https://api.lever.co/v0/postings/${company}?mode=json&includeOffices=true`;
const LEVER_POSTING_ENDPOINT = (company, id) => `https://api.lever.co/v0/postings/${company}/${id}?mode=json&additional_fields=descriptionPlain`;
const ASHBY_JOBS_ENDPOINT = "https://api.ashbyhq.com/posting-api/job-board/{org}";
async function fetchJson(url, init) {
    const res = await fetch(url, init);
    if (!res.ok)
        throw new errors_1.AppException(res.status, `ATS fetch failed: ${res.status} for ${url}`);
    return (await res.json());
}
function greenhouseBoardSlug(url) {
    const api = url.match(/boards-api\.greenhouse\.io\/v1\/boards\/([^/?#]+)/i);
    if (api)
        return api[1];
    const board = url.match(/(?:job-)?boards\.greenhouse\.io\/([^/?#]+)/i);
    if (board)
        return board[1];
    return url;
}
function leverCompanySlug(url) {
    const api = url.match(/api\.lever\.co\/v0\/postings\/([^/?#]+)/i);
    if (api)
        return api[1];
    const board = url.match(/jobs\.lever\.co\/([^/?#]+)/i);
    if (board)
        return board[1];
    return url;
}
function ashbyOrgSlug(url) {
    const api = url.match(/api\.ashbyhq\.com\/posting-api\/job-board\/([^/?#]+)/i);
    if (api)
        return api[1];
    const board = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/i);
    if (board)
        return board[1];
    return url;
}
exports.greenhouseSource = {
    name: "greenhouse",
    matches(url) {
        return url.includes("greenhouse.io") || url.includes("boards.greenhouse.io") || url.includes("job-boards.greenhouse.io");
    },
    async pullJobs(url) {
        const board = greenhouseBoardSlug(url);
        const listUrl = GREENHOUSE_LIST_ENDPOINT(board);
        const data = await fetchJson(listUrl);
        return data.jobs.map((raw) => ({ id: String(raw.id), raw }));
    },
    async pullJob(url, id) {
        const board = greenhouseBoardSlug(url);
        const data = await fetchJson(GREENHOUSE_JOB_ENDPOINT(board, id));
        return data.job;
    },
    async normalize(rawJob, company) {
        const location = (rawJob.location?.name ?? "").trim();
        const descriptionPlain = (rawJob.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const applyUrl = rawJob.absolute_url ?? `https://boards.greenhouse.io/${greenhouseBoardSlug(company.endpoint ?? company.slug ?? "")}/jobs/${rawJob.id}`;
        return {
            externalId: String(rawJob.id),
            site: company.ats ?? "greenhouse",
            title: (rawJob.title ?? "").trim(),
            company: company.name ?? company.slug ?? "",
            department: (rawJob.departments?.[0]?.name ?? rawJob.department ?? "").trim(),
            location,
            url: applyUrl,
            applyUrl,
            description: descriptionPlain,
            posted_at: rawJob.updated_at ?? rawJob.published_at ?? new Date().toISOString(),
            rawData: JSON.stringify(rawJob),
        };
    },
};
exports.leverSource = {
    name: "lever",
    matches(url) {
        return url.includes("lever.co") || url.includes("jobs.lever.co");
    },
    async pullJobs(url) {
        const company = leverCompanySlug(url);
        const data = await fetchJson(LEVER_POSTINGS_ENDPOINT(company));
        return data.map((raw) => ({ id: String(raw.id), raw }));
    },
    async pullJob(url, id) {
        const company = leverCompanySlug(url);
        const data = await fetchJson(LEVER_POSTING_ENDPOINT(company, id));
        return data;
    },
    async normalize(rawJob, company) {
        const location = ((rawJob.categories?.location ?? rawJob.location ?? "").toString()).trim();
        const descriptionPlain = (rawJob.descriptionPlain ?? rawJob.description ?? "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        const applyUrl = rawJob.hostedUrl ?? rawJob.applyUrl ?? `https://jobs.lever.co/${leverCompanySlug(company.endpoint ?? company.slug ?? "")}/${rawJob.id}`;
        return {
            externalId: String(rawJob.id),
            site: company.ats ?? "lever",
            title: (rawJob.text ?? rawJob.title ?? "").trim(),
            company: company.name ?? company.slug ?? "",
            department: (rawJob.categories?.team ?? rawJob.team ?? "").trim(),
            location,
            url: applyUrl,
            applyUrl,
            description: descriptionPlain,
            posted_at: rawJob.createdAt ?? new Date().toISOString(),
            rawData: JSON.stringify(rawJob),
        };
    },
};
exports.ashbySource = {
    name: "ashby",
    matches(url) {
        return url.includes("ashbyhq.com") || url.includes("jobs.ashbyhq.com");
    },
    async pullJobs(url) {
        const org = ashbyOrgSlug(url);
        const endpoint = ASHBY_JOBS_ENDPOINT.replace("{org}", org);
        const data = await fetchJson(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
        return data.jobs.map((raw) => ({ id: String(raw.id), raw }));
    },
    async pullJob(url, id) {
        const org = ashbyOrgSlug(url);
        const endpoint = ASHBY_JOBS_ENDPOINT.replace("{org}", org);
        const data = await fetchJson(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
        return data.jobs.find((j) => String(j.id) === id) ?? null;
    },
    async normalize(rawJob, company) {
        const location = (rawJob.location?.name ?? rawJob.location ?? "").trim();
        const descriptionPlain = (rawJob.descriptionPlaintext ?? rawJob.description ?? "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        const applyUrl = rawJob.applicationUrl ?? `https://jobs.ashbyhq.com/${ashbyOrgSlug(company.endpoint ?? company.slug ?? "")}/${rawJob.id}`;
        return {
            externalId: String(rawJob.id),
            site: company.ats ?? "ashby",
            title: (rawJob.title ?? "").trim(),
            company: company.name ?? company.slug ?? "",
            department: (rawJob.department ?? "").trim(),
            location,
            url: applyUrl,
            applyUrl,
            description: descriptionPlain,
            posted_at: rawJob.postedAt ?? new Date().toISOString(),
            rawData: JSON.stringify(rawJob),
        };
    },
};
exports.jobSources = [exports.greenhouseSource, exports.leverSource, exports.ashbySource];
function getSource(atsUrl) {
    const source = exports.jobSources.find((s) => s.matches(atsUrl));
    if (!source) {
        throw new errors_1.AppException(400, `Unsupported ATS URL: ${atsUrl}`);
    }
    return source;
}
//# sourceMappingURL=sources.js.map