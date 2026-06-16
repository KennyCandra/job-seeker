import type { HandlerFn } from "../../handler";
import { jobDocuments, jobs } from "../../../db";
import { generateCoverLetterDocument, generateCvDocument, generateRecommendationDocument } from "../../../generator";
import { createClient } from "../../../shared/client";
import type { JobRecord } from "../../../shared/types";

export const generateDocumentHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled } = ctx;
  const jobId = String(payload.jobId || "");
  const docType = String(payload.documentType || "cv");
  const force = payload.force === true;

  if (!jobId || !["cv", "cover_letter", "recommendation"].includes(docType)) {
    throw new Error("jobId and valid documentType (cv/cover_letter/recommendation) required");
  }

  const jobRow = await jobs.instance.getById(jobId);
  if (!jobRow) throw new Error(`Job not found: ${jobId}`);

  const existingDocs = await jobDocuments.instance.getByJobId(jobId);
  const hasExisting = existingDocs.some((d: any) => d.type === docType);
  if (hasExisting && !force) {
    await log("info", `${docType} already exists for job ${jobId}`);
    return { exists: true, type: docType };
  }

  const job: JobRecord = {
    id: jobRow.id,
    site: jobRow.ats || "",
    title: jobRow.title,
    company: jobRow.companyName,
    location: jobRow.location,
    url: jobRow.url,
    description: jobRow.description,
  };

  const client = createClient();
  await log("info", `Generating ${docType} for job ${jobId} (${job.company} - ${job.title})`);
  await throwIfCancelled();

  if (docType === "cv") {
    await generateCvDocument(job, Number(payload.score) || 0, client);
  } else if (docType === "cover_letter") {
    await generateCoverLetterDocument(job, client);
  } else {
    await generateRecommendationDocument(job, client);
  }

  await throwIfCancelled();
  await log("info", `${docType} generated for job ${jobId}`);
  return { ok: true, type: docType };
};
