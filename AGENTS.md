# CV Autopilot — Agent Guide

Automated job hunting pipeline: fetches jobs, filters via AI, generates tailored CVs + application packages on demand via Telegram.

## Architecture

Single Bun process running Express server + Telegram bot + optional poller:

```
bun app/src/main.ts
       │
       ├── Express server (REST API + file serving on :3000)
       ├── Telegram bot (primary user interface)
       └── Optional poller (fetch+filter on schedule)
```

## Directory Structure

```
orchestration/
├── app/
│   ├── src/
│   │   ├── main.ts          # Entry point — starts server + bot + poller
│   │   ├── server.ts        # Express routes (minimal REST API)
│   │   ├── pipeline.ts      # Core pipeline functions
│   │   ├── telegram.ts      # Telegram bot with commands
│   │   ├── jobspy.ts        # Python JobSpy bridge (child process)
│   │   ├── db.ts            # SQLite — seen_jobs + applications tables
│   │   ├── latex.ts         # LaTeX → PDF resume builder
│   │   ├── opencode.ts      # OpenCode API client (LLM calls)
│   │   ├── prompts.ts       # Prompt builders for each LLM call
│   │   ├── utils.ts         # I/O helpers (read/write, CSV parse)
│   │   ├── types.ts         # TypeScript type definitions
│   │   └── schemas/         # Zod schemas for LLM response validation
│   ├── data/
│   │   ├── cv-autopilot.db  # SQLite database
│   │   ├── jobs.csv         # Temporary CSV from JobSpy
│   │   ├── debug/           # Schema mismatch debug logs
│   │   └── jobs/            # Per-company output
│   │       └── {company}/
│   │           ├── resume.json
│   │           ├── application.json
│   │           ├── application.md
│   │           └── resume.pdf
│   ├── skills/              # LLM system prompts
│   │   ├── job_filter.md    # AI filtering rules
│   │   ├── cv_profile.md    # Candidate profile + tailoring
│   │   └── application_prefs.md # Cover letter + email rules
│   └── output/
└── package.json
```

## Data Flow

```
/run command (Telegram)
       │
       ▼
fetchJobs() → JobSpy Python → jobs.csv
       │
       ▼
dedup against seen_jobs table (title|company key)
       │
       ▼
filterJobs() → AI evaluates each (job_filter.md) → accept/reject + score
       │
       ▼
Telegram: "🎯 Found 3 matching jobs: ... Reply with numbers to make CVs"
       │
       ▼
/make 1 3 (Telegram)
       │
       ▼
makeCvForJob() per selected job:
  1. generateResumeForJob() → AI tailors CV (cv_profile.md) → resume.json
  2. buildResumePdf() → LaTeX → resume.pdf
  3. saveAcceptedJob() → SQLite applications table
  4. generateApplicationForJob() → AI generates cover letter + email → application.json
  5. Save to data/jobs/{company}/
       │
       ▼
Telegram sends PDF + "✅ CV ready for {company}"
```

## Telegram Commands

| Command | Description |
|---|---|
| `/run` | Fetch jobs → dedup → AI filter → show shortlist |
| `/describe 1 3` | Show full descriptions + AI reasoning for selected jobs |
| `/make 1 3` | Generate CV + application package for selected jobs |
| `/status` | View all applications and their status |
| `/update {jobId} {status}` | Update status (ready/applied/rejected) |
| `/get {jobId}` | View application package markdown |
| `/help` | Show all commands |

## Key Design Decisions

- **Telegram reply context**: Uses `reply_to_message_id` to track which shortlist the user is acting on. No state machine needed for single user.
- **SQLite via bun:sqlite**: Zero-dependency persistent storage. Tables: `seen_jobs` (dedup), `applications` (tracker).
- **Dedup key**: `{normalizedTitle}|{normalizedCompany}` — catches 95% of JobSpy duplicates.
- **Per-company output**: `data/jobs/{company}/` keeps generated files organized.
- **Skills as prompts**: Edit markdown files in `skills/` to change AI behavior — no code changes.
- **Manual CV generation**: Pipeline never auto-generates CVs. User explicitly picks jobs with `/make`.
- **Poller (optional)**: Set `POLL_INTERVAL_HOURS` to auto-fetch on a schedule. Only logs new jobs — never generates CVs without user approval.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Express server port |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token (required for bot) |
| `DATABASE_PATH` | `data/cv-autopilot.db` | SQLite database path |
| `POLL_INTERVAL_HOURS` | `0` | Auto-fetch interval (0 = disabled) |
| `OPENCODE_BASE_URL` | `http://127.0.0.1:4096` | OpenCode API URL |
| `OPENCODE_MODEL` | — | Model ID |
| `OPENCODE_PROVIDER_ID` | — | Provider ID |
| `OPENCODE_TIMEOUT_MS` | `180000` | LLM timeout |

## Running

```bash
cd orchestration
bun dev           # Watch mode
bun start         # Production
```

## Adding a New Skill

1. Create `app/skills/{name}.md` with the system prompt
2. Add a prompt builder in `app/src/prompts.ts`
3. Add a Zod schema in `app/src/schemas/` for response validation
4. Add the step function in `app/src/pipeline.ts`
5. Wire it into the Telegram command in `app/src/telegram.ts`



## Special Instructions
1. be realistic Don't say it's good design if it's actually trash
2. if there is something you can improve just notify me at the same time so we can actually work on it
3. this is a project for fun we don't need to over engineer anything also we don't think complex data etc