import type { DataSource } from "typeorm";
import type { JobSearchInput, JobSearchResult } from "../repositories/jobs.repository";

export type JobsListSql = DataSource;

export async function searchJobsList(pg: JobsListSql, input: JobSearchInput): Promise<JobSearchResult> {
  const requestedPage = Math.max(1, Math.floor(Number(input.page) || 1));
  const pageSize = Math.min(1000, Math.max(10, Math.floor(Number(input.pageSize) || 50)));
  const where: string[] = [];
  const params: Array<string | number> = [];

  const addParam = (value: string | number): string => {
    params.push(value);
    return `$${params.length}`;
  };

  const search = input.search?.trim();
  if (search) {
    const like = `%${search.toLowerCase()}%`;
    const p1 = addParam(like);
    const p2 = addParam(like);
    const p3 = addParam(like);
    where.push(`(LOWER(j.title) LIKE ${p1} OR LOWER(c.name) LIKE ${p2} OR LOWER(j.location) LIKE ${p3})`);
  }

  if (input.companyName) where.push(`c.name = ${addParam(input.companyName)}`);
  if (input.status) where.push(`j.status = ${addParam(input.status)}`);

  const fetchedWithinHours = Math.floor(Number(input.fetchedWithinHours) || 0);
  if (fetchedWithinHours > 0) {
    where.push(`j.last_seen_at::timestamptz >= NOW() - (${addParam(fetchedWithinHours)} * INTERVAL '1 hour')`);
  }

  const minScore = Number(input.minScore) || 0;
  if (minScore > 0) where.push(`lf.score >= ${addParam(minScore)}`);

  const summaryWhere = [...where];
  const summaryParams = [...params];

  if (input.verdict === "unfiltered") {
    where.push("lf.verdict IS NULL");
  } else if (input.verdict) {
    where.push(`lf.verdict = ${addParam(input.verdict)}`);
  }

  if (input.smartVerdict === "unfiltered") {
    where.push("sf.verdict IS NULL");
  } else if (input.smartVerdict) {
    where.push(`sf.verdict = ${addParam(input.smartVerdict)}`);
  }

  const buildBaseSql = (whereSql: string, includeFlags = false) => `
    FROM jobs j
    INNER JOIN companies c ON c.id = j.company_id
    LEFT JOIN (
      SELECT DISTINCT ON (jf.job_id) jf.*
      FROM job_filters jf
      WHERE jf.prompt_version != 'smart-filter-v1' AND jf.id NOT LIKE 'smart-filter-%'
      ORDER BY jf.job_id, jf.created_at DESC, jf.id ASC
    ) lf ON lf.job_id = j.id
    LEFT JOIN (
      SELECT DISTINCT ON (jf.job_id) jf.*
      FROM job_filters jf
      WHERE jf.prompt_version = 'smart-filter-v1' OR jf.id LIKE 'smart-filter-%'
      ORDER BY jf.job_id, jf.created_at DESC, jf.id ASC
    ) sf ON sf.job_id = j.id
    ${includeFlags ? `
      LEFT JOIN document_flags df ON df.job_id = j.id
      LEFT JOIN application_flags af ON af.job_id = j.id
    ` : ""}
    ${whereSql}
  `;

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const baseSql = buildBaseSql(whereSql);
  const totalRows = await pg.query(`SELECT COUNT(*)::int AS count ${baseSql}`, params);
  const total = Number(totalRows[0]?.count || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const pageParams = [...params, pageSize, offset];
  const rows = (await pg.query(
    `
    WITH document_flags AS (
      SELECT
        job_id,
        BOOL_OR(type = 'cv') AS "hasCv",
        BOOL_OR(type = 'cover_letter') AS "hasCoverLetter",
        BOOL_OR(type = 'recommendation') AS "hasRecommendation"
      FROM job_documents
      GROUP BY job_id
    ),
    application_flags AS (
      SELECT job_id, true AS "hasApplication"
      FROM applications
      GROUP BY job_id
    )
    SELECT
      j.id,
      c.slug AS "companySlug",
      c.name AS "companyName",
      j.title,
      j.location,
      j.url,
      j.status,
      c.ats,
      lf.score,
      lf.verdict,
      sf.score AS "smartScore",
      sf.verdict AS "smartVerdict",
      COALESCE(df."hasCv", false) AS "hasCv",
      COALESCE(df."hasCoverLetter", false) AS "hasCoverLetter",
      COALESCE(df."hasRecommendation", false) AS "hasRecommendation",
      COALESCE(af."hasApplication", false) AS "hasApplication",
      j.updated_at AS "updatedAt"
    ${buildBaseSql(whereSql, true)}
    ORDER BY j.updated_at DESC, j.id ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `,
    pageParams,
  )) as any[];

  const summaryWhereSql = summaryWhere.length ? `WHERE ${summaryWhere.join(" AND ")}` : "";
  const summaryBaseSql = buildBaseSql(summaryWhereSql);
  const summaryRows = (await pg.query(
    `
    SELECT COALESCE(lf.verdict, 'unfiltered') AS verdict, COUNT(*)::int AS count
    ${summaryBaseSql}
    GROUP BY COALESCE(lf.verdict, 'unfiltered')
  `,
    summaryParams,
  )) as Array<{ verdict: string; count: number }>;
  const smartSummaryRows = (await pg.query(
    `
    SELECT COALESCE(sf.verdict, 'unfiltered') AS verdict, COUNT(*)::int AS count
    ${summaryBaseSql}
    GROUP BY COALESCE(sf.verdict, 'unfiltered')
  `,
    summaryParams,
  )) as Array<{ verdict: string; count: number }>;

  const companiesRows = (await pg.query(`SELECT DISTINCT c.name AS name FROM jobs j INNER JOIN companies c ON c.id = j.company_id ORDER BY c.name ASC`)) as Array<{ name: string }>;
  const statusRows = (await pg.query(`SELECT DISTINCT status FROM jobs ORDER BY status ASC`)) as Array<{ status: string }>;

  return {
    items: rows.map((row) => ({
      id: row.id,
      companySlug: row.companySlug,
      companyName: row.companyName,
      title: row.title,
      location: row.location,
      url: row.url,
      status: row.status,
      ats: row.ats,
      score: row.score === null || row.score === undefined ? null : Number(row.score),
      verdict: row.verdict ?? null,
      smartScore: row.smartScore === null || row.smartScore === undefined ? null : Number(row.smartScore),
      smartVerdict: row.smartVerdict ?? null,
      hasCv: Boolean(row.hasCv),
      hasCoverLetter: Boolean(row.hasCoverLetter),
      hasRecommendation: Boolean(row.hasRecommendation),
      hasApplication: Boolean(row.hasApplication),
      updatedAt: row.updatedAt,
    })),
    total,
    page,
    pageSize,
    totalPages,
    summary: {
      accepted: Number(summaryRows.find((row) => row.verdict === "accept")?.count || 0),
      rejected: Number(summaryRows.find((row) => row.verdict === "reject")?.count || 0),
      unfiltered: Number(summaryRows.find((row) => row.verdict === "unfiltered")?.count || 0),
      smartAccepted: Number(smartSummaryRows.find((row) => row.verdict === "accept")?.count || 0),
      smartRejected: Number(smartSummaryRows.find((row) => row.verdict === "reject")?.count || 0),
      smartUnfiltered: Number(smartSummaryRows.find((row) => row.verdict === "unfiltered")?.count || 0),
    },
    options: {
      companies: companiesRows.map((row) => row.name),
      statuses: statusRows.map((row) => row.status),
    },
  };
}
