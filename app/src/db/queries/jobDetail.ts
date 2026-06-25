import type postgres from "postgres";

export type JobDetailSql = postgres.Sql;

export type FilterReadModel = {
  id: string;
  verdict: string;
  score: number;
  reasons: string[];
  mustHaveHits: string[];
  missingItems: string[];
  model: string;
  promptVersion: string;
  createdAt: string;
};

export type DocumentReadModel = {
  id: string;
  type: string;
  status: string;
  content: string;
  filePath: string;
  createdAt: string;
};

export type ApplicationReadModel = {
  id: string;
  status: string;
  score: number;
  documents: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type JobDetailReadModel = {
  id: string;
  companySlug: string;
  companyName: string;
  ats: string;
  externalId: string;
  title: string;
  location: string;
  url: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  latestFilter: FilterReadModel | null;
  latestSmartFilter: FilterReadModel | null;
  canSmartFilter: boolean;
  documents: DocumentReadModel[];
  application: ApplicationReadModel | null;
};

export async function getJobDetail(pg: JobDetailSql, jobId: string): Promise<JobDetailReadModel | null> {
  const jobRows = await pg`
    SELECT
      j.id,
      c.slug AS "companySlug",
      c.name AS "companyName",
      c.ats,
      j.external_id AS "externalId",
      j.title,
      j.location,
      j.url,
      j.description,
      j.status,
      j.created_at AS "createdAt",
      j.updated_at AS "updatedAt"
    FROM jobs j
    INNER JOIN companies c ON c.id = j.company_id
    WHERE j.id = ${jobId}
    LIMIT 1
  ` as Array<Omit<JobDetailReadModel, "latestFilter" | "latestSmartFilter" | "canSmartFilter" | "documents" | "application">>;

  const job = jobRows[0];
  if (!job) return null;

  const filterRows = await pg`
    SELECT
      id,
      verdict,
      score,
      reasons,
      must_have_hits AS "mustHaveHits",
      missing_items AS "missingItems",
      model,
      prompt_version AS "promptVersion",
      created_at AS "createdAt"
    FROM job_filters
    WHERE job_id = ${jobId}
    ORDER BY created_at DESC, id ASC
  ` as Array<Omit<FilterReadModel, "reasons" | "mustHaveHits" | "missingItems"> & {
    reasons: string;
    mustHaveHits: string;
    missingItems: string;
  }>;

  const documentRows = await pg`
    SELECT
      id,
      type,
      status,
      content,
      file_path AS "filePath",
      created_at AS "createdAt"
    FROM job_documents
    WHERE job_id = ${jobId}
    ORDER BY created_at DESC, id ASC
  ` as DocumentReadModel[];

  const applicationRows = await pg`
    SELECT
      id,
      status,
      score,
      documents,
      notes,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM applications
    WHERE job_id = ${jobId}
    LIMIT 1
  ` as ApplicationReadModel[];

  const filters = filterRows.map((filter) => ({
    ...filter,
    reasons: safeJsonParse<string[]>(filter.reasons, []),
    mustHaveHits: safeJsonParse<string[]>(filter.mustHaveHits, []),
    missingItems: safeJsonParse<string[]>(filter.missingItems, []),
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

function isSmartFilter(filter: Pick<FilterReadModel, "id" | "promptVersion">): boolean {
  return filter.promptVersion === "smart-filter-v1" || filter.id.startsWith("smart-filter-");
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
