import { Bot } from "grammy";
import { handleMessage, type SessionState } from "./router";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) console.warn("TELEGRAM_BOT_TOKEN not set — bot disabled");

const bot = TOKEN ? new Bot(TOKEN) : null;
const sessions = new Map<number, SessionState>();

function startBot() {
  if (!bot) return;

  bot.catch((err) => console.error("Bot error:", err.error));

  bot.command("reset", async (ctx) => {
    const uid = ctx.from?.id;
    if (uid) { sessions.delete(uid); await ctx.reply("Reset. What now?"); }
  });

  bot.on("message:text", async (ctx) => {
    if (ctx.from?.id !== 645820425) return;
    const text = ctx.message?.text || "";
    if (text.startsWith("/")) return;
    const uid = ctx.from?.id;
    if (!uid) return;
    if (!sessions.has(uid)) sessions.set(uid, { recent_jobs: [] });
    const session = sessions.get(uid)!;
    await handleMessage(text, ctx, session);
  });

  bot.start().catch((err) => console.error("[bot] Start failed:", err));
  console.log("[bot] Started");
}

export { startBot };
