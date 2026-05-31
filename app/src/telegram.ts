import { Bot, InputFile, type Context } from "grammy";
import { fetchJobs, filterJobs, createClient, makeCvForJob, generateDocument, extractJobFromText } from "./pipeline.ts";
import { getApplications, updateApplicationStatus, saveAcceptedJob, getRecentJobs } from "./db.ts";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { jobDir, slug } from "./pipeline.ts";
import type { JobRecord, ResumePayload, FilterResult } from "./types.ts";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) console.warn("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled");

const bot = TOKEN ? new Bot(TOKEN) : null;

let lastShortlist: Array<{ job: JobRecord; filter: FilterResult }> = [];

type ReplyContext =
  | { stage: "approving"; jobIds: string[] }
  | { stage: "document"; job: JobRecord; resume: ResumePayload };

const replyContext = new Map<number, ReplyContext>();

function fmtScore(score: number): string {
  if (score >= 80) return "🟢";
  if (score >= 60) return "🟡";
  return "🔴";
}

function shortlistText(results: Array<{ job: JobRecord; filter: FilterResult }>): string {
  const lines = results.map((r, i) => {
    const tag = r.filter.verdict === "accept" ? fmtScore(r.filter.score) : "⛔";
    const line = `${i + 1}. ${tag} ${r.job.company} — ${r.job.title} (${r.filter.score})`;
    const hits = r.filter.must_have_hits.length > 0 ? "\n   ✓ " + r.filter.must_have_hits.slice(0, 3).join(", ") : "";
    const reasons = r.filter.reasons.length > 0 ? "\n   💬 " + r.filter.reasons.join("; ") : "";
    return line + hits + reasons;
  });

  return [
    `📋 ${results.length} jobs evaluated:\n`,
    ...lines,
    "",
    `Reply with numbers to generate CVs (e.g. "1 3")`,
    `Use /describe 1 3 to see descriptions`,
  ].join("\n");
}

