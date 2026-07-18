import { chromium, type Page, type Frame } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { DATA_DIR } from "../common/paths";
import { OpenCodeClient, parseJsonFromText } from "../shared/llm";
import type { ApplicantProfile } from "./profile";
import type { ApplicationRunsRepository } from "../database/repositories/application-runs.repository";
import type { ApplicationRunStepsRepository } from "../database/repositories/application-run-steps.repository";
import { clearPausedApplySession, registerPausedApplySession } from "./sessions";

const FIELD_SELECTOR = [
  "textarea",
  "input:not([type='hidden']):not([type='file']):not([type='submit']):not([type='button']):not([type='checkbox']):not([type='radio'])",
].join(", ");

type QuestionField = {
  index: number;
  tag: string;
  type: string;
  label: string;
  value: string;
  maxLength: number | null;
};

type AiAnswer = {
  index: number;
  answer: string;
  confidence?: number;
  needsUser?: boolean;
  reason?: string;
};

type FileInputMeta = {
  index: number;
  id: string;
  name: string;
  aria: string;
  accept: string;
  labels: string[];
  nearbyText: string;
};

type FormDiscoveryResult = {
  fieldsDetected: number;
  submitFound: boolean;
  iframeUsed: boolean;
  blockers: string[];
};

export type ApplyRunOptions = {
  runId: string;
  jobId: string;
  url: string;
  profile: ApplicantProfile;
  answersMarkdown: string;
  headless?: boolean;
  /** Leave the browser open on anti-bot blocks so a human can intervene. */
  keepBrowserOnBlock?: boolean;
  /** LLM client for free-text question answering (built by the caller from config). */
  llm: OpenCodeClient;
  runsRepo: ApplicationRunsRepository;
  stepsRepo: ApplicationRunStepsRepository;
};

export type ApplyRunResult = {
  runId: string;
  status: "review" | "needs_user" | "failed";
  error?: string;
  stepCount: number;
  outputDir: string;
};

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function cleanFieldLabel(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\*+/g, "").trim().slice(0, 500);
}

