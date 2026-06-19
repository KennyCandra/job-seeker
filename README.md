# CV Autopilot

<p align="center">
  <video src="https://github.com/user-attachments/assets/a1f2e2c9-7e65-4de2-81bd-d3e79e6e0b55" width="640" controls></video>
</p>

<p align="center">
  <strong>Automated job-hunting pipeline.</strong>
  <br/>
  Discover → Fetch → AI-filter → Tailor CV → Auto-apply.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/runtime-Bun-000?logo=bun" alt="Bun"/>
  <img src="https://img.shields.io/badge/database-PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/queue-BullMQ-FF6B6B?logo=redis" alt="BullMQ"/>
  <img src="https://img.shields.io/badge/automation-Playwright-45ba4b?logo=playwright&logoColor=white" alt="Playwright"/>
  <img src="https://img.shields.io/badge/bot-Telegram-26A5E4?logo=telegram&logoColor=white" alt="Telegram"/>
  <img src="https://img.shields.io/badge/UI-React-61DAFB?logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/docs-Remotion-00D4AA?logo=video" alt="Remotion"/>
</p>

## What It Does

1. **Discover** companies with ATS job boards (Greenhouse, Lever, Ashby) via Playwright + SerpAPI.
2. **Sync** job listings from those endpoints, deduplicating and tracking open/closed status.
3. **Filter** using a two-stage pipeline: cheap deterministic rules first, then AI-powered LLM filtering on promising candidates.
4. **Generate** tailored CV/resume (LaTeX → PDF), cover letters, and recommendation letters via AI.
5. **Auto-apply** via Playwright — fills name, email, phone, LinkedIn, dropdowns, file uploads, and AI-answered free-text questions, then pauses before final submit for human review.
6. **Track** everything in PostgreSQL: companies, jobs, filters, documents, applications, task runs.

---

## Architecture

```
                    ┌──────────────┐
                    │   Telegram   │
                    │     Bot      │
                    └──────┬───────┘
                           │
┌──────────┐     ┌────────┴────────┐     ┌──────────┐
│  Poller  │────▶│   Express API   │◀────│ Frontend │
│ (cron)   │     │   :3000         │     │ (React)  │
└──────────┘     └────────┬────────┘     └──────────┘
                          │
                    ┌─────┴──────┐
                    │  BullMQ    │
                    │   Queue    │
                    │  (Redis)   │
                    └─────┬──────┘
                          │
                    ┌─────┴──────┐
                    │   Worker   │
                    │  (handlers)│
                    └────────────┘
                          │
                    ┌─────┴──────┐
                    │ PostgreSQL │
                    │ (Drizzle)  │
                    └────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Runtime | **Bun** — fast TS-native runtime |
| Backend | **Express 5** — REST API server |
| Database | **PostgreSQL 16** + **Drizzle ORM** |
| Job Queue | **BullMQ** + **Redis 7** |
| Automation | **Playwright** — browser-based ATS scraping & applying |
| AI / LLM | **OpenCode API** (local) or Anthropic / OpenAI |
| Bot | **grammY** — Telegram bot framework |
| Frontend | **React 19** + **Vite** — dashboard UI |
| Video | **Remotion** — programmatic demo video |
| PDF | **LaTeX** (pdflatex via Docker) |

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.2+
- [Docker](https://docker.com) — for PostgreSQL, Redis, and LaTeX PDF builder
- [Playwright](https://playwright.dev) — installs automatically via `postinstall`

### 1. Clone & Install

```bash
git clone <repo> && cd orchestration
bun install
```

### 2. Environment

```bash
cp .env.example .env   # (or use the existing .env)
```

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3000` | | Express server port |
| `TELEGRAM_BOT_TOKEN` | — | ✅ | Telegram bot token |
| `SERPAPI_KEY` | — | | SerpAPI API key (for company discovery) |
| `DATABASE_URL` | `postgres://cv_autopilot:cv_autopilot@localhost:5432/cv_autopilot` | | PostgreSQL connection |
| `OPENCODE_BASE_URL` | `http://127.0.0.1:4096` | | OpenCode API URL |
| `OPENCODE_MODEL` | — | | LLM model ID |
| `POLL_INTERVAL_HOURS` | `0` | | Auto-fetch interval (0 = disabled) |
| `ENABLE_WORKER` | `false` | | Run worker in main process |

### 3. Start Infrastructure

```bash
docker compose up -d   # starts PostgreSQL + Redis
```

