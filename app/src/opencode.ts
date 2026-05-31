import type { FilterResult, ResumePayload, ApplicationPayload } from "./types";

const DEFAULT_MODEL = "";
const DEFAULT_BASE_URL = "http://127.0.0.1:4096";
const DEFAULT_PROVIDER_ID = "";

export class OpenCodeClient {
  private baseUrl: string;
  private model: string;
  private providerId: string;
  private timeoutMs: number;
  private debugDir?: string;

  constructor(options: {
    baseUrl?: string;
    model?: string;
    providerId?: string;
    timeoutMs?: number;
    debugDir?: string;
  }) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.model = options.model || DEFAULT_MODEL;
    this.providerId = options.providerId || DEFAULT_PROVIDER_ID;
    this.timeoutMs = options.timeoutMs ?? 180000;
    this.debugDir = options.debugDir;
  }

  async completeJson(system: string, user: string): Promise<string> {
    const sessionId = await this.createSession();
    const body: Record<string, unknown> = {
      system,
      parts: [{ type: "text", text: user }],
    };
    if (this.model && this.providerId) {
      body.model = { modelID: this.model, providerID: this.providerId };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const start = Date.now();

    const res = await fetch(`${this.baseUrl}/session/${sessionId}/message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeout);
      const elapsed = Date.now() - start;
      console.log(`OpenCode response received in ${elapsed}ms`);
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenCode error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as { parts?: Array<{ type?: string; text?: string }> };
    const textParts = (json.parts || []).filter((part) => part.type === "text");
    const content = textParts.map((part) => part.text || "").join("").trim();
    if (!content) {
      throw new Error("OpenCode response missing content");
    }
    return content;
  }

  async filterJob(system: string, user: string): Promise<FilterResult> {
    const content = await this.completeJson(system, user);
    try {
      return parseJsonFromText<FilterResult>(content);
    } catch {
      this.logRawResponse("filter", content);
      const retry = await this.completeJson(`${system}\nReturn JSON only.`, `${user}\nReturn JSON only.`);
      return parseJsonFromText<FilterResult>(retry);
    }
  }

  async createResume(system: string, user: string): Promise<ResumePayload> {
    const content = await this.completeJson(system, user);
    try {
      return parseJsonFromText<ResumePayload>(content);
    } catch {
      this.logRawResponse("resume", content);
      const retry = await this.completeJson(`${system}\nReturn JSON only.`, `${user}\nReturn JSON only.`);
      return parseJsonFromText<ResumePayload>(retry);
    }
  }

  async createApplication(system: string, user: string): Promise<ApplicationPayload> {
    const content = await this.completeJson(system, user);
    try {
      return parseJsonFromText<ApplicationPayload>(content);
    } catch {
      this.logRawResponse("application", content);
      const retry = await this.completeJson(`${system}\nReturn JSON only.`, `${user}\nReturn JSON only.`);
      return parseJsonFromText<ApplicationPayload>(retry);
    }
  }

  private async createSession(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "ai-service" }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenCode session error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as { id?: string };
    if (!json.id) {
      throw new Error("OpenCode session missing id");
    }
    return json.id;
  }

  private logRawResponse(kind: string, content: string): void {
    if (!this.debugDir) return;
    const { mkdirSync, writeFileSync } = require("fs");
    const { join } = require("path");
    mkdirSync(this.debugDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = join(this.debugDir, `opencode-${kind}-${stamp}.txt`);
    writeFileSync(filePath, content, "utf-8");
  }
}

export function parseJsonFromText<T>(content: string): T {
  const direct = content.trim();
  if (!direct) {
    throw new Error("OpenCode response was empty");
  }
  if (direct.startsWith("{") && direct.endsWith("}")) {
    return JSON.parse(direct) as T;
  }

  const fenced = direct.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1]) as T;
  }

  const firstBrace = content.indexOf("{");
  if (firstBrace === -1) {
    throw new Error("OpenCode response missing JSON object");
  }

  let depth = 0;
  for (let i = firstBrace; i < content.length; i += 1) {
    const char = content[i];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      const slice = content.slice(firstBrace, i + 1);
      return JSON.parse(slice) as T;
    }
  }

  throw new Error("OpenCode response contained incomplete JSON");
}
