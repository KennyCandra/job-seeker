import type { AgentSkill } from "../types";

export function buildIntentPrompt(
  context: string,
  message: string,
  skills: Record<string, AgentSkill>,
) {
  const desc = Object.entries(skills)
    .map(([name, s]) => {
      const p = Object.entries(s.params)
        .map(([k, v]) => `  - ${k} (${v.type})${v.enum ? ` [${v.enum.join(", ")}]` : ""}: ${v.description}`)
        .join("\n");
      const req = s.required?.length ? `\n  Required: ${s.required.join(", ")}` : "";
      return `## ${name}\n${s.description}\n${p ? `Parameters:\n${p}${req}` : "Parameters: none"}`;
    })
    .join("\n\n");

  const examples = [
    { user: "search about senior python jobs", fn: "search_jobs", query: 'site:(greenhouse.io OR lever.co OR ashbyhq.com) "senior" python' },
    { user: "generate cv for this job", fn: "generate_cv" },
    { user: "write a cover letter", fn: "generate_document", args: { doc_type: "cover_letter" } },
    { user: "hello", fn: "chat" },
    { user: "what can you do", fn: "chat" },
  ].map((ex) => {
    const args = ex.args || (ex.query ? { query: ex.query } : {});
    return `User: "${ex.user}"\nReturn: {"function": "${ex.fn}", "reasoning": "", "arguments": ${JSON.stringify(args)}}`;
  }).join("\n\n");

  return {
    system: [
      "You are a function-calling assistant. You MUST call a function — never answer the user directly.",
      "",
      "Available functions:",
      desc,
      "",
      "Examples:",
      examples,
      "",
      "Rules:",
      '- Return ONLY a JSON object, no other text.',
      '- If the user wants to search/find jobs, call "search_jobs" with a proper Google dork query as the "query" argument.',
      '- If unclear or conversational, call "chat" with empty arguments.',
      "- Do not answer questions directly — always call a function.",
      "",
      `Current context:\n${context}`,
    ].join("\n"),
    user: message,
  };
}
