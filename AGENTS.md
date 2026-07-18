# CV Autopilot — Agent Guide

CV Autopilot is a job-discovery and application-management system. The application uses Bun, NestJS 11 (Express adapter), React, PostgreSQL, TypeORM, Redis, BullMQ, Playwright, an LLM service, and LaTeX.

## Repository State

The live backend is the NestJS application under `app/backend`. The legacy Express/Drizzle tree (`app/src`) was removed at cutover; its full history — including the abandoned class-based fetcher experiments (`sources/`, `pipelines/`, `delta/`, `normalization/`) — is preserved in git (see the `pre-cutover snapshot` commit).

## Runtime Architecture

```text
React dashboard
      |
NestJS API (:3000, global prefix /api)
      |
PostgreSQL + TypeORM
      |
BullMQ + Redis worker process
      |
ATS discovery and synchronization
      |
Deterministic filter -> optional LLM filter
      |
Document generation and Playwright apply assistant
```

Two processes are built from the same module set:

- `app/backend/src/main.ts` (`AppModule`): the HTTP API. Serves `/api/*`, `/health`, and the built React app with SPA fallback.
- `app/backend/src/worker.ts` (`WorkerModule`): BullMQ processors and the scheduler.
- `app/frontend`: React/Vite dashboard.
- PostgreSQL and Redis: started through `docker-compose.yml`.

`bun dev` (root or `app/backend`) starts PostgreSQL, Redis, the API, the worker, and the frontend together.

Task handlers register in `TaskRegistry` only in the worker process (`*.tasks.ts` `onModuleInit`); the API validates task types via `REGISTERED_TASK_TYPES` in `app/backend/src/tasks/types.ts` — keep the two in sync.

## Source Layout

```text
orchestration/
├── app/
│   ├── backend/             # NestJS backend (API + worker)
│   │   ├── src/
│   │   │   ├── jobs/        # ATS fetching, ingestion, sync tasks
│   │   │   ├── companies/   # Company CRUD and fetch triggers
│   │   │   ├── discovery/   # SerpAPI company discovery
│   │   │   ├── filter/      # Deterministic and LLM filtering
│   │   │   ├── documents/   # CV/application document generation
│   │   │   ├── apply/       # Playwright apply assistant + apply queue
│   │   │   ├── tasks/       # Task registry, runs, SSE, reaper
│   │   │   ├── database/    # TypeORM data source, repositories, migrations, baseline
│   │   │   ├── compat/      # Legacy /job, /cv, /pipeline endpoints
│   │   │   ├── common/      # Guards, filters, SSE helpers, paths
│   │   │   ├── config/      # Env schema + search config
│   │   │   ├── shared/      # LLM client, prompts, types, resume helpers
│   │   │   ├── main.ts      # API entry point
│   │   │   └── worker.ts    # Worker entry point
│   │   ├── test/            # bun test suites
│   │   └── scripts/         # smoke.ts and maintenance scripts
│   ├── frontend/            # React dashboard
│   ├── skills/              # Editable LLM instructions
│   └── templates/           # LaTeX template and build support
├── data/                    # Runtime output and generated job documents
├── docs/                    # Implementation and migration notes
├── docker-compose.yml
└── package.json             # Thin wrapper scripts delegating to app/backend
```

## Database

PostgreSQL is the source of truth, accessed through TypeORM (`app/backend/src/database`).

The main tables are:

- `companies`
- `jobs`
- `job_filters`
- `applications`
- `application_runs`
- `application_run_steps`
- `job_documents`
- `search_config`
- `task_runs`
- `task_run_logs`
- `user_profile`
- `user_answers`

Many JSON values and timestamps are stored as text. Preserve existing representations unless a task explicitly includes a database migration.

TypeORM rules:

- `synchronize: false` in every environment. Never allow TypeORM to infer or rewrite the populated schema.
- The migration baseline was established from the verified live schema (`app/backend/src/database/baseline.ts`); use `migration:generate`/`migration:run` for later changes.
- Repository SQL must alias snake_case columns to camelCase (`created_at AS "createdAt"`); never `SELECT *` — rows are consumed as camelCase record types. See `app/backend/src/database/repositories/index.ts`.
- Raw parameterized SQL is acceptable for complex jobs-list, job-detail, reporting, and cursor queries where it is clearer than a query builder.

## API

Controllers use the global `/api` prefix set in `main.ts` (excluded: `/health`, `/admin/*`). Route modules must use relative paths such as `jobs`, not repeat `/api`.

Important route groups include:

- `/api/stats`
- `/api/jobs`
- `/api/companies`
- `/api/shortlist`
- `/api/saved-jobs`
- `/api/applications`
- `/api/tasks`
- `/api/profile`
- `/api/config`
- `/api/apply`
- `/api/job`, `/api/cv`, `/api/pipeline` (legacy compat, `app/backend/src/compat`)
- `/health`

The API also serves the built React application and its SPA fallback (`frontend.module.ts`).

Preserve frontend-consumed response shapes, pagination, cursor behavior, download URLs, and SSE event names unless the requested change explicitly includes a coordinated API change.

## Job Synchronization

Sync starts from `app/backend/src/jobs` (`ingestion.service.ts`, `jobs.tasks.ts`) using the provider fetchers in `app/backend/src/jobs/ats`.

