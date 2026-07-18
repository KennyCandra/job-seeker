import { Injectable, Logger } from "@nestjs/common";
import { CompaniesRepository } from "../database/repositories";
import { TaskQueueService } from "../tasks/task-queue.service";
import { endpointForAts, slug as slugify } from "../common/paths";
import type { AtsPlatform } from "../shared/types";
import { AppException } from "../common/errors";

const ATS_PLATFORMS = new Set<AtsPlatform>(["greenhouse", "lever", "ashby", "custom"]);

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly companies: CompaniesRepository,
    private readonly queue: TaskQueueService,
  ) {}

  getAll() {
    return this.companies.getAll();
  }

  async create(input: { name: string; ats: AtsPlatform; boardUrl?: string; endpoint?: string }) {
    if (!input.name || !input.ats) throw new AppException(400, "name and ats required");
    if (!ATS_PLATFORMS.has(input.ats)) throw new AppException(400, "Invalid ats");
    const companySlug = slugify(input.name);
    const requestedEndpoint = input.endpoint || input.boardUrl || endpointForAts(companySlug, input.ats);
    const validationError = validateCompanyEndpoint(input.ats, requestedEndpoint);
    if (validationError) throw new AppException(400, validationError);
    const ok = await this.companies.save({
      name: input.name,
      ats: input.ats,
      endpoint: input.ats === "custom" ? "manual" : requestedEndpoint,
    });
    return { ok };
  }

  async setActive(slug: string, active: boolean) {
    if (active) await this.companies.reactivate(slug);
    else await this.companies.deactivate(slug);
    return { ok: true };
  }

  remove(slug: string) {
    return this.companies.deactivate(slug).then(() => ({ ok: true }));
  }

  discover() {
    return this.queue.enqueueTask("discover-companies", {}, { dedupeKey: "discover-companies" });
  }

  discoverLegacy() {
    return this.queue.enqueueTask("discover-companies", {}, { dedupeKey: "discover-companies" });
  }

  fetch(slug: string, filter?: boolean) {
    return this.queue.enqueueTask(
      "sync-company",
      { companySlug: slug, filter: Boolean(filter) },
      { dedupeKey: `sync-company:${slug}:${Boolean(filter)}` },
    );
  }
}

function validateCompanyEndpoint(ats: AtsPlatform, endpoint: string): string | null {
  if (ats === "custom") {
    return endpoint === "manual" || endpoint.trim() === "" ? null : "custom companies cannot store a fetchable endpoint";
  }
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return "endpoint must be a valid URL";
  }
  if (!["https:", "http:"].includes(url.protocol)) return "endpoint must use http or https";
  const host = url.hostname.toLowerCase();
  const allowedHosts: Record<Exclude<AtsPlatform, "custom">, string[]> = {
    greenhouse: ["boards.greenhouse.io", "boards-api.greenhouse.io", "job-boards.greenhouse.io"],
    lever: ["api.lever.co", "jobs.lever.co"],
    ashby: ["api.ashbyhq.com", "jobs.ashbyhq.com"],
  };
  if (!allowedHosts[ats].includes(host)) return `${ats} endpoint host is not allowed`;
  return null;
}
