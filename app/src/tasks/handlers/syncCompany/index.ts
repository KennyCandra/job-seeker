import type { HandlerFn } from "../../handler";
import { companies, jobs } from "../../../db";
import { normalFilterJob, saveNormalFilterResult } from "../../../filter";
import { syncCompany } from "../../../jobs";
import { loadSearchConfig } from "../../../shared/config";

export const syncCompanyHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled } = ctx;
  const companySlug = String(payload.companySlug || "");
  const doFilter = payload.filter === true;

  if (!companySlug) throw new Error("companySlug is required");
  log("info", `Syncing company: ${companySlug}`);

  const company = companies.instance.getBySlug(companySlug);
  if (!company) throw new Error(`Company not found: ${companySlug}`);

  throwIfCancelled();
  const sync = await syncCompany(companySlug, company);
  const summary: Record<string, unknown> = {
    company: company.name,
    fetched: sync.companyResult.fetched,
    newJobs: sync.newJobs.length,
    changedJobs: sync.changedJobs.length,
    unchangedJobs: sync.unchangedJobs.length,
    closedJobs: sync.closedJobs.length,
    filtered: 0,
    accepted: 0,
  };

  if (doFilter) {
    const candidates = [...sync.newJobs, ...sync.changedJobs];
    log("info", `Running normal filter on ${candidates.length} candidates`);
    if (candidates.length > 0) {
      const config = loadSearchConfig();
      let accepted = 0;
      for (const [index, job] of candidates.entries()) {
        throwIfCancelled();
        const result = normalFilterJob(job, config);
        const row = jobs.instance.getById(job.id);
        saveNormalFilterResult(job.id, row?.contentHash || "", result, index);
        if (result.filter.verdict === "accept" && result.filter.score >= config.min_score) accepted += 1;
        log("info", `Job ${job.id}: ${result.filter.verdict} score=${result.filter.score}`);
      }
      summary.filtered = candidates.length;
      summary.accepted = accepted;
    }
  }

  return summary;
};