### 4. Run Database Migrations

```bash
bun run db:migrate
```

### 5. Start the App

```bash
bun dev
```

This launches concurrently:
- **PostgreSQL + Redis** (Docker)
- **Express API server** (watched, port 3000)
- **BullMQ Worker** (processes background tasks)
- **React Frontend** (Vite dev server, proxied through :3000)

---

## Usage

### Telegram Bot

| Command | Description |
|---|---|
| `/run` | Fetch jobs → dedup → AI filter → show shortlist |
| `/describe 1 3` | Show full descriptions + AI reasoning for selected jobs |
| `/make 1 3` | Generate CV + application package for selected jobs |
| `/status` | View all applications and their status |
| `/update {jobId} {status}` | Update status (ready / applied / rejected) |
| `/get {jobId}` | View application package markdown |
| `/reset` | Reset conversation |
| `/help` | Show all commands |

> Natural language also works — the bot routes intents via the AI agent.

### Web Dashboard

Open **http://localhost:3000** for the full React management UI:

| Page | What it does |
|---|---|
| **Dashboard** | Stats overview — companies, jobs, shortlist, applications, docs |
| **Shortlist** | AI-filtered jobs with scores, verdicts, reasons |
| **Applications** | Tracker — update status, regenerate docs, view PDF |
| **Jobs** | Full table — pagination, search, filters by company/status/score |
| **Companies** | List, toggle active, discover new companies, trigger sync |
| **Tasks** | Live job queue — history, progress, logs via SSE |
| **Profile** | Edit name, email, phone, skills, experience, education, preferences |
| **Config** | Search roles, locations, exclude terms, ATS platforms, min score |

---

## Pipeline Flow

```
/run
  │
  ├── discoverCompanies()     ── Playwright + SerpAPI → companies table
  │
  ├── fetchJobs()             ── Scrape ATS endpoints → jobs table
  │
  ├── deduplicate()           ── title|company key → skip seen
  │
  ├── filterJobs()            ── LLM evaluates each → shortlist
  │
  └── Telegram: "🎯 Found N matching jobs"

/make 1 3
  │
  ├── generateResume()        ── AI tailors CV → LaTeX → PDF
  │
  ├── generateApplication()   ── Cover letter + email draft
  │
  ├── saveApplication()       ── applications table + files
  │
  └── Telegram: "✅ CV ready for {company}"
```

---

## Project Structure

```
orchestration/
├── app/
│   ├── src/
│   │   ├── server/           # Express routes (15 route modules)
│   │   ├── queue/            # BullMQ connection + worker
│   │   ├── tasks/            # Task handler system (discover, fetch, filter, apply...)
│   │   ├── pipeline/         # Pipeline orchestration
│   │   ├── discovery/        # Company & job discovery (Playwright, SerpAPI)
│   │   ├── filter/           # AI job filtering
│   │   ├── generator/        # Document generation (CV, cover letter)
│   │   ├── apply/            # Automated application runner (Playwright)
│   │   ├── agent/            # AI agent with intent routing
│   │   ├── telegram/         # Telegram bot interface
│   │   ├── poller/           # Scheduled polling
│   │   ├── db/               # PostgreSQL + Drizzle ORM (10 tables)
│   │   ├── shared/           # Shared types, config, LLM client, utilities
│   │   └── main.ts           # Entry point
│   ├── frontend/             # React 19 dashboard (8 pages)
│   ├── skills/               # Editable LLM system prompts (markdown)
│   └── templates/            # LaTeX resume template + Dockerfile
├── videos/
│   └── linkedin-app/         # Remotion video source
├── docker-compose.yml        # PostgreSQL + Redis
└── package.json
```

---

## Customization

Edit the markdown files in `app/skills/` to change AI behavior without touching code:

| File | Purpose |
|---|---|
| `job_filter.md` | Rules for what makes a job worth applying to |
| `cv_profile.md` | Your background, skills, experience for CV tailoring |
| `application_prefs.md` | Cover letter style, tone, email preferences |
| `documents.md` | Document generation instructions |

---

## Development

```bash
bun dev              # Full dev mode (all services watched)
bun run dev:server   # API server only
bun run dev:worker   # Worker only
bun run db:studio    # Drizzle Studio (DB GUI)
```

### Render the Demo Video

```bash
cd videos/linkedin-app && npm run render
# → out/cv-autopilot-linkedin.mp4
```
