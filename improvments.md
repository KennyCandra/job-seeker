# CV Autopilot — Improvements Roadmap

## High Priority

### 1. Multi-Job Resume Generation
Currently the pipeline picks "the best accepted job" and generates one resume. Should generate tailored resumes for ALL accepted jobs above the score threshold.

**Changes needed:**
- Loop over all accepted jobs in `shortlist.json`
- Generate a `resume_{jobId}.json` and `application_{jobId}.md` for each
- Store all outputs in a structured `data/jobs/{jobId}/` directory

---

### 2. Human Review Step
Add a pause between filter → resume generation. Show the shortlist, let the user approve which jobs to proceed with before burning LLM calls.

**Changes needed:**
- After `shortlist.json` is generated, expose a `/review` endpoint
- User approves/rejects jobs manually
- Pipeline continues only for approved jobs

---

### 3. Duplicate Detection
Running the pipeline daily will keep surfacing the same jobs. Need to track already-processed jobs to avoid duplicates.

**Changes needed:**
- Add `data/seen_jobs.json` to track processed job IDs
- Before filtering, check each job against `seen_jobs.json`
- Append new job IDs after processing

---

### 4. Application Tracking
No way to track what happens after the package is generated. Need a simple tracker for application status.

**Changes needed:**
- Add `data/applications.json` with fields: `jobId`, `company`, `title`, `appliedAt`, `status` (applied / interviewing / rejected / ghosted)
- Expose `/applications` endpoint to update status
- Optional: simple CLI command to update status

---

## Medium Priority

### 5. Retry on LLM Schema Mismatch
Zod failures are logged to `data/debug/` but not retried automatically. Should retry with a slightly adjusted prompt before giving up.

**Changes needed:**
- In `opencode.ts`, wrap LLM calls in retry logic (max 3 attempts)
- On Zod failure, append "Return valid JSON only, no markdown" to the prompt and retry
- Log retry attempts to `data/debug/`

---

### 6. Score Threshold Config
Minimum score to accept a job is hardcoded. Should be configurable without touching code.

**Changes needed:**
- Add `MIN_SCORE` field to `skills/job_filter.md`
- Read threshold in `pipeline.ts` during filter step
- Default to 60 if not set

---

### 7. Multiple LLM Providers
Single point of failure on OpenCode. Should fallback to Claude or OpenAI if OpenCode fails.

**Changes needed:**
- Add Claude and OpenAI clients to `opencode.ts`
- Add provider priority config: `["opencode", "claude", "openai"]`
- On failure, try next provider automatically

---

## Nice to Have

### 8. Web UI Dashboard
Simple React frontend showing shortlisted jobs, generated resumes, and application status.

**Changes needed:**
- Add React frontend served by existing Express server
- Pages: Shortlist, Applications tracker, Resume preview
- Connect to existing REST API routes

---

### 9. Email Sending
Auto-send application emails for companies that accept direct email applications (like HeyReach).

**Changes needed:**
- Add `email` field to job data (if available)
- Add nodemailer or Resend integration
- Expose `/send` endpoint — always require manual trigger, never auto-send
- Log sent emails to `data/applications.json`

---

## Notes
- Always keep the apply step manual or at minimum requiring explicit confirmation
- Don't auto-send to jobs without human review of the generated package
- Keep `skills/` as the single source of truth for AI behavior — no hardcoded prompts in code