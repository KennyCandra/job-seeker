import type { HandlerFn } from "../../../handler";
import { companies, jobs } from "../../../../db";
import { normalFilterJob, saveNormalFilterResult } from "../../../../filter";
import { syncCompany } from "../../../../jobs";
import { loadSearchConfig } from "../../../../shared/config";
import { HttpError } from "../../../../jobs/errors";

export const syncCompanyHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled } = ctx;
  const companySlug = String(payload.companySlug || "");
  const doFilter = payload.filter === true;

  if (!companySlug) throw new Error("companySlug is required");

  const company = await companies.instance.getBySlug(companySlug);
  if (!company) throw new Error(`Company not found: ${companySlug}`);

  await log("info", `Syncing ${company.name} (${company.slug})`, {
    ats: company.ats,
    endpoint: company.endpoint,
    active: company.active,
  });

  await throwIfCancelled();

  try {
    const sync = await syncCompany(companySlug, company);
    const summary: Record<string, unknown> = {
      company: company.name,
      companySlug: company.slug,
      ats: company.ats,
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
      await log("info", `Running normal filter on ${candidates.length} candidates`);
      if (candidates.length > 0) {
        const config = await loadSearchConfig();
        let accepted = 0;
        for (const [index, job] of candidates.entries()) {
          await throwIfCancelled();
          const result = normalFilterJob(job, config);
          const row = await jobs.instance.getById(job.id);
          await saveNormalFilterResult(job.id, row?.contentHash || "", result, index);
          if (result.filter.verdict === "accept") accepted += 1;
          await log("info", `Job ${job.id}: ${result.filter.verdict} score=${result.filter.score}`);
        }
        summary.filtered = candidates.length;
        summary.accepted = accepted;
      }
    }

    return summary;
  } catch (err: any) {
    if (err instanceof HttpError && err.status === 404) {
      await companies.instance.deactivate(companySlug);
      await log("warn", `Company ${company.name} (${companySlug}) returned 404 — deactivated`);
      throw new Error(`Company ${company.slug} returned 404 — deactivated`);
    }
    const errMsg = err.message || String(err);
    await companies.instance.updateFetchError(companySlug, errMsg);
    await log("error", `Sync failed for ${company.name} (${companySlug}): ${errMsg}`);
    throw err;
  }
};
