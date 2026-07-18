"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAtsMigration = detectAtsMigration;
const paths_1 = require("../../common/paths");
const PROBE_TIMEOUT_MS = 15000;
const CANDIDATE_ATS = ["greenhouse", "lever", "ashby"];
async function probeFetch(url, init) {
    try {
        return await fetch(url, { ...init, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    }
    catch {
        return null;
    }
}
async function tryGreenhouse(companySlug) {
    const endpoint = (0, paths_1.endpointForAts)(companySlug, "greenhouse");
    const res = await probeFetch(endpoint);
    if (!res || !res.ok)
        return null;
    let body;
    try {
        body = await res.json();
    }
    catch {
        return null;
    }
    const jobs = body?.jobs;
    if (!Array.isArray(jobs))
        return null;
    return { ats: "greenhouse", endpoint, rawJobs: jobs.map((raw) => ({ id: String(raw.id), raw })) };
}
async function tryLever(companySlug) {
    const endpoint = (0, paths_1.endpointForAts)(companySlug, "lever");
    const res = await probeFetch(endpoint);
    if (!res || !res.ok)
        return null;
    let body;
    try {
        body = await res.json();
    }
    catch {
        return null;
    }
    if (!Array.isArray(body))
        return null;
    return { ats: "lever", endpoint, rawJobs: body.map((raw) => ({ id: String(raw.id), raw })) };
}
async function tryAshby(companySlug) {
    const endpoint = (0, paths_1.endpointForAts)(companySlug, "ashby");
    const res = await probeFetch(endpoint);
    if (!res || !res.ok)
        return null;
    let body;
    try {
        body = await res.json();
    }
    catch {
        return null;
    }
    const jobs = body?.jobs;
    if (!Array.isArray(jobs))
        return null;
    return { ats: "ashby", endpoint, rawJobs: jobs.map((raw) => ({ id: String(raw.id), raw })) };
}
const PROBES = {
    greenhouse: tryGreenhouse,
    lever: tryLever,
    ashby: tryAshby,
};
async function detectAtsMigration(companySlug, prevAts) {
    const candidates = CANDIDATE_ATS.filter((ats) => ats !== prevAts);
    const attempts = [];
    for (const ats of candidates) {
        const endpoint = (0, paths_1.endpointForAts)(companySlug, ats);
        try {
            const match = await PROBES[ats](companySlug);
            attempts.push({ ats, endpoint, matched: !!match });
            if (match)
                return { match, attempts };
        }
        catch {
            attempts.push({ ats, endpoint, matched: false });
        }
    }
    return { match: null, attempts };
}
//# sourceMappingURL=migration-probe.js.map