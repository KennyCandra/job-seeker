# CV Autopilot — Agent Guide

CV Autopilot is a job-discovery and application-management system. The current application uses Bun, Express, React, PostgreSQL, Drizzle, Redis, BullMQ, Playwright, an LLM service, and LaTeX.

## Repository State

The live backend is still the Express application under `app/src`. A NestJS/TypeORM replacement is being scaffolded under `app/backend`, but it has not reached runtime or API parity yet. Do not describe the replacement as live until the final cutover is verified.

The working tree may contain unfinished ATS migration work. Preserve unrelated changes and inspect actual imports, scripts, routes, and runtime entry points before deleting or restructuring anything.

## Current Runtime Architecture

```text
React dashboard
      |
Express API (:3000)
      |
PostgreSQL + Drizzle
      |
BullMQ + Redis workers
      |
ATS discovery and synchronization
      |
Deterministic filter -> optional LLM filter
      |
Document generation and Playwright apply assistant
```

The main processes are:

- `app/src/main.ts`: registers task handlers, starts the Express API, starts optional in-process workers, and starts pollers.
- `app/src/worker.ts`: starts the standalone BullMQ workers.
- `app/frontend`: React/Vite dashboard.
- PostgreSQL and Redis: started through `docker-compose.yml`.

`bun dev` starts PostgreSQL, Redis, the API, the worker, and the frontend together.

## Source Layout

```text
orchestration/
├── app/
│   ├── src/
│   │   ├── server/          # Express server, routes, middleware, security
│   │   ├── db/              # Drizzle schema, repositories, migrations, read queries
│   │   ├── queue/           # BullMQ queues, producers, and workers
│   │   ├── tasks/           # Task registry, handlers, logs, progress, and SSE
│   │   ├── jobs/            # Live ATS fetching, normalization, sync, and manual jobs
│   │   ├── discovery/       # SerpAPI/Playwright company discovery
│   │   ├── filter/          # Deterministic and LLM filtering
│   │   ├── generator/       # CV and application-document generation
│   │   ├── apply/           # Playwright application assistant
│   │   ├── pipeline/        # Legacy high-level orchestration helpers
│   │   ├── agent/           # Currently unwired intent/skill implementation
│   │   ├── shared/          # Shared configuration, types, paths, prompts, and LLM client
│   │   ├── main.ts          # API entry point
│   │   └── worker.ts        # Worker entry point
│   ├── backend/             # In-progress NestJS/TypeORM replacement
│   ├── frontend/            # React dashboard
│   ├── skills/              # Editable LLM instructions
│   └── templates/           # LaTeX template and build support
├── data/                    # Runtime output and generated job documents
├── docs/                    # Current implementation and migration notes
├── docker-compose.yml
├── drizzle.config.ts
└── package.json
```

## Database

PostgreSQL is the source of truth. Drizzle schema modules live in `app/src/db/schema`.

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

Many JSON values and timestamps are stored as text. Preserve existing representations unless a task explicitly includes a database migration. Do not generate or apply migrations casually: first compare the schema, migration journal, migration files, and actual database state.

### NestJS TypeORM Target

The NestJS replacement intentionally uses TypeORM instead of Drizzle. This is an ORM migration, not a database redesign.

- Map TypeORM entities exactly to the existing PostgreSQL table names, columns, types, defaults, indexes, nullability, and relationships.
- Keep `synchronize: false` in every environment. Never allow TypeORM to infer or rewrite the populated schema automatically.
- Do not generate an initial migration that attempts to recreate existing tables.
- Establish and document a TypeORM migration baseline from the verified existing schema before using TypeORM migrations for later changes.
- Use injected TypeORM repositories or query builders for ordinary CRUD and transactions.
- Raw parameterized SQL is acceptable for complex jobs-list, job-detail, reporting, and cursor queries where it is clearer or measurably better than a query builder.
- Keep the current Drizzle schema and migrations authoritative for the live Express backend until NestJS reaches parity and the cutover is complete.
- New NestJS domain code must not import the legacy Drizzle repository singletons.
- Verify TypeORM mappings against real existing rows before enabling writes from NestJS.

