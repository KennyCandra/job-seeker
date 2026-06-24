import { createHash } from "crypto";
import { companies, jobs } from "../db";
import { extractJobFromText } from "../shared/documents";

const CUSTOM_COMPANY = {
  slug: "custom",
  name: "Custom",
  ats: "custom" as const,
  endpoint: "manual",
};

export type ManualJobResult = {
  id: string;
  companySlug: string;
  companyName: string;
  title: string;
  location: string;
  url: string;
  description: string;
  status: string;
};

export async function saveManualJobFromText(text: string): Promise<ManualJobResult> {
  const pastedText = text.trim();
  if (pastedText.length < 20) {
    throw new ManualJobValidationError("Paste at least 20 characters of job text");
  }

  const extracted = await extractJobFromText(pastedText);
  const company = await ensureCustomCompany();
  const externalId = manualExternalId(extracted.url, extracted.title, pastedText);
  const id = `manual-${externalId}`;

  await jobs.instance.save({
    id,
    companyId: company.id,
    externalId,
    url: extracted.url || "",
    title: extracted.title || "Unknown Position",
    location: extracted.location || "Unknown",
    description: extracted.description || pastedText,
    rawJson: {
      source: "manual-paste",
      extractedCompany: extracted.company || "",
      pastedText,
    },
    status: "open",
  });

  const saved = await jobs.instance.getById(id);
  if (!saved) throw new Error(`Manual job was saved but could not be loaded: ${id}`);

  return {
    id: saved.id,
    companySlug: saved.companySlug,
    companyName: saved.companyName,
    title: saved.title,
    location: saved.location,
    url: saved.url,
    description: saved.description,
    status: saved.status,
  };
}

export class ManualJobValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManualJobValidationError";
  }
}

async function ensureCustomCompany() {
  let company = await companies.instance.getBySlug(CUSTOM_COMPANY.slug);
  if (company) return company;

  await companies.instance.save(CUSTOM_COMPANY);
  company = await companies.instance.getBySlug(CUSTOM_COMPANY.slug);
  if (!company) throw new Error("Failed to create Custom company");

  return company;
}

function manualExternalId(url: string | undefined, title: string | undefined, pastedText: string): string {
  const normalizedUrl = (url || "").trim().toLowerCase();
  const basis = normalizedUrl || `${(title || "").trim().toLowerCase()}\n${pastedText.slice(0, 2000)}`;
  return createHash("sha256").update(basis).digest("hex").slice(0, 16);
}
