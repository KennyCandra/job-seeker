import { join } from "path";
import { SKILLS_DIR, createClient } from "../../shared/index";
import { readText } from "../../shared/utils";
import { loadSearchConfig } from "../../shared/config";
import { filterJob as filterJobFromPipeline } from "../../filter/index";
import { shortlist, jobFilters } from "../../db";
import type { AgentSkill } from "../types";
import type { JobRecord } from "../../shared/types";

export const filterJob: AgentSkill = {
  name: "filter_job",
  description: "Filter/screen a job against your preferences to see if it's a good match",
  params: {
    job_id: { type: "string", description: "Job ID from shortlist to filter" },
  },
  execute: async (args) => {
    const jobId = args.job_id as string;
    if (!jobId) return { type: "error", message: "job_id required." };

    const item = shortlist.instance.getByJobId(jobId);
    if (!item) return { type: "error", message: "Job not found in shortlist." };

    const job: JobRecord = {
      id: jobId, site: "", title: item.title,
      company: item.company, location: item.location,
      url: item.applyUrl, description: "",
    };

    const config = loadSearchConfig();
    const client = createClient();
    const filterMd = readText(join(SKILLS_DIR, "job_filter.md"));
    const result = await filterJobFromPipeline(client, job, filterMd, config.targetCompanies);

    if (!result) {
      return { type: "error", message: "Filter evaluation failed." };
    }

    jobFilters.instance.save({
      id: `filter-${jobId}-${Date.now()}`,
      jobId,
      verdict: result.filter.verdict,
      score: result.filter.score,
      reasons: result.filter.reasons,
      mustHaveHits: result.filter.must_have_hits,
      missingItems: result.filter.missing,
    });

    const accepted = result.filter.verdict === "accept";
    const lines = [
      accepted ? "✅ **Accepted**" : "❌ **Rejected**",
      `Score: ${result.filter.score}`,
      result.filter.reasons.length ? `Reasons: ${result.filter.reasons.join(", ")}` : "",
      result.filter.must_have_hits.length ? `Must-have hits: ${result.filter.must_have_hits.join(", ")}` : "",
      result.filter.missing.length ? `Missing: ${result.filter.missing.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    return { type: "text", text: lines };
  },
};
