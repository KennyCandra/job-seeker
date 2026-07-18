"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenCodeClient = void 0;
exports.parseJsonFromText = parseJsonFromText;
const fs_1 = require("fs");
const path_1 = require("path");
const common_1 = require("@nestjs/common");
const DEFAULT_MODEL = "";
const DEFAULT_BASE_URL = "http://127.0.0.1:4096";
const DEFAULT_PROVIDER_ID = "";
class OpenCodeClient {
    static logger = new common_1.Logger(OpenCodeClient.name);
    baseUrl;
    model;
    providerId;
    timeoutMs;
    debugDir;
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
        this.model = options.model || DEFAULT_MODEL;
        this.providerId = options.providerId || DEFAULT_PROVIDER_ID;
        this.timeoutMs = options.timeoutMs ?? 180000;
        this.debugDir = options.debugDir;
    }
    static fromConfig(config) {
        return new OpenCodeClient({
            baseUrl: config.get("OPENCODE_BASE_URL", { infer: true }) || undefined,
            model: config.get("OPENCODE_MODEL", { infer: true }) || undefined,
            providerId: config.get("OPENCODE_PROVIDER_ID", { infer: true }) || undefined,
            timeoutMs: config.get("OPENCODE_TIMEOUT_MS", { infer: true }),
        });
    }
    async completeJson(system, user) {
        const sessionId = await this.createSession();
        const body = {
            system,
            parts: [{ type: "text", text: user }],
        };
        if (this.model) {
            body.model = { modelID: this.model, providerID: this.providerId || "" };
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        const start = Date.now();
        let status = 0;
        let responseText = "";
        try {
            const res = await fetch(`${this.baseUrl}/session/${sessionId}/message`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            status = res.status;
            responseText = await res.text();
            const elapsed = Date.now() - start;
            const modelStr = this.model ? `${this.providerId || ""}/${this.model}` : "default";
            const preview = responseText.replace(/\n/g, " ").slice(0, 200);
            OpenCodeClient.logger.log(`${elapsed}ms | ${modelStr} | ${status} | ${preview}...`);
            if (!res.ok) {
                throw new Error(`OpenCode error ${res.status}: ${responseText}`);
            }
            const json = JSON.parse(responseText);
            const textParts = (json.parts || []).filter((part) => part.type === "text");
            const content = textParts.map((part) => part.text || "").join("").trim();
            if (!content) {
                throw new Error("OpenCode response missing content");
            }
            this.logTrace("completeJson", { system, user }, { status, content, elapsed: Date.now() - start });
            return content;
        }
        catch (err) {
            this.logTrace("completeJson", { system, user }, { status, responseText, error: err.message });
            throw err;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    logTrace(kind, request, response) {
        if (!this.debugDir)
            return;
        (0, fs_1.mkdirSync)(this.debugDir, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filePath = (0, path_1.join)(this.debugDir, `opencode-${kind}-${stamp}.json`);
        (0, fs_1.writeFileSync)(filePath, JSON.stringify({ request, response, ts: new Date().toISOString() }, null, 2), "utf-8");
    }
    async filterJob(system, user) {
        const content = await this.completeJson(system, user);
        try {
            return parseJsonFromText(content);
        }
        catch {
            this.logRawResponse("filter", content);
            const retry = await this.completeJson(`${system}\nReturn JSON only.`, `${user}\nReturn JSON only.`);
            return parseJsonFromText(retry);
        }
    }
    async createResume(system, user) {
        const content = await this.completeJson(system, user);
        try {
            return parseJsonFromText(content);
        }
        catch {
            this.logRawResponse("resume", content);
            const retry = await this.completeJson(`${system}\nReturn JSON only.`, `${user}\nReturn JSON only.`);
            return parseJsonFromText(retry);
        }
    }
    async createApplication(system, user) {
        const content = await this.completeJson(system, user);
        try {
            return parseJsonFromText(content);
        }
        catch {
            this.logRawResponse("application", content);
            const retry = await this.completeJson(`${system}\nReturn JSON only.`, `${user}\nReturn JSON only.`);
            return parseJsonFromText(retry);
        }
    }
    async structured(system, user) {
        const content = await this.completeJson(system, user);
        return parseJsonFromText(content);
    }
    async createSession() {
        const res = await fetch(`${this.baseUrl}/session`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: "ai-service" }),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`OpenCode session error ${res.status}: ${text}`);
        }
        const json = (await res.json());
        if (!json.id) {
            throw new Error("OpenCode session missing id");
        }
        return json.id;
    }
    logRawResponse(kind, content) {
        if (!this.debugDir)
            return;
        (0, fs_1.mkdirSync)(this.debugDir, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filePath = (0, path_1.join)(this.debugDir, `opencode-${kind}-${stamp}.txt`);
        (0, fs_1.writeFileSync)(filePath, content, "utf-8");
    }
}
exports.OpenCodeClient = OpenCodeClient;
function parseJsonFromText(content) {
    const direct = content.trim();
    if (!direct) {
        throw new Error("OpenCode response was empty");
    }
    if (direct.startsWith("{") && direct.endsWith("}")) {
        return JSON.parse(direct);
    }
    const fenced = direct.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
        return JSON.parse(fenced[1]);
    }
    const firstBrace = content.indexOf("{");
    if (firstBrace === -1) {
        throw new Error("OpenCode response missing JSON object");
    }
    let depth = 0;
    for (let i = firstBrace; i < content.length; i += 1) {
        const char = content[i];
        if (char === "{")
            depth += 1;
        if (char === "}")
            depth -= 1;
        if (depth === 0) {
            const slice = content.slice(firstBrace, i + 1);
            return JSON.parse(slice);
        }
    }
    throw new Error("OpenCode response contained incomplete JSON");
}
//# sourceMappingURL=llm.js.map