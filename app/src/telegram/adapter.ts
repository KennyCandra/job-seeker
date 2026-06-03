import { InputFile } from "grammy";
import type { Context } from "grammy";
import type { SkillResult } from "../agent/types";

export async function sendResult(ctx: Context, result: SkillResult): Promise<void> {
  switch (result.type) {
    case "text":
      await ctx.reply(result.text);
      break;
    case "file":
      await ctx.replyWithDocument(new InputFile(result.path, result.filename));
      break;
    case "error":
      await ctx.reply(`❌ ${result.message}`);
      break;
    case "done":
      break;
  }
}