## API

`app/src/server/index.ts` mounts application routes once at `/api`. Route modules must use relative paths such as `/jobs`, not repeat `/api` internally.

Important route groups include:

- `/api/stats`
- `/api/jobs`
- `/api/companies`
- `/api/shortlist`
- `/api/applications`
- `/api/tasks`
- `/api/profile`
- `/api/config`
- `/api/apply`
- `/health`
- `/admin/queues` when queue administration is enabled

The API also serves the built React application and its SPA fallback.

Preserve frontend-consumed response shapes, pagination, cursor behavior, download URLs, and SSE event names unless the requested change explicitly includes a coordinated API change.

## Job Synchronization

The authoritative live sync path currently starts in `app/src/jobs/index.ts` and uses the function-based fetchers in `app/src/jobs/ats`.

```text
company endpoint
    -> ATS fetch
    -> normalize raw jobs
    -> classify new/changed/unchanged/closed
    -> persist jobs
    -> update company fetch state
```

The current providers are Greenhouse, Lever, and Ashby. Manual pasted jobs use the `custom` company type and are not fetchable ATS jobs.

`app/src/jobs/normalize/index.ts` is the active reusable normalization implementation. `app/src/jobs/parser.ts` contains older duplicate normalization logic and should not be treated as authoritative without checking callers.

### Unfinished ATS Migration Work

The class-based fetchers under `app/src/sources/adpters` are currently connected only to the unfinished migration path. They do not replace the live fetchers.

The following areas are incomplete or experimental:

- `app/src/sources`
- `app/src/normalization`
- `app/src/pipelines`
- `app/src/delta`
- `app/src/queue/SyncQueue.ts`
- `app/src/queue/failedQueue.ts`
- migration and fetch-queue task handlers

Do not extend these paths without first resolving their payload contracts, handler signatures, response parsing, logging, deduplication, and relationship to the primary task queue.

The intended future sync design is one provider abstraction and one ingestion service reused by normal synchronization, refetching, and ATS migration detection. Raw ATS payloads must not be placed in Redis when they can be ingested in the process that fetched them.

## Filtering

The normal filter is deterministic and lives in `app/src/filter/index.ts`. Its current version marker is `normal-filter-scoring-v1`.

- It scores title, technology, location, and experience signals.
- Hard blockers force rejection.
- The stored result shape remains verdict, score, reasons, must-have hits, and missing items.
- Candidate scans intentionally use unbounded repository reads where required; do not accidentally restore the default 100-job limit.

The smart filter is the optional LLM pass and uses `smart-filter-v1`. Keep normal and smart results distinguishable by prompt version and ID.

## Tasks and Queues

The primary queue uses `app/src/queue/enqueue.ts` and `app/src/queue/worker.ts`.

Every primary task should have:

- a `task_runs` record;
- persisted logs in `task_run_logs`;
- progress and result data;
- cancellation checks;
- a deterministic dedupe key where duplicate work is unsafe.

The frontend consumes task updates through `/api/tasks/:runId/events`. Preserve these SSE events:

- `status`
- `log`
- `progress`
- `result`
- `error`
- `done`

Batch synchronization and filtering currently fan out into child tasks. Verify parent and child status behavior before modifying queue orchestration.

## Documents and Applications

CV, cover-letter, and recommendation generation is backend-owned. The frontend only triggers generation and downloads the result.

- Document generation code lives in `app/src/generator`.
- LLM instructions live in `app/skills`.
- LaTeX rendering uses `app/templates` and assets under `templates/assets`.
- Document metadata and file paths are stored in `job_documents`.
- Application tracking is stored in `applications`.