```text
company endpoint
    -> ATS fetch
    -> normalize raw jobs
    -> classify new/changed/unchanged/closed
    -> persist jobs
    -> update company fetch state
```

Providers are Greenhouse, Lever, and Ashby. ATS endpoint construction lives in `endpointForAts` (`app/backend/src/common/paths.ts`); slug extraction in `app/backend/src/jobs/ats/sources.ts` (`greenhouseBoardSlug`/`leverCompanySlug`/`ashbyOrgSlug` — the Ashby public path is `posting-api`, singular). ATS-migration detection uses `app/backend/src/jobs/ats/migration-probe.ts`. Manual pasted jobs use the `custom` company type and are not fetchable ATS jobs.

Raw ATS payloads must not be placed in Redis when they can be ingested in the process that fetched them.

## Filtering

The normal filter is deterministic; its current version marker is `normal-filter-scoring-v1`.

- It scores title, technology, location, and experience signals.
- Hard blockers force rejection.
- The stored result shape remains verdict, score, reasons, must-have hits, and missing items.
- Candidate scans intentionally use unbounded repository reads where required; do not accidentally restore a default 100-job limit.

The smart filter is the optional LLM pass and uses `smart-filter-v1`. Keep normal and smart results distinguishable by prompt version and ID.

## Tasks and Queues

Two BullMQ queues: `cv-autopilot-tasks-v2` (TASK_QUEUE) and `cv-autopilot-apply-v2` (APPLY_QUEUE). `run-apply` runs only on the apply queue via `ApplyProcessor`, never through `TaskRegistry`. (Leftover `bull:cv-autopilot:*` keys in Redis are from the pre-migration queue and are dead.)

Every primary task should have:

- a `task_runs` record;
- persisted logs in `task_run_logs`;
- progress and result data;
- cancellation checks;
- a deterministic dedupe key where duplicate work is unsafe.

Stale `running` task runs are cleaned up by `task-reaper.service.ts`.

The frontend consumes task updates through `/api/tasks/:runId/events`. Preserve these SSE events:

- `status`
- `log`
- `progress`
- `result`
- `error`
- `done`

## Documents and Applications

CV, cover-letter, and recommendation generation is backend-owned. The frontend only triggers generation and downloads the result.

- Document generation code lives in `app/backend/src/documents`.
- LLM instructions live in `app/skills`.
- LaTeX rendering uses `app/templates` and assets under `templates/assets`.
- Document metadata and file paths are stored in `job_documents`.
- Application tracking is stored in `applications`.

New file handling should be job-specific. Avoid scanning a company directory and assuming the first PDF belongs to the requested job. Always prefer the document record linked to the exact job.

## Playwright Apply Assistant

The apply assistant fills known fields, uses saved profile answers and the LLM for suitable free-text questions, uploads documents, and stops before final submission.

Never remove the final human-review safety stop unless explicitly requested.

Paused browser sessions live in worker process memory and do not survive worker restarts; resume/cancel behavior must account for process ownership.

## Frontend

The frontend is React 19 with Vite. Its API client is `app/frontend/src/api.ts`.

Main pages include Dashboard, Jobs, Companies, Shortlist, Applications, Tasks, Profile, and Config.

Keep filtering, pagination, and counts server-side when the dataset is large. Do not replace server queries with client-only filtering.

## Environment

Env vars are validated in `app/backend/src/config/env.ts`. Common variables include:

- `PORT`
- `DATABASE_URL`
- `DATABASE_POOL_SIZE`
- `REDIS_URL`
- `WORKER_CONCURRENCY`
- `POLL_INTERVAL_HOURS`
- `DISCOVERY_INTERVAL_HOURS`
- `DISCOVERY_PROVIDER`
- `SERPAPI_KEY` or `SERP_API_KEY`
- `LLM_PROVIDER`
- `LLM_MODEL`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `ADMIN_API_TOKEN`
- `ENABLE_QUEUE_ADMIN`
- `APPLY_KEEP_BROWSER_ON_BLOCK`
- path overrides: `DATA_DIR`, `SKILLS_DIR`, `FRONTEND_DIST`, `TEMPLATES_DIR`

Never print or rewrite secret values from `.env` unless the user explicitly requests a secret/configuration change.

## Development Commands

```bash
bun install
docker compose up -d
bun run db:setup      # baseline + TypeORM migrations
bun dev
```

Targeted commands (root scripts delegate to `app/backend`):

```bash
bun run dev:server
bun run dev:worker
bun run build:frontend
```

Gate before considering a backend change done (from `app/backend`):

```bash
bun run typecheck && bun test && bun run build:backend
```

Runtime smoke (API must be running):

```bash
bun scripts/smoke.ts    # from app/backend
```

For changes involving queues, also verify that a real task can be enqueued, processed, logged, observed through SSE, and completed or cancelled correctly.

## Working Rules

1. Inspect real imports, callers, scripts, routes, and processes before claiming code is unused.
2. Preserve unrelated working-tree changes; do not reset or overwrite them.
3. Do not create commits unless explicitly requested.
4. Keep changes small and reviewable; avoid adding layers that do not clearly simplify the application.
5. Prefer targeted runtime verification over noisy unrelated checks.
6. Keep backend behavior and frontend contracts synchronized.
7. Do not change database schema, queue payloads, task names, or public API shapes without an explicit migration path.
8. Never auto-submit a job application.
9. Be direct about incomplete or poor design; do not describe experimental code as production-ready.
