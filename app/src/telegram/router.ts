import type { Context } from "grammy";
import { handleIntent } from "../agent/router";
import { skills } from "../agent/skills/index";
import { sendResult } from "./adapter";
import type { SessionState } from "../agent/types";

export type { SessionState };

export async function handleMessage(text: string, ctx: Context, session: SessionState): Promise<void> {
  try {
    const result = await handleIntent(text, session, skills);

    if ("type" in result) {
      await sendResult(ctx, result);
      return;
    }

    const skill = skills[result.skill];
    if (!skill) {
      await ctx.reply(`Unknown function "${result.skill}".`);
      return;
    }

    const skillResult = await skill.execute(result.args, session, text);
    await sendResult(ctx, skillResult);
  } catch (err: any) {
    await ctx.reply(`Error: ${err.message}`);
  }
}