export async function runApply(options: ApplyRunOptions): Promise<ApplyRunResult> {
  const { runId, jobId, url, profile, answersMarkdown, runsRepo, stepsRepo } = options;
  const keepBrowserOnBlock = options.keepBrowserOnBlock ?? false;
  const headless = keepBrowserOnBlock ? false : (options.headless ?? false);

  const outputDir = join(DATA_DIR, "screenshots", `apply-${jobId}-${Date.now()}`);
  mkdirSync(outputDir, { recursive: true });

  await runsRepo.updateStatus(runId, "running", { currentUrl: url, outputDir });

  let stepCounter = 0;
  let browser: any;
  let page!: Page;
  let activeFrame: Page | Frame | null = null;
  let resultStatus: "review" | "needs_user" | "failed" = "review";
  let browserKeepOpen = false;

  let fieldsDetected = 0;
  let fieldsFilled = 0;
  const filesUploaded: string[] = [];
  let submitFound = false;
  let formReady = false;
  const blockers: string[] = [];
  const missingProfileFields = [
    !profile.firstName ? "first name/name" : "",
    !profile.lastName ? "last name/name" : "",
    !profile.email ? "email" : "",
    !profile.phone ? "phone" : "",
  ].filter(Boolean);

  async function addStep(type: string, label: string, detail = "", screenshotPath?: string | null) {
    stepCounter++;
    await stepsRepo.create({
      id: `step-${runId}-${Date.now()}-${stepCounter}`,
      runId,
      type,
      label,
      detail,
      screenshotPath: screenshotPath ?? null,
    });
  }

  function removeBlocker(matcher: RegExp): void {
    for (let i = blockers.length - 1; i >= 0; i -= 1) {
      if (matcher.test(blockers[i])) blockers.splice(i, 1);
    }
  }

  async function shot(p: Page, label: string): Promise<string> {
    const path = join(outputDir, `${String(stepCounter).padStart(3, "0")}-${slug(label)}.png`);
    try {
      await p.screenshot({ path, fullPage: true });
      await addStep("screenshot", label, path, path);
      return path;
    } catch {
      return "";
    }
  }

  async function snapshotDom(p: Page, label: string) {
    const fields = await p.locator("input, textarea, select, button").evaluateAll((els) =>
      els.map((el) => {
        const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement;
        const id = input.id || "";
        const name = input.getAttribute("name") || "";
        const aria = input.getAttribute("aria-label") || "";
        const placeholder = input.getAttribute("placeholder") || "";
        const type = input.getAttribute("type") || input.tagName.toLowerCase();
        const text = input.textContent?.trim() || "";
        const labelText = id
          ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim() || ""
          : "";
        return { tag: input.tagName.toLowerCase(), type, id, name, aria, placeholder, labelText, text };
      }),
    );
    const path = join(outputDir, `${String(stepCounter).padStart(3, "0")}-${slug(label)}.json`);
    writeFileSync(path, JSON.stringify(fields, null, 2));
  }

  function ctx(): Page | Frame {
    return activeFrame || page;
  }

  async function handleCookieBanners(p: Page): Promise<boolean> {
    const patterns = [
      '#onetrust-accept-btn-handler',
      'button:has-text("Allow All Cookies")',
      'button:has-text("Allow All")',
      'button:has-text("Allow all")',
      'button:has-text("Accept All")',
      'button:has-text("Accept Cookies")',
      'button:has-text("Accept")',
      'button:has-text("Reject All")',
      'button:has-text("Reject")',
      'button:has-text("Decline")',
      'button:has-text("Close")',
      '[aria-label="Close"]',
      'button:has-text("Got it")',
      'button:has-text("Continue")',
      '.cookie-accept-btn',
      '.cc-btn',
    ];

    for (const pattern of patterns) {
      const btn = p.locator(pattern).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {});
        await p.waitForTimeout(500);
        await addStep("cookie_handled", "cookie-banner-dismissed", `Clicked: ${pattern}`);
        return true;
      }
    }

    return false;
  }

  async function findApplyButtonOrScrollToForm(p: Page): Promise<boolean> {
    const candidates = [
      p.getByRole("link", { name: /apply|application/i }).first(),
      p.getByRole("button", { name: /apply/i }).first(),
      p.locator("a, button").filter({ hasText: /apply\s*(now|for this job)?|application/i }).first(),
    ];

    for (const candidate of candidates) {
      if (!(await candidate.isVisible().catch(() => false))) continue;
      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      await candidate.click().catch(async () => {
        await candidate.click({ force: true }).catch(() => {});
      });
      await p.waitForTimeout(1600);
      await handleCookieBanners(p);
      await shot(p, "after-apply-click");
      return true;
    }

    const form = p.locator("form").first();
    if (await form.isVisible().catch(() => false)) {
      await form.scrollIntoViewIfNeeded();
      await shot(p, "scrolled-to-form");
      return true;
    }

    const applyText = p.locator("text=/apply\\s*now|apply\\s*for\\s*this\\s*job/i").last();
    if (await applyText.isVisible().catch(() => false)) {
      await applyText.scrollIntoViewIfNeeded().catch(() => {});
      await p.waitForTimeout(1000);
      await shot(p, "scrolled-to-apply-section");
      return true;
    }

    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(1000);
    await shot(p, "scrolled-bottom");
    return false;
  }

  async function waitForFormFields(p: Page, maxRetries = 8): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const blocker = await detectPageBlocker(p);
      if (blocker) {
        blockers.push(blocker);
        await addStep("needs_user", "page-blocked", blocker);
        return false;
      }

      const count = await p.locator(FIELD_SELECTOR).count().catch(() => 0);
      if (count > 0) return true;

      for (const frame of p.frames().filter((frame) => frame !== p.mainFrame())) {
        const fc = await frame.locator(FIELD_SELECTOR).count().catch(() => 0);
        if (fc > 0) return true;
      }

      await p.waitForTimeout(1500);
    }
    return false;
  }

  async function detectPageBlocker(p: Page): Promise<string | null> {
    const text = await p.locator("body").innerText({ timeout: 1000 }).catch(() => "");
    if (/press\s*&\s*hold|confirm you are a human|not a bot|captcha|verify you are human|security check/i.test(text)) {
      return "Human verification or anti-bot challenge detected";
    }
    const captchaFrames = p.locator('iframe[src*="captcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], iframe[src*="recaptcha"]');
    const count = await captchaFrames.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const frame = captchaFrames.nth(i);
      if (!(await frame.isVisible().catch(() => false))) continue;
      const box = await frame.boundingBox().catch(() => null);
      if (box && box.width > 250 && box.height > 120) {
        return "CAPTCHA challenge detected";
      }
    }
    return null;
  }

  async function countApplicantFields(context: Page | Frame): Promise<number> {
    const fields = context.locator(FIELD_SELECTOR);
    const count = await fields.count().catch(() => 0);
    let relevantCount = 0;

    for (let i = 0; i < count; i++) {
      const field = fields.nth(i);
      if (!(await field.isVisible().catch(() => false))) continue;

      const meta = await field.evaluate((el) => {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        const id = input.id || "";
        const name = input.getAttribute("name") || "";
        const aria = input.getAttribute("aria-label") || "";
        const placeholder = input.getAttribute("placeholder") || "";
        const labelText = id
          ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim() || ""
          : "";
        const nearby = input.closest("div, label, fieldset")?.textContent?.trim() || "";
        return `${labelText} ${aria} ${placeholder} ${name} ${id} ${nearby}`;
      }).catch(() => "");

      if (/first\s*name|last\s*name|email|phone|linkedin|resume|cv|cover\s*letter|submit|city|country/i.test(meta)) {
        relevantCount++;
      }
    }

    return relevantCount;
  }

  async function discoverFormFields(p: Page): Promise<FormDiscoveryResult> {
    const result: FormDiscoveryResult = {
      fieldsDetected: 0,
      submitFound: false,
      iframeUsed: false,
      blockers: [],
    };

    const mainFields = await countApplicantFields(p);
    result.fieldsDetected = mainFields;

    const submitBtn = p.locator("button[type='submit'], input[type='submit']").first();
    const fallbackSubmit = p.locator("button, input[type='submit']").filter({ hasText: /submit|send|apply/i }).first();
    result.submitFound = (await submitBtn.isVisible().catch(() => false)) || (await fallbackSubmit.isVisible().catch(() => false));

    if (mainFields < 2) {
      const frames = p.frames().filter((frame) => frame !== p.mainFrame());
      for (const frame of frames) {
        const fc = await countApplicantFields(frame);
        if (fc > result.fieldsDetected) {
          result.fieldsDetected = fc;
          result.iframeUsed = true;
          activeFrame = frame;

          const iframeSubmit = frame.locator("button[type='submit'], input[type='submit']").first();
          const iframeFallbackSubmit = frame.locator("button, input[type='submit']").filter({ hasText: /submit|send|apply/i }).first();
          result.submitFound = (await iframeSubmit.isVisible().catch(() => false)) || (await iframeFallbackSubmit.isVisible().catch(() => false));
        }
      }
    }

    if (result.iframeUsed) {
      await addStep("iframe_detected", "form-in-iframe", "Application form detected inside an iframe");
    }

    await addStep("form_detected", "form-discovery", `Detected ${result.fieldsDetected} fields, submit=${result.submitFound}, iframe=${result.iframeUsed}`);

    return result;
  }

  async function fillFieldWithVerify(context: Page | Frame, signals: RegExp[], value: string, label: string): Promise<boolean> {
    if (!value) return false;

    const fields = context.locator(FIELD_SELECTOR);
    const count = await fields.count();

    for (let i = 0; i < count; i++) {
      const field = fields.nth(i);
      if (!(await field.isVisible().catch(() => false))) continue;

      const meta = await field.evaluate((el) => {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        const id = input.id || "";
        const name = input.getAttribute("name") || "";
        const aria = input.getAttribute("aria-label") || "";
        const placeholder = input.getAttribute("placeholder") || "";
        const labelText = id
          ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim() || ""
          : "";
        const nearby = input.closest("div, label, fieldset")?.textContent?.trim() || "";
        return `${labelText} ${aria} ${placeholder} ${name} ${id} ${nearby}`;
      });

      if (!signals.some((rx) => rx.test(meta))) continue;

      await field.scrollIntoViewIfNeeded();
      await field.fill(value);
      await page.waitForTimeout(800);

      let filled = await field.inputValue().catch(() => "");
      if (!filled) {
        await page.waitForTimeout(700);
        filled = await field.evaluate((el) => (el as HTMLInputElement | HTMLTextAreaElement).value || "").catch(() => "");
      }
      if (!filled) {
        await addStep("verify_failed", `verify-${label}`, `Field not filled after attempt`);
        continue;
      }

      await shot(page, `filled-${label}`);
      await addStep("fill", label, value);
      return true;
    }

    await addStep("info", `skip-field-${label}`, `Could not find field: ${label}`);
    return false;
  }

  function answerSection(title: RegExp): string {
    const lines = answersMarkdown.split(/\r?\n/);
    let capturing = false;
    const section: string[] = [];

    for (const line of lines) {
      if (/^#{1,6}\s+/.test(line)) {
        const heading = line.replace(/^#{1,6}\s+/, "").trim();
        if (capturing) break;
        capturing = title.test(heading);
        continue;
      }
      if (capturing) section.push(line);
    }

    return section.join("\n").trim();
  }

  function hasPreferNotToDiscloseDefault(): boolean {
    const combined = `${profile.demographicAnswers}\n${answerSection(/demographic|equal employment|eeo/i)}\n${answersMarkdown}`;
    return /prefer not|do not wish|decline|not disclose|self-identify/i.test(combined);
  }

  function desiredChoiceForLabel(label: string): { value: string; kind: string } | null {
    const text = label.toLowerCase();

    if (/country|location/i.test(text) && profile.country) {
      return { value: profile.country, kind: "country" };
    }

    if (/pronoun/i.test(text)) {
      const pronouns = profile.pronouns || answerSection(/pronouns/i).split(/\r?\n/).find(Boolean)?.replace(/^[-*]\s*/, "").trim() || "";
      if (pronouns) return { value: pronouns, kind: "pronouns" };
    }

    if (/sponsor|visa|work authorization|authorized to work|work permit|legally authorized/i.test(text)) {
      const combined = `${profile.requiresSponsorship}\n${profile.authorizedCountries}\n${answerSection(/work authorization|sponsorship|visa/i)}\n${answersMarkdown}`;
      if (/do not require|don't require|no sponsorship|without sponsorship|not require/i.test(combined)) {
        if (/sponsor|visa/i.test(text)) return { value: "No", kind: "sponsorship" };
        return { value: "Yes", kind: "work-authorization" };
      }
      if (/require|need sponsorship/i.test(combined)) {
        if (/sponsor|visa/i.test(text)) return { value: "Yes", kind: "sponsorship" };
        return { value: "No", kind: "work-authorization" };
      }
    }

    if (/gender|race|ethnic|orientation|lgbt|transgender|veteran|disability|disabled|eeo|demographic/i.test(text)) {
      if (profile.veteranStatus && /veteran/i.test(text)) return { value: profile.veteranStatus, kind: "veteran" };
      if (profile.disabilityStatus && /disability|disabled/i.test(text)) return { value: profile.disabilityStatus, kind: "disability" };
      if (hasPreferNotToDiscloseDefault()) return { value: "Prefer not to disclose", kind: "demographic" };
    }

    return null;
  }

  function normalizeChoice(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function scoreChoice(optionText: string, desired: { value: string; kind: string }): number {
    const option = normalizeChoice(optionText);
    const target = normalizeChoice(desired.value);
    if (!option || /^select|choose|please select/.test(option)) return 0;
    if (option === target) return 100;
    if (option.includes(target) || target.includes(option)) return 80;

    if (desired.kind === "country" && profile.country && option.includes(normalizeChoice(profile.country))) return 90;
    if (desired.kind === "pronouns" && /he\s*him/.test(target) && /he\s*him/.test(option)) return 90;

    if (desired.kind === "sponsorship") {
      if (target === "no" && /\bno\b|do not|don't|not require|without sponsorship/i.test(optionText)) return 90;
      if (target === "yes" && /\byes\b|require|need/i.test(optionText)) return 90;
    }

    if (desired.kind === "work-authorization") {
      if (target === "yes" && /\byes\b|authorized|eligible/i.test(optionText)) return 90;
      if (target === "no" && /\bno\b|not authorized|not eligible/i.test(optionText)) return 90;
    }

    if (desired.kind === "demographic") {
      if (/prefer not|do not wish|don't wish|decline|not disclose|self-identify|not answer|choose not/i.test(optionText)) return 95;
    }

    if ((desired.kind === "veteran" || desired.kind === "disability") && /prefer not|decline|do not wish|not disclose/i.test(optionText)) {
      return 65;
    }

    return 0;
  }

  async function getControlLabel(control: any): Promise<string> {
    return control.evaluate((el: HTMLElement) => {
      const id = el.id || "";
      const name = el.getAttribute("name") || "";
      const aria = el.getAttribute("aria-label") || "";
      const labelledBy = el.getAttribute("aria-labelledby") || "";
      const labelledByText = labelledBy
        ? labelledBy.split(/\s+/).map((part) => document.getElementById(part)?.textContent?.trim() || "").join(" ")
        : "";
      const labelText = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim() || "" : "";
      const parentText = el.closest("label, fieldset, div")?.textContent?.trim() || "";
      return [labelText, aria, labelledByText, name, id, parentText].filter(Boolean).join(" | ").replace(/\s+/g, " ").slice(0, 900);
    }).catch(() => "");
  }

  async function fillNativeSelects(context: Page | Frame): Promise<number> {
    const selects = context.locator("select");
    const count = await selects.count().catch(() => 0);
    let filled = 0;

    for (let i = 0; i < count; i += 1) {
      const select = selects.nth(i);
      if (!(await select.isVisible().catch(() => false))) continue;
      const current = await select.inputValue().catch(() => "");
      if (current) continue;

      const label = await getControlLabel(select);
      const desired = desiredChoiceForLabel(label);
      if (!desired) continue;

      const options = await select.locator("option").evaluateAll((els) =>
        els.map((el) => ({
          value: (el as HTMLOptionElement).value,
          text: el.textContent?.replace(/\s+/g, " ").trim() || "",
        })),
      ).catch(() => []);

      const best = options
        .map((option) => ({ ...option, score: scoreChoice(`${option.text} ${option.value}`, desired) }))
        .filter((option) => option.score > 0)
        .sort((a, b) => b.score - a.score)[0];

      if (!best) {
        await addStep("info", "skip-dropdown", `No option match for ${cleanFieldLabel(label)}`);
        continue;
      }

      await select.scrollIntoViewIfNeeded().catch(() => {});
      await select.selectOption(best.value || { label: best.text }).catch(async () => {
        await select.selectOption({ label: best.text }).catch(() => {});
      });
      await page.waitForTimeout(400);
      await addStep("fill", `dropdown-${desired.kind}`, `${cleanFieldLabel(label)} -> ${best.text}`);
      filled += 1;
    }

    return filled;
  }

  async function fillCustomDropdowns(context: Page | Frame): Promise<number> {
    const controls = context.locator('[role="combobox"], button[aria-haspopup="listbox"], [aria-haspopup="listbox"]');
    const count = await controls.count().catch(() => 0);
    let filled = 0;

    for (let i = 0; i < count; i += 1) {
      const control = controls.nth(i);
      if (!(await control.isVisible().catch(() => false))) continue;

      const label = await getControlLabel(control);
      const desired = desiredChoiceForLabel(label);
      if (!desired) continue;

      await control.scrollIntoViewIfNeeded().catch(() => {});
      await control.click().catch(async () => control.press("Enter").catch(() => {}));
      await page.waitForTimeout(500);

      const options = page.locator('[role="option"], [role="menuitem"], li, [data-value], [data-testid*="option"]');
      const optionCount = Math.min(await options.count().catch(() => 0), 80);
      let bestIndex = -1;
      let bestScore = 0;
      let bestText = "";

      for (let optionIndex = 0; optionIndex < optionCount; optionIndex += 1) {
        const option = options.nth(optionIndex);
        if (!(await option.isVisible().catch(() => false))) continue;
        const text = await option.innerText().catch(() => "");
        const score = scoreChoice(text, desired);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = optionIndex;
          bestText = text.replace(/\s+/g, " ").trim();
        }
      }

      if (bestIndex < 0 || bestScore < 60) {
        await page.keyboard.press("Escape").catch(() => {});
        await addStep("info", "skip-dropdown", `No custom option match for ${cleanFieldLabel(label)}`);
        continue;
      }

      await options.nth(bestIndex).click().catch(async () => {
        await options.nth(bestIndex).click({ force: true }).catch(() => {});
      });
      await page.waitForTimeout(500);
      await addStep("fill", `dropdown-${desired.kind}`, `${cleanFieldLabel(label)} -> ${bestText}`);
      filled += 1;
    }

    return filled;
  }

  async function fillDropdownChoices(context: Page | Frame): Promise<number> {
    const nativeFilled = await fillNativeSelects(context);
    const customFilled = await fillCustomDropdowns(context);
    const total = nativeFilled + customFilled;
    if (total > 0) await shot(page, "filled-dropdowns");
    return total;
  }

  async function collectFreeTextQuestionFields(context: Page | Frame): Promise<QuestionField[]> {
    const fields = context.locator(FIELD_SELECTOR);
    const count = await fields.count();
    const questions: QuestionField[] = [];

    for (let i = 0; i < count; i += 1) {
      const field = fields.nth(i);
      if (!(await field.isVisible().catch(() => false))) continue;

      const meta = await field.evaluate((el) => {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        const id = input.id || "";
        const name = input.getAttribute("name") || "";
        const aria = input.getAttribute("aria-label") || "";
        const placeholder = input.getAttribute("placeholder") || "";
        const labelText = id
          ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim() || ""
          : "";
        const parentText = input.closest("label, fieldset, div")?.textContent?.trim() || "";
        const type = input.getAttribute("type") || input.tagName.toLowerCase();
        const role = input.getAttribute("role") || "";
        const ariaHasPopup = input.getAttribute("aria-haspopup") || "";
        const ariaExpanded = input.getAttribute("aria-expanded") || "";
        const readOnly = input.readOnly;
        return {
          tag: input.tagName.toLowerCase(),
          type,
          role,
          ariaHasPopup,
          ariaExpanded,
          readOnly,
          value: input.value || "",
          label: [labelText, aria, placeholder, name, id, parentText].filter(Boolean).join(" | ").slice(0, 700),
          maxLength: input.maxLength > 0 ? input.maxLength : null,
        };
      });

      const haystack = `${meta.label} ${meta.type}`.toLowerCase();
      if (meta.value.trim()) continue;
      if (meta.readOnly || /combobox|listbox|menu/i.test(`${meta.role} ${meta.ariaHasPopup} ${meta.ariaExpanded}`)) continue;
      if (meta.type && !["text", "textarea", "url", "search"].includes(meta.type.toLowerCase())) continue;
      if (
        /first\s*name|last\s*name|given\s*name|family\s*name|surname|email|phone|mobile|telephone|linkedin|website|portfolio|github|city|country|location|resume|cv|cover\s*letter/i.test(
          haystack,
        )
      ) {
        continue;
      }

      questions.push({
        index: i,
        tag: meta.tag,
        type: meta.type,
        label: cleanFieldLabel(meta.label),
        value: meta.value,
        maxLength: meta.maxLength,
      });
    }

    return questions;
  }

  async function answerFreeTextQuestions(p: Page, jobContext: string) {
    const context = ctx();
    const questions = await collectFreeTextQuestionFields(context);
    writeFileSync(join(outputDir, "ai-question-fields.json"), JSON.stringify(questions, null, 2));

    if (!questions.length) return;

    await addStep("info", "ai-questions-found", `Found ${questions.length} empty free-text question field(s)`);

    let answers: AiAnswer[] = [];
    try {
      const raw = await options.llm.completeJson(
        [
          "You answer job application free-text questions for a human review workflow.",
          "Return JSON only with this shape: {\"answers\":[{\"index\":number,\"answer\":string,\"confidence\":number,\"needsUser\":boolean,\"reason\":string}]}",
          "Use only the supplied candidate profile, answer bank, and job context.",
          "Prefer answers from the candidateAnswersMarkdown answer bank when they match the question. Adapt them to the specific job context where appropriate.",
          "Do not invent credentials, work authorization, location, education, employment history, or demographic details.",
          "If a question asks for sensitive/legal/demographic facts, compensation, availability, sponsorship, or any unknown personal fact, set needsUser true and answer to an empty string.",
          "For motivation questions, write concise, specific, truthful first-person answers suitable for a draft application.",
        ].join("\n"),
        JSON.stringify({
          candidate: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            phone: profile.phone,
            linkedin: profile.linkedin,
            website: profile.website,
            city: profile.city,
            country: profile.country,
            headline: profile.headline,
            background: profile.summary,
            targetRoles: profile.targetRoles,
          },
          candidateProfileMarkdown: profile.rawMarkdown,
          candidateAnswersMarkdown: answersMarkdown || "No answer bank provided.",
          jobContext: jobContext.slice(0, 6000),
          fields: questions.map((field) => ({
            index: field.index,
            label: field.label,
            maxLength: field.maxLength,
          })),
        }, null, 2),
      );
      const parsed = parseJsonFromText<{ answers?: AiAnswer[] }>(raw);
      answers = Array.isArray(parsed.answers) ? parsed.answers : [];
    } catch (error) {
      writeFileSync(join(outputDir, "ai-answer-error.json"), JSON.stringify({ error: (error as Error).message, fields: questions }, null, 2));
      await addStep("error", "ai-answer-failed", (error as Error).message);
      return;
    }

    writeFileSync(join(outputDir, "ai-answers.json"), JSON.stringify(answers, null, 2));

    for (const answer of answers) {
      const question = questions.find((field) => field.index === answer.index);
      if (!question) continue;
      if (answer.needsUser) {
        resultStatus = "needs_user";
        if (!blockers.includes(question.label)) blockers.push(`Needs user input: ${question.label}`);
        await addStep("needs_user", "needs-user-input", question.label, null);
        continue;
      }
      if (!answer.answer?.trim()) continue;
      if ((answer.confidence ?? 0) < 0.55) {
        await addStep("info", "low-confidence-skip", question.label);
        continue;
      }

      const field = context.locator(FIELD_SELECTOR).nth(answer.index);
      if (!(await field.isVisible().catch(() => false))) continue;

      const finalAnswer = question.maxLength ? answer.answer.slice(0, question.maxLength) : answer.answer;
      await field.scrollIntoViewIfNeeded();
      await field.fill(finalAnswer);
      await shot(page, `ai-filled-${question.label.slice(0, 40)}`);
      await addStep("ai_answer", question.label, finalAnswer.slice(0, 200));
    }
  }

  async function collectFileInputMeta(context: Page | Frame): Promise<FileInputMeta[]> {
    const inputs = context.locator("input[type='file']");
    const count = await inputs.count();
    const metas: FileInputMeta[] = [];

    for (let i = 0; i < count; i += 1) {
      const input = inputs.nth(i);
      const meta = await input.evaluate((el, index) => {
        const file = el as HTMLInputElement;
        const ancestorText: string[] = [];
        let parent = file.parentElement;
        for (let depth = 0; parent && depth < 6; depth += 1) {
          const text = parent.textContent?.replace(/\s+/g, " ").trim() || "";
          if (text) ancestorText.push(text.slice(0, 700));
          parent = parent.parentElement;
        }

        return {
          index,
          id: file.id || "",
          name: file.getAttribute("name") || "",
          aria: file.getAttribute("aria-label") || "",
          accept: file.getAttribute("accept") || "",
          labels: Array.from(file.labels || []).map((label) => label.textContent?.replace(/\s+/g, " ").trim() || ""),
          nearbyText: ancestorText.join(" | ").slice(0, 1400),
        };
      }, i);
      metas.push(meta);
    }

    return metas;
  }

  function scoreFileInput(meta: FileInputMeta, signals: RegExp[], blockers: RegExp[]): number {
    const idName = `${meta.id} ${meta.name}`;
    const labelText = `${meta.labels.join(" ")} ${meta.aria}`;
    const allText = `${idName} ${labelText} ${meta.nearbyText}`;

    if (blockers.some((rx) => rx.test(allText))) return 0;

    let score = 0;
    for (const signal of signals) {
      if (signal.test(idName)) score += 6;
      if (signal.test(labelText)) score += 4;
      if (signal.test(meta.nearbyText)) score += 2;
    }

    return score;
  }

  async function uploadFileBySignals(
    context: Page | Frame,
    kind: string,
    filePath: string,
    signals: RegExp[],
    blockerSignals: RegExp[],
  ): Promise<boolean> {
    if (!filePath) {
      await addStep("info", `skip-${kind}-upload`, `No ${kind} path configured`);
      return false;
    }

    if (!existsSync(filePath)) {
      blockers.push(`Missing ${kind} file: ${filePath}`);
      await addStep("info", `skip-${kind}-upload`, `File does not exist: ${filePath}`);
      return false;
    }

    const metas = await collectFileInputMeta(context);
    const ranked = metas
      .map((meta) => ({ meta, score: scoreFileInput(meta, signals, blockerSignals) }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = ranked[0]?.meta;
    if (!best) {
      await addStep("info", `skip-${kind}-upload`, `Could not find matching ${kind} upload input`);
      return false;
    }

    const input = context.locator("input[type='file']").nth(best.index);
    await input.setInputFiles(resolve(filePath));
    await page.waitForTimeout(700);
    await shot(page, `uploaded-${kind}`);
    await addStep("upload", kind, filePath);
    return true;
  }

  async function uploadApplicationFiles(p: Page) {
    const context = ctx();
    const before = await collectFileInputMeta(context);
    writeFileSync(join(outputDir, "file-inputs.json"), JSON.stringify(before, null, 2));

    const uploadedResume = await uploadFileBySignals(context, "resume", profile.resumePath, [/\bresume\b/i, /\bcv\b/i], [/cover\s*letter/i]);
    if (uploadedResume) filesUploaded.push("resume");

    const uploadedCL = await uploadFileBySignals(context, "cover-letter", profile.coverLetterPath, [/cover\s*letter/i], []);
    if (uploadedCL) filesUploaded.push("cover-letter");
  }

  async function markSubmitButton(p: Page) {
    const context = ctx();
    const preferred = context.locator("form button[type='submit'], form input[type='submit']").last();
    const fallback = context.locator("form button, form input[type='submit']").filter({ hasText: /submit|send|apply/i }).last();
    const submit = (await preferred.isVisible().catch(() => false)) ? preferred : fallback;

    if (await submit.isVisible().catch(() => false)) {
      submitFound = true;
      await submit.scrollIntoViewIfNeeded();
      await submit.evaluate((el) => {
        (el as HTMLElement).style.outline = "4px solid #ef4444";
        (el as HTMLElement).style.outlineOffset = "4px";
      });
      await shot(p, "final-review-submit-not-clicked");
      await addStep("safety_stop", "final-review", "Submit button highlighted but not clicked");
    } else {
      await shot(p, "final-review-no-submit-found");
      await addStep("safety_stop", "final-review", "No submit button found");
    }
  }

  function buildSummary(requiredEmptyCount: number) {
    return {
      stepCount: stepCounter,
      outputDir,
      fieldsDetected,
      fieldsFilled,
      filesUploaded,
      requiredEmptyCount,
      submitFound,
      formReady,
      blockers,
    };
  }

  async function pauseForHumanVerification(pageBlocker: string): Promise<ApplyRunResult> {
    if (!blockers.includes(pageBlocker)) blockers.push(pageBlocker);
    resultStatus = "needs_user";

    if (keepBrowserOnBlock) {
      browserKeepOpen = true;
      const blockerMsg = "Human verification detected; browser left open for manual action";
      await addStep("needs_user", "browser-left-open", blockerMsg);
      await shot(page, "page-blocked-browser-left-open");
      await runsRepo.updateStatus(runId, resultStatus, { currentUrl: page.url(), summary: buildSummary(0) });

      registerPausedApplySession({
        runId,
        browser,
        page,
        createdAt: new Date().toISOString(),
        reason: pageBlocker,
        resume: resumeAfterHumanVerification,
        cancel: cancelPausedRun,
      });

      return { runId, status: resultStatus, stepCount: stepCounter, outputDir };
    }

    await addStep("needs_user", "page-blocked", pageBlocker);
    await shot(page, "page-blocked-needs-user");
    await runsRepo.updateStatus(runId, resultStatus, { currentUrl: page.url(), summary: buildSummary(0) });
    return { runId, status: resultStatus, stepCount: stepCounter, outputDir };
  }

  async function resumeAfterHumanVerification(): Promise<ApplyRunResult> {
    await addStep("page_prepare", "resume-after-human-verification", "Resuming from open browser after manual action");
    const pageBlocker = await detectPageBlocker(page);
    if (pageBlocker) {
      if (!blockers.includes(pageBlocker)) blockers.push(pageBlocker);
      const blockerMsg = "Human verification is still present; browser left open";
      await addStep("needs_user", "browser-left-open", blockerMsg);
      await shot(page, "page-still-blocked-browser-left-open");
      await runsRepo.updateStatus(runId, "needs_user", { currentUrl: page.url(), summary: buildSummary(0) });
      return { runId, status: "needs_user", stepCount: stepCounter, outputDir };
    }

    removeBlocker(/human verification|anti-bot|captcha|browser left open/i);
    browserKeepOpen = false;
    clearPausedApplySession(runId);

    try {
      return await continueApplyFromCurrentPage();
    } finally {
      await browser.close().catch(() => {});
    }
  }

  async function cancelPausedRun(): Promise<void> {
    clearPausedApplySession(runId);
    browserKeepOpen = false;
    const message = "Apply run cancelled by user";
    blockers.push(message);
    await addStep("error", "run-cancelled", message);
    await runsRepo.updateStatus(runId, "failed", { error: message, currentUrl: page.url(), summary: buildSummary(0) });
    await browser.close().catch(() => {});
  }

  async function continueApplyFromCurrentPage(): Promise<ApplyRunResult> {
    const pageBlocker = await detectPageBlocker(page);
    if (pageBlocker) {
      return pauseForHumanVerification(pageBlocker);
    }

    const hasFormFields = await waitForFormFields(page);
    if (!hasFormFields) {
      blockers.push("No form fields appeared after page preparation and waiting");
      await addStep("form_not_ready", "form-not-ready", "No form fields appeared after waiting");
    }

    // Phase 2: Form Discovery
    const discovery = await discoverFormFields(page);
    fieldsDetected = discovery.fieldsDetected;
    submitFound = discovery.submitFound;
    for (const b of discovery.blockers) {
      if (!blockers.includes(b)) blockers.push(b);
    }

    if (fieldsDetected < 2) {
      resultStatus = "needs_user";
      await addStep("form_not_ready", "insufficient-fields", `Only ${fieldsDetected} applicant fields detected`);
    }

    // Phase 3: Fill known fields one at a time with verification
    const fillContext = ctx();

    if (await fillFieldWithVerify(fillContext, [/first\s*name/i, /given\s*name/i], profile.firstName, "first-name")) fieldsFilled++;
    if (await fillFieldWithVerify(fillContext, [/last\s*name/i, /family\s*name/i, /surname/i], profile.lastName, "last-name")) fieldsFilled++;
    if (await fillFieldWithVerify(fillContext, [/email/i], profile.email, "email")) fieldsFilled++;
    if (await fillFieldWithVerify(fillContext, [/phone|mobile|telephone/i], profile.phone, "phone")) fieldsFilled++;
    if (await fillFieldWithVerify(fillContext, [/linkedin/i], profile.linkedin, "linkedin")) fieldsFilled++;
    if (await fillFieldWithVerify(fillContext, [/website|portfolio|github|personal\s*site/i], profile.website, "website")) fieldsFilled++;
    if (await fillFieldWithVerify(fillContext, [/city|location/i], profile.city, "city")) fieldsFilled++;
    if (await fillFieldWithVerify(fillContext, [/country/i], profile.country, "country")) fieldsFilled++;
    fieldsFilled += await fillDropdownChoices(fillContext);

    // Phase 4: AI-powered free-text answers
    const jobContext = await page.locator("body").innerText().catch(() => "");
    await answerFreeTextQuestions(page, jobContext);

    // Phase 5: File uploads
    await uploadApplicationFiles(page);

    // Phase 6: Check required empty fields
    const requiredEmptyContext = ctx();
    const requiredEmpty = await requiredEmptyContext.locator("input[required], textarea[required], select[required]").evaluateAll((els) =>
      els
        .map((el) => {
          const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          return {
            tag: input.tagName.toLowerCase(),
            type: input.getAttribute("type") || input.tagName.toLowerCase(),
            name: input.getAttribute("name") || "",
            id: input.id || "",
            value: input.value || "",
          };
        })
        .filter((field) => !field.value),
    );
    writeFileSync(join(outputDir, "required-empty.json"), JSON.stringify(requiredEmpty, null, 2));

    if (requiredEmpty.length > 0) {
      resultStatus = "needs_user";
      blockers.push(`${requiredEmpty.length} required field(s) still empty`);
      await addStep("needs_user", "required-fields-empty", `Found ${requiredEmpty.length} required empty fields`);
    }

    // Phase 7: Mark submit button (safety stop)
    await markSubmitButton(page);

    if (fieldsFilled === 0) {
      resultStatus = "needs_user";
      blockers.push("No applicant fields were filled");
      await addStep("form_not_ready", "no-fields-filled", "No applicant fields were filled");
    }

    if (!submitFound) {
      resultStatus = "needs_user";
      blockers.push("Submit button was not found");
    }

    // Determine final status: review only when the agent actually filled the form and found submit.
    if (fieldsFilled > 0 && submitFound && requiredEmpty.length === 0 && blockers.length === 0) {
      resultStatus = "review";
    } else {
      resultStatus = "needs_user";
    }

    formReady = fieldsFilled > 0;

    const summaryPayload = buildSummary(requiredEmpty.length);

    await runsRepo.updateStatus(runId, resultStatus, { currentUrl: page.url(), summary: summaryPayload });
    return { runId, status: resultStatus, stepCount: stepCounter, outputDir };
  }

  try {
    for (const missing of missingProfileFields) {
      const blocker = `Missing applicant profile field: ${missing}`;
      blockers.push(blocker);
      await addStep("needs_user", "profile-missing", blocker);
    }

    browser = await chromium.launch({ headless });
    page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);
    await shot(page, "opened-job-page");
    await snapshotDom(page, "opened-dom");

    // Phase 1: Page Preparation
    await addStep("page_prepare", "page-prep-start", "Starting page preparation");
    const cookieHandled = await handleCookieBanners(page);
    if (cookieHandled) {
      await addStep("page_prepare", "cookie-handled", "Cookie/dialog banner was dismissed");
    }
    await findApplyButtonOrScrollToForm(page);
    await snapshotDom(page, "form-dom");

    return await continueApplyFromCurrentPage();
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    resultStatus = "failed";
    if (!blockers.includes(errorMsg)) blockers.push(errorMsg);

    try {
      if (page) {
        await shot(page, "error-state");
        await addStep("error", "run-failed", errorMsg);
      }
    } catch {}

    await runsRepo.updateStatus(runId, "failed", {
      error: errorMsg,
      currentUrl: page?.url() || url,
      summary: buildSummary(0),
    });

    return { runId, status: "failed", error: errorMsg, stepCount: stepCounter, outputDir };
  } finally {
    if (browser && !browserKeepOpen) await browser.close().catch(() => {});
  }
}
