# CV Autopilot v2 — Architecture Design

## Overview

Fully automated job hunting pipeline with Telegram-based human-in-the-loop approval. Discovers companies via Google dorking, fetches jobs from ATS APIs, filters via AI, sends shortlist to Telegram for approval, generates tailored CVs and application packages on demand.

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DISCOVERY LAYER                          │
│              (runs every 2-3 days via cron)                 │
│                                                             │
│  search_config.json → Google dork query builder             │
│          ↓                                                  │
│  SerpAPI / Playwright → find ATS board URLs                 │
│          ↓                                                  │
│  Extract company slug + ATS platform                        │
│          ↓                                                  │
│  Save to companies.json (deduplicated)                      │
│  { slug: "lightdash", ats: "greenhouse", name: "Lightdash" }│
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    FETCHING LAYER                           │
│              (runs on /run or daily cron)                   │
│                                                             │
│  Loop through companies.json                                │
│          ↓                                                  │
│  Hit ATS API per platform:                                  │
│    Greenhouse → boards-api.greenhouse.io/v1/boards/{slug}   │
│    Lever      → api.lever.co/v0/postings/{slug}             │
│    Ashby      → jobs.ashbyhq.com GraphQL                    │
│    SmartRecr  → api.smartrecruiters.com/v1/companies/{id}   │
│          ↓                                                  │
│  Filter by role keywords + exclude list from config         │
│          ↓                                                  │
│  Check against seen_jobs.json → skip duplicates             │
│          ↓                                                  │
│  Cache full job description in data/jobs/{jobId}/jd.md      │
│          ↓                                                  │
│  Save new jobs to jobs.json                                 │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    FILTERING LAYER                          │
│                                                             │
│  For each new job:                                          │
│    LLM evaluates against skills/job_filter.md               │
│          ↓                                                  │
│    Returns: verdict, score, reasons, must-have hits,        │
│            missing items                                    │
│          ↓                                                  │
│    Validated via Zod (FilterResult schema)                  │
│    Auto-retry on schema mismatch (max 3 attempts)           │
│          ↓                                                  │
│    Save to shortlist.json                                   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  TELEGRAM APPROVAL                          │
│                                                             │
│  Bot sends formatted shortlist (jobs above min_score)       │
│  Tracks lastShortlist in memory for reply context           │
│          ↓                                                  │
│  User replies with job numbers ("1 3 5" or "all")           │
│          ↓                                                  │
│  Approved jobs marked in applications.json                  │
│  status: "approved"                                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  GENERATION LAYER                           │
│            (idempotent — skips if output exists)            │
│                                                             │
│  For each approved job (where status == "approved"):        │
│    1. Generate resume.json via skills/cv_profile.md         │
│    2. Sanitize LaTeX special chars (%, &, #, $, _)          │
│    3. Render resume.tex template → resume.pdf               │
│    4. Generate application.json via application_prefs.md    │
│    5. Generate application.md summary                       │
│          ↓                                                  │
│  All saved to data/jobs/{jobId}/                            │
│  Update status: "approved" → "ready"                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              TELEGRAM DOCUMENT REQUESTS                     │
│                                                             │
│  Bot sends per-job menu:                                    │
│    "CV ready for {company} — reply to generate:"            │
│    1. Cover letter                                          │
│    2. Recommendation letter                                 │
│    3. Custom message                                        │
│    4. All of the above                                      │
│    or type anything custom                                  │
│          ↓                                                  │
│  User replies → AI generates via skills/documents.md        │
│          ↓                                                  │
│  Documents sent as PDF + markdown via Telegram              │
│  Saved to data/jobs/{jobId}/                                │
└─────────────────────────────────────────────────────────────┘
                         ↓
               User applies manually
```

---

## Directory Structure

```
orchestration/
├── app/
│   ├── src/
│   │   ├── main.ts              # Entry point — starts bot + optional Express
│   │   ├── server.ts            # Express routes (for future frontend)
│   │   ├── pipeline.ts          # Orchestration logic — runs the full flow
│   │   ├── discovery.ts         # Google dork query builder + company extraction
│   │   ├── fetcher.ts           # ATS API clients (Greenhouse, Lever, Ashby, etc.)
│   │   ├── parser.ts            # Job data normalization across ATS formats
│   │   ├── filter.ts            # LLM-based job evaluation + scoring
│   │   ├── generator.ts         # CV + application package generation
│   │   ├── latex.ts             # LaTeX sanitization + PDF compilation
│   │   ├── llm.ts               # LLM client with multi-provider fallback
│   │   ├── prompts.ts           # Prompt builders (compose skills + job data)
│   │   ├── telegram.ts          # Grammy bot — commands, approval, doc requests
│   │   ├── tracker.ts           # Application status management
│   │   ├── utils.ts             # I/O helpers, logging
│   │   ├── types.ts             # TypeScript type definitions
│   │   └── schemas.ts           # All Zod schemas (filter, resume, application)
│   ├── data/
│   │   ├── search_config.json   # Search filters — roles, stack, location, ATS targets
│   │   ├── companies.json       # Discovered companies — slug, ATS platform, name
│   │   ├── jobs.json            # Raw fetched jobs (current batch)
│   │   ├── shortlist.json       # Filter results with scores
│   │   ├── seen_jobs.json       # Duplicate detection — all seen job URLs/IDs
│   │   ├── applications.json   # Application status tracker
│   │   └── jobs/
│   │       └── {jobId}/
│   │           ├── jd.md            # Cached job description (preserved after delisting)
│   │           ├── resume.json      # AI-generated tailored resume data
│   │           ├── application.json # AI-generated application data
│   │           ├── application.md   # Human-readable application summary
│   │           ├── resume.pdf       # Compiled LaTeX PDF
│   │           ├── cover_letter.md  # Optional — generated on request
│   │           ├── cover_letter.pdf
│   │           ├── recommendation.md
│   │           └── custom.md        # Any custom-requested document
│   ├── skills/
│   │   ├── job_filter.md        # AI job filtering rules + scoring criteria
│   │   ├── cv_profile.md        # Candidate profile + CV tailoring rules
│   │   ├── application_prefs.md # Cover letter + email generation rules
│   │   └── documents.md         # Recommendation letter + custom doc rules
│   ├── templates/
│   │   └── resume.tex           # LaTeX resume template
│   └── .env                     # TELEGRAM_BOT_TOKEN, LLM keys, SERPAPI_KEY
├── package.json
└── tsconfig.json
```

---

## Data Models

### companies.json
```json
[
  {
    "slug": "lightdash",
    "ats": "greenhouse",
    "name": "Lightdash",
    "boardUrl": "https://boards.greenhouse.io/lightdash",
    "discoveredAt": "2026-05-31T01:53:00Z",
    "lastFetchedAt": "2026-05-31T04:00:00Z",
    "active": true
  }
]
```

### search_config.json
```json
{
  "roles": ["backend engineer", "fullstack engineer", "software engineer"],
  "stack": ["typescript", "node.js", "postgresql"],
  "location": ["EMEA", "worldwide", "global", "remote"],
  "exclude": ["principal", "staff", "architect", "intern"],
  "ats": ["greenhouse.io", "lever.co", "ashbyhq.com", "smartrecruiters.com"],
  "min_score": 65,
  "discovery_interval_hours": 48
}
```

### jobs.json (normalized across ATS platforms)
```json
[
  {
    "jobId": "lightdash-full-stack-engineer",
    "company": "Lightdash",
    "companySlug": "lightdash",
    "ats": "greenhouse",
    "title": "Full Stack Engineer",
    "location": "Remote — EMEA",
    "description": "...",
    "stackMentions": ["typescript", "node.js", "postgresql", "react"],
    "applyUrl": "https://boards.greenhouse.io/lightdash/jobs/12345",
    "fetchedAt": "2026-05-31T04:00:00Z"
  }
]
```

### shortlist.json
```json
[
  {
    "jobId": "lightdash-full-stack-engineer",
    "company": "Lightdash",
    "title": "Full Stack Engineer",
    "score": 87,
    "verdict": "accept",
    "reasons": ["Strong TypeScript + Node.js match", "Remote EMEA", "Product company"],
    "mustHaveHits": ["typescript", "node.js", "postgresql"],
    "missingItems": [],
    "filteredAt": "2026-05-31T04:01:00Z"
  }
]
```

### applications.json
```json
[
  {
    "jobId": "lightdash-full-stack-engineer",
    "company": "Lightdash",
    "title": "Full Stack Engineer",
    "status": "ready",
    "approvedAt": "2026-05-31T04:05:00Z",
    "appliedAt": null,
    "documents": ["resume", "cover_letter"],
    "notes": ""
  }
]
```

**Status flow:** `approved` → `ready` → `applied` → `interviewing` → `offer` | `rejected` | `ghosted` | `withdrawn`

### seen_jobs.json
```json
{
  "lightdash-full-stack-engineer": "2026-05-31T04:00:00Z",
  "heyreach-backend-engineer": "2026-05-29T10:00:00Z"
}
```
Simple map of jobId → first seen timestamp. Checked before processing to skip duplicates.

---

## ATS API Reference

| ATS | Endpoint | Auth | Notes |
|---|---|---|---|
| Greenhouse | `GET boards-api.greenhouse.io/v1/boards/{slug}/jobs` | None | Returns JSON with all active jobs. Add `?content=true` for descriptions. |
| Lever | `GET api.lever.co/v0/postings/{slug}` | None | Returns JSON array of postings with full descriptions. |
| Ashby | `POST jobs.ashbyhq.com/api/non-user-graphql` | None | GraphQL. Use open source reference for query structure. |
| SmartRecruiters | `GET api.smartrecruiters.com/v1/companies/{id}/postings` | None | Returns paginated JSON. |

All endpoints are public — no API keys needed. Rate limit with 1-2s delays between companies.

---

## Google Dork Discovery

### Query Builder

From `search_config.json`, build queries like:

```
site:greenhouse.io "typescript" "node.js" "remote" ("EMEA" OR "worldwide")
site:lever.co "backend engineer" "typescript" -principal -staff
site:ashbyhq.com "fullstack" "postgresql" "remote"
```

One query per ATS platform per run.

### Discovery Flow

```
1. Build dork queries from config (one per ATS)
2. Hit SerpAPI (or Playwright Google scrape as fallback)
3. Extract URLs from results
4. Parse company slug from URL pattern:
   - greenhouse.io/{slug}/jobs/...  → slug
   - jobs.lever.co/{slug}/...       → slug
   - jobs.ashbyhq.com/{slug}        → slug
5. Check against existing companies.json → skip known
6. Add new companies with discoveredAt timestamp
7. Log: "[discovery] Found 3 new companies: x, y, z"
```

### Rate Limiting

- SerpAPI: 100 free searches/month — enough for 2-3 runs/week × 4 ATS platforms
- If self-scraping Google with Playwright: 3-5s delay between queries, rotate user agents
- Between ATS API fetches: 1-2s delay per company

---

## Telegram Bot Design

### Commands

| Command | Description |
|---|---|
| `/run` | Run full pipeline (discover → fetch → filter → send shortlist) |
| `/discover` | Run discovery only (refresh companies list) |
| `/shortlist` | Show current shortlist |
| `/status` | Show application tracker summary |
| `/generate {jobId}` | Regenerate documents for a specific job |
| `/update {jobId} {status}` | Update application status |
| `/companies` | Show discovered companies count per ATS |

### Conversation State

Single-user bot — track state in memory:

```typescript
interface BotState {
  lastShortlist: ShortlistItem[] | null;  // for reply context
  pendingDocRequest: {                     // for document generation replies
    jobId: string;
    messageId: number;
  } | null;
}
```

### Shortlist Message Format

```
🔍 Found 4 jobs worth reviewing:

1. ✅ Lightdash — Full Stack Engineer (Score: 87)
   TypeScript, Node.js, PostgreSQL ✓
   Remote EMEA ✓

2. ✅ HeyReach — Backend Engineer (Score: 74)
   TypeScript, Node.js ✓
   ⚠️ Missing: PostgreSQL

3. ❌ NewsCatcher — Backend & LLM (Score: 45)
   ⚠️ Missing: Python, Kubernetes
   (below threshold — shown for visibility)

4. ✅ Enginy — Software Engineer (Score: 81)
   TypeScript, Node.js, PostgreSQL ✓
   Remote EMEA ✓

Reply with job numbers to approve (e.g. "1 2 4")
or "all" to approve everything above threshold
```

### Document Request Format

```
✅ CV ready for Lightdash — Full Stack Engineer

📄 Resume PDF attached

Reply to generate:
1 — Cover letter
2 — Recommendation letter
3 — Custom message
4 — All of the above
or type anything custom
```

---

## LLM Strategy

### Provider Chain

```
Claude (primary) → OpenAI (fallback)
```

### Fallback Triggers
- HTTP 429 (rate limit)
- HTTP 500+ (server error)
- Timeout (30s)
- 3 consecutive Zod validation failures

### Prompt Composition

```typescript
function buildFilterPrompt(job: Job): string {
  const rules = readFile("skills/job_filter.md");
  return `${rules}\n\n---\n\nEvaluate this job:\n\n${JSON.stringify(job, null, 2)}`;
}
```

Each skills file is the system-level instruction. Job data is the user-level input.

### Zod Validation + Retry

```
Attempt 1: standard prompt
    ↓ validation fails
Attempt 2: append "Respond with valid JSON matching this schema: {schema}"
    ↓ validation fails
Attempt 3: append "STRICT: Return ONLY a JSON object. No markdown. No explanation."
    ↓ validation fails
→ Log error, skip job, notify via Telegram
```

---

## LaTeX Pipeline

### Sanitization

Before injecting any AI-generated text into the LaTeX template, escape these characters:

```typescript
function sanitizeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, (char) => `\\${char}`)
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}
```

### Compilation

```typescript
async function compilePdf(jobId: string): Promise<string> {
  const resumeData = readJson(`data/jobs/${jobId}/resume.json`);
  const template = readFile("templates/resume.tex");
  const rendered = renderTemplate(template, sanitizeAll(resumeData));
  const outputPath = `data/jobs/${jobId}/resume.pdf`;
  await latex(rendered, { output: outputPath });
  return outputPath;
}
```

---

## Pipeline Orchestration

### Full Pipeline (`/run`)

```typescript
async function runPipeline() {
  log("[pipeline] Starting full run");

  // 1. Check if discovery is due
  if (shouldRunDiscovery()) {
    await discoverCompanies();
  }

  // 2. Fetch jobs from all known companies
  const newJobs = await fetchAllJobs();
  log(`[fetch] Found ${newJobs.length} new jobs`);

  if (newJobs.length === 0) {
    telegram.send("No new jobs found this run.");
    return;
  }

  // 3. Filter and score
  const shortlist = await filterJobs(newJobs);
  log(`[filter] ${shortlist.length} jobs passed filtering`);

  // 4. Send to Telegram for approval
  await telegram.sendShortlist(shortlist);

  // 5. Wait for user approval (async — handled by bot message listener)
}
```

### Post-Approval (triggered by Telegram reply)

```typescript
async function processApprovedJobs(jobIds: string[]) {
  for (const jobId of jobIds) {
    const app = getApplication(jobId);

    // Idempotency: skip if already processed
    if (app.status !== "approved") {
      log(`[generate] Skipping ${jobId} — status is ${app.status}`);
      continue;
    }

    // Generate CV package
    await generateResume(jobId);
    await generateApplication(jobId);
    await compilePdf(jobId);

    // Update status
    updateStatus(jobId, "ready");

    // Send to Telegram
    await telegram.sendDocumentMenu(jobId);
  }
}
```

---

## Idempotency

All operations check current state before executing:

| Operation | Skip condition |
|---|---|
| Discovery | Company slug already in companies.json |
| Fetching | Job URL/ID already in seen_jobs.json |
| Filtering | Job already in shortlist.json |
| Generation | Application status is not "approved" (already "ready" or beyond) |
| PDF compilation | `resume.pdf` already exists in job directory |

On re-run, only new/unprocessed items are handled. Force regeneration via `/generate {jobId}`.

---

## Logging

All pipeline steps log with prefixed tags:

```
[discovery] Building dork queries for 4 ATS platforms
[discovery] Found 3 new companies: x, y, z
[fetch] Fetching jobs from 47 companies
[fetch] Found 12 new jobs (skipped 89 seen)
[filter] Evaluating 12 jobs against job_filter.md
[filter] 4 passed (scores: 87, 81, 74, 45)
[telegram] Shortlist sent — waiting for approval
[generate] Processing lightdash-full-stack-engineer
[latex] Compiled resume.pdf (2 pages)
[telegram] CV package sent for Lightdash
```

Logs are printed to stdout. Optionally write to `data/pipeline.log` for history.

---

## Tech Stack

| Component | Tool | Why |
|---|---|---|
| Runtime | Bun + TypeScript | Fast, native TS support |
| Telegram | Grammy | TypeScript-first, good middleware |
| ATS scraping | Cheerio + fetch | ATS pages are server-rendered, no JS needed |
| Google scraping | SerpAPI (primary) / Playwright (fallback) | SerpAPI avoids bot detection |
| LLM | Claude (primary), OpenAI (fallback) | Best quality for document generation |
| PDF | node-latex | User has texlive locally |
| Validation | Zod | Runtime type safety for LLM outputs |
| HTTP server | Express | Future frontend extensibility |

---

## Environment Variables

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...          # Single user — hardcode chat ID for security
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
SERPAPI_KEY=...                # Optional — falls back to Playwright
```

---

## Key Design Decisions

1. **Two-layer fetching** — Dorking for discovery (low frequency), ATS APIs for data (high frequency, reliable)
2. **Telegram as primary UI** — No dashboard needed, everything in chat, works from phone
3. **Express for future frontend** — Server ready but not required for v1
4. **Skills as prompts** — All AI behavior in markdown files, iterate without code changes
5. **Single output directory** — `data/jobs/{jobId}/` is the single source of truth per job
6. **Idempotent pipeline** — Safe to re-run, skips completed work based on DB status
7. **jobId as readable slug** — `{company}-{title-slug}` format, not hashes or UUIDs
8. **Cache job descriptions** — JDs saved on fetch, survive job delisting
9. **Never auto-apply** — Pipeline generates packages, human submits
10. **LaTeX sanitization** — All AI text escaped before template injection
