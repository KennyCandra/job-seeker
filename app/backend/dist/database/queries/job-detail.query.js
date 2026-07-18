"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobDetail = getJobDetail;
async function getJobDetail(pg, jobId) {
    const jobRows = (await pg.query(`SELECT j.id, c.slug AS "companySlug", c.name AS "companyName", c.ats, j.external_id AS "externalId", j.title, j.location, j.url, j.description, j.status, j.created_at AS "createdAt", j.updated_at AS "updatedAt"
     FROM jobs j INNER JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`, [jobId]));
    const job = jobRows[0];
    if (!job)
        return null;
    const filterRows = (await pg.query(`SELECT id, verdict, score, reasons, must_have_hits AS "mustHaveHits", missing_items AS "missingItems", model, prompt_version AS "promptVersion", created_at AS "createdAt"
     FROM job_filters WHERE job_id = $1 ORDER BY created_at DESC, id ASC`, [jobId]));
    const documentRows = (await pg.query(`SELECT id, type, status, content, file_path AS "filePath", created_at AS "createdAt" FROM job_documents WHERE job_id = $1 ORDER BY created_at DESC, id ASC`, [jobId]));
    const applicationRows = (await pg.query(`SELECT id, status, score, documents, notes, created_at AS "createdAt", updated_at AS "updatedAt" FROM applications WHERE job_id = $1 LIMIT 1`, [jobId]));
    const filters = filterRows.map((filter) => ({
        ...filter,
        reasons: safeJsonParse(filter.reasons, []),
        mustHaveHits: safeJsonParse(filter.mustHaveHits, []),
        missingItems: safeJsonParse(filter.missingItems, []),
    }));
    const latestFilter = filters.find((filter) => !isSmartFilter(filter)) ?? null;
    const latestSmartFilter = filters.find(isSmartFilter) ?? null;
    const canSmartFilter = filters.some((filter) => filter.verdict === "accept" && !isSmartFilter(filter));
    return {
        ...job,
        latestFilter,
        latestSmartFilter,
        canSmartFilter,
        documents: documentRows,
        application: applicationRows[0] ?? null,
    };
}
function isSmartFilter(filter) {
    return filter.promptVersion === "smart-filter-v1" || filter.id.startsWith("smart-filter-");
}
function safeJsonParse(value, fallback) {
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
//# sourceMappingURL=job-detail.query.js.map