New file handling should be job-specific. Avoid scanning a company directory and assuming the first PDF belongs to the requested job. Always prefer the document record linked to the exact job.

## Playwright Apply Assistant

The apply assistant fills known fields, uses saved profile answers and the LLM for suitable free-text questions, uploads documents, and stops before final submission.

Never remove the final human-review safety stop unless explicitly requested.

Paused browser sessions currently live in process memory. The API and worker run as separate processes, so resume/cancel behavior must account for process ownership before being considered reliable.

## Frontend

The frontend is React 19 with Vite. Its API client is `app/frontend/src/api.ts`.

Main pages include Dashboard, Jobs, Companies, Shortlist, Applications, Tasks, Profile, and Config. The floating Chat component currently saves pasted jobs; it is not connected to the backend `agent` intent router.

Keep filtering, pagination, and counts server-side when the dataset is large. Do not replace server queries with client-only filtering.

## Environment

Common variables include:

- `PORT`
- `DATABASE_URL`
- `DATABASE_POOL_SIZE`
- `REDIS_URL`
- `QUEUE_NAME`
- `WORKER_CONCURRENCY`
- `ENABLE_WORKER`
- `POLL_INTERVAL_HOURS`
- `DISCOVERY_INTERVAL_HOURS`
- `DISCOVERY_PROVIDER`
- `SERPAPI_KEY` or `SERP_API_KEY`
- `LLM_PROVIDER`
- `LLM_MODEL`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `OPENCODE_BASE_URL`
- `OPENCODE_MODEL`
- `OPENCODE_PROVIDER_ID`
- `ADMIN_API_TOKEN`
- `ENABLE_QUEUE_ADMIN`

Never print or rewrite secret values from `.env` unless the user explicitly requests a secret/configuration change.

## Development Commands

```bash
bun install
docker compose up -d
bun run db:migrate
bun dev
```

Targeted commands:

```bash
bun run dev:server
bun run dev:worker
bun run build:frontend
bun run db:studio
```

The root TypeScript configuration currently includes unrelated frontend and video TSX without JSX settings. Broad root type checks can therefore produce unrelated noise. Prefer targeted checks plus runtime smoke tests until the configuration is separated.

Useful smoke checks:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/api/stats
curl http://127.0.0.1:3000/api/config
```

For changes involving queues, also verify that a real task can be enqueued, processed, logged, observed through SSE, and completed or cancelled correctly.

## Planned NestJS Migration

The approved direction is:

- NestJS 11 with the Express adapter.
- Bun remains the package manager and runtime.
- Develop the replacement in parallel under `app/backend/src`.
- Use TypeORM in the NestJS replacement while preserving the existing PostgreSQL schema and data exactly.
- Keep Drizzle only in the live Express backend during migration; remove it after TypeORM parity and final cutover.
- Preserve the React frontend, Redis, BullMQ, API paths, response shapes, SSE contracts, and downloads.
- Use one general task queue and one isolated Playwright apply queue.
- Replace the unfinished ATS queues with one canonical source/ingestion pipeline.
- Perform one final cutover only after contract parity and runtime verification.

Until that migration is implemented, `app/src` remains authoritative. Do not move isolated files into the planned Nest tree without migrating a complete, testable domain boundary.

## Working Rules

1. Inspect real imports, callers, scripts, routes, and processes before claiming code is unused.
2. Preserve unrelated working-tree changes; do not reset or overwrite them.
3. Do not create commits unless explicitly requested.
4. Keep changes small and reviewable; avoid adding layers that do not clearly simplify the application.
5. Use `apply_patch` for source edits.
6. Prefer targeted runtime verification over noisy unrelated checks.
7. Keep backend behavior and frontend contracts synchronized.
8. Do not change database schema, queue payloads, task names, or public API shapes without an explicit migration path.
9. Never auto-submit a job application.
10. Be direct about incomplete or poor design; do not describe experimental code as production-ready.