function startBot() {
  if (!bot) return;

  const recent = getRecentJobs();
  for (const j of recent) {
    lastShortlist.push({ job: j, filter: { verdict: "accept", score: 100, reasons: ["Previous job"], must_have_hits: [], missing: [] } });
  }
  if (recent.length > 0) console.log(`Loaded ${recent.length} recent jobs into shortlist`);

  bot.catch((err) => {
    console.error("Bot error:", err.error);
    console.error("Error context:", JSON.stringify(err.ctx?.update?.message?.text));
  });

  bot.command("run", async (ctx: Context) => {
    await ctx.reply("🔍 Fetching and filtering jobs...");
    try {
      const client = createClient();
      const text = ctx.message?.text || "";
      const match = text.match(/\/run\s+(.+)/);
      const sites = match ? match[1].split(/\s+/) : undefined;
      const newJobs = await fetchJobs({ sites });
      if (newJobs.length === 0) {
        await ctx.reply("No new jobs found. Try different search filters.");
        return;
      }
      const results = await filterJobs(client, newJobs);
      if (results.length === 0) {
        await ctx.reply("All jobs failed AI filter parsing. Try again.");
        return;
      }
      lastShortlist = results;
      const msg = await ctx.reply(shortlistText(results));
      if (msg) replyContext.set(msg.message_id, { stage: "approving", jobIds: results.map((r) => r.job.id) });
    } catch (err: any) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  bot.command("describe", async (ctx: Context) => {
    const match = ctx.message?.text?.match(/\/describe\s+([\d\s]+)/);
    if (!match || lastShortlist.length === 0) {
      await ctx.reply("Usage: /describe 1 3 5. Run /run first.");
      return;
    }
    const indices = match[1].split(/\s+/).map(Number).filter((n) => n > 0 && n <= lastShortlist.length);
    if (indices.length === 0) {
      await ctx.reply("No valid numbers. Usage: /describe 1 3 5");
      return;
    }
    for (const i of indices) {
      const r = lastShortlist[i - 1];
      const desc = r.job.description?.slice(0, 800) || "No description";
      await ctx.reply(
        [
          `📋 ${r.job.company} — ${r.job.title}`,
          `📍 ${r.job.location}`,
          `🔗 ${r.job.url}`,
          `📄 ${desc}${r.job.description?.length > 800 ? "..." : ""}`,
          `Score: ${r.filter.score}/100`,
          ...r.filter.reasons.map((r) => `• ${r}`),
        ].join("\n"),
      );
    }
  });

  bot.command("make", async (ctx: Context) => {
    const match = ctx.message?.text?.match(/\/make\s+([\d\s]+)/);
    if (!match || lastShortlist.length === 0) {
      await ctx.reply("Usage: /make 1 3 5. Run /run first.");
      return;
    }
    const indices = match[1].split(/\s+/).map(Number).filter((n) => n > 0 && n <= lastShortlist.length);
    if (indices.length === 0) {
      await ctx.reply("No valid numbers. Usage: /make 1 3 5");
      return;
    }
    await ctx.reply(`📝 Generating CVs for ${indices.length} jobs...`);

    for (const i of indices) {
      const r = lastShortlist[i - 1];
      try {
        await ctx.reply(`⏳ ${r.job.company} — ${r.job.title}...`);
        const resume = await doMakeCv(ctx, r.job, r.filter);
        if (resume) {
          const msg = await ctx.reply(
            `✅ CV ready for ${r.job.company}\n\nWant me to generate anything else?\n` +
            `Reply: "cover letter", "recommendation letter", "custom: your message", or "done"`,
          );
          if (msg) replyContext.set(msg.message_id, { stage: "document", job: r.job, resume });
        }
      } catch (err: any) {
        await ctx.reply(`❌ Failed for ${r.job.company}: ${err.message}`);
      }
    }
  });

  bot.command("status", async (ctx: Context) => {
    const apps = getApplications();
    if (apps.length === 0) {
      await ctx.reply("No applications yet.");
      return;
    }
    const statusEmoji: Record<string, string> = { ready: "📄", applied: "📬", rejected: "❌" };
    const lines = apps.map((a) => `${statusEmoji[a.status] || "📄"} ${a.company} — ${a.title} | ${a.job_id} | ${a.status}`);
    await ctx.reply(["📊 Application Status:\n", ...lines].join("\n"));
  });

  bot.command("update", async (ctx: Context) => {
    const match = ctx.message?.text?.match(/\/update\s+(.+?)\s+(.+)/);
    if (!match) {
      await ctx.reply("Usage: /update {jobId} {status}. Statuses: ready, applied, rejected");
      return;
    }
    const jobId = match[1].trim();
    const status = match[2].trim().toLowerCase();
    if (!["ready", "applied", "rejected"].includes(status)) {
      await ctx.reply("Invalid status. Use: ready, applied, rejected");
      return;
    }
    updateApplicationStatus(jobId, status);
    await ctx.reply(`✅ ${jobId} → ${status}`);
  });

  bot.command("get", async (ctx: Context) => {
    const match = ctx.message?.text?.match(/\/get\s+(.+)/);
    if (!match) {
      await ctx.reply("Usage: /get {jobId}");
      return;
    }
    const jobId = match[1].trim();
    const app = getApplications().find((a) => a.job_id === jobId || a.id === jobId);
    if (!app) {
      await ctx.reply("Application not found.");
      return;
    }
    const dir = join(jobDir({ company: app.company, title: app.title, id: app.job_id, description: "" } as any), "../..", slug(app.company));
    const mdPath = join(dir, "application.md");
    try {
      const md = readFileSync(mdPath, "utf-8");
      for (let i = 0; i < md.length; i += 3000) {
        await ctx.reply(md.slice(i, i + 3000));
      }
    } catch {
      await ctx.reply(`No application package found for ${app.company}.`);
    }
  });

  bot.command("help", async (ctx: Context) => {
    await ctx.reply(
      [
        "/run — Fetch & filter (e.g. /run linkedin indeed glassdoor)",
        "/describe 1 3 — Show descriptions",
        "/make 1 3 — Generate CVs",
        "/status — View applications",
        "/update {jobId} {status} — Update status",
        "/get {jobId} — View application package",
        "",
        "📝 Paste any job description — AI extracts details, saves it, then /make to get a CV",
      ].join("\n"),
    );
  });

  bot.on("message:text", async (ctx: Context) => {
    const text = ctx.message?.text || "";
    if (text.startsWith("/")) return;

    const replyId = ctx.message?.reply_to_message?.message_id ?? 0;
    if (replyId && replyContext.has(replyId)) {
      const context = replyContext.get(replyId)!;
      await handleReply(ctx, context, text);
      return;
    }

    await ctx.reply("🔍 Extracting job details via AI...");
    try {
      const job = await extractJobFromText(text);
      const dummyFilter = { verdict: "accept" as const, score: 100, reasons: ["Custom job"], must_have_hits: [], missing: [] };
      lastShortlist.push({ job, filter: dummyFilter });
      saveAcceptedJob(job.id, job.company, job.title, job.location, job.site, job.url, 100);
      const idx = lastShortlist.length;
      const msg = await ctx.reply(
        `📋 **${job.company}** — ${job.title}\n` +
        `📍 ${job.location}\n` +
        `📄 Saved as #${idx}\n\n` +
        `Use /make ${idx} to generate a CV, or paste another job.`,
      );
    } catch (err: any) {
      await ctx.reply(`❌ Could not parse that as a job: ${err.message}`);
    }
  });

  bot.start();
  console.log("Telegram bot started");
}

async function handleReply(ctx: Context, context: ReplyContext, text: string) {
  if (context.stage === "approving") {
    const indices = text.split(/\s+/).map(Number).filter((n) => n > 0);
    if (indices.length === 0) {
      await ctx.reply("Please send numbers like: 1 3 5");
      return;
    }
    await ctx.reply(`📝 Generating CVs...`);

    for (const i of indices) {
      const r = context.jobIds[i - 1];
      const full = lastShortlist.find((s) => s.job.id === r);
      if (!full) continue;
      try {
        const resume = await doMakeCv(ctx, full.job, full.filter);
        if (resume) {
          const msg = await ctx.reply(
            `✅ CV ready for ${full.job.company}\n\nWant me to generate anything else?\n` +
            `Reply: "cover letter", "recommendation letter", "custom: your message", or "done"`,
          );
          if (msg) replyContext.set(msg.message_id, { stage: "document", job: full.job, resume });
        }
      } catch (err: any) {
        await ctx.reply(`❌ Failed for ${full.job.company}: ${err.message}`);
      }
    }
    return;
  }

  if (context.stage === "document") {
    const { job, resume } = context;
    const lower = text.toLowerCase().trim();

    if (lower === "done" || lower === "no" || lower === "cancel") {
      await ctx.reply(`👍 Application package for ${job.company} is complete!`);
      return;
    }

    if (lower === "cover letter" || lower === "1") {
      await ctx.reply("⏳ Generating cover letter...");
      try {
        const content = await generateDocument("custom", job, resume, "Write a professional cover letter, 150-220 words.");
        await ctx.reply(`📄 Cover Letter for ${job.company}:\n\n${content}`);
      } catch (err: any) {
        await ctx.reply(`❌ Error: ${err.message}`);
      }
      return;
    }

    if (lower === "recommendation letter" || lower === "recommendation" || lower === "2") {
      await ctx.reply("⏳ Generating recommendation letter...");
      try {
        const content = await generateDocument("recommendation", job, resume);
        await ctx.reply(`📄 Recommendation Letter for ${job.company}:\n\n${content}`);
      } catch (err: any) {
        await ctx.reply(`❌ Error: ${err.message}`);
      }
      return;
    }

    if (lower.startsWith("custom") || lower.startsWith("custom:") || lower === "3") {
      const instruction = lower.startsWith("custom")
        ? lower.replace(/^custom:?\s*/i, "")
        : "Write a professional message for this job application.";
      await ctx.reply("⏳ Generating custom message...");
      try {
        const content = await generateDocument("custom", job, resume, instruction || undefined);
        await ctx.reply(`📄 Custom Message for ${job.company}:\n\n${content}`);
      } catch (err: any) {
        await ctx.reply(`❌ Error: ${err.message}`);
      }
      return;
    }

    await ctx.reply(
      `Options for ${job.company}:\n` +
      `• "cover letter" — Generate cover letter\n` +
      `• "recommendation letter" — Generate recommendation letter\n` +
      `• "custom: your message" — Custom text\n` +
      `• "done" — Finished`,
    );
    return;
  }
}

async function doMakeCv(ctx: Context, job: JobRecord, filter: FilterResult): Promise<ResumePayload | null> {
  try {
    await makeCvForJob(job, filter);

    const dir = jobDir(job);
    const pdfFiles = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".pdf")) : [];
    if (pdfFiles.length > 0) {
      const pdfPath = join(dir, pdfFiles[0]);
      await ctx.replyWithDocument(new InputFile(pdfPath, `${slug(job.company)}-${slug(job.title)}.pdf`));
    }

    const resumePath = join(dir, "resume.json");
    if (existsSync(resumePath)) {
      return JSON.parse(readFileSync(resumePath, "utf-8"));
    }
    return null;
  } catch (err) {
    throw err;
  }
}

export { startBot };
