type RawJob = Record<string, unknown>;

export type NormalizedJob = {
  id: string;
  externalId: string;
  url: string;
  title: string;
  location: string;
  description: string;
  rawJson: unknown;
};

export abstract class JobNormalizer {
  abstract normalize(raw: RawJob): NormalizedJob;

  protected cleanHtml(value: unknown): string {
    return String(value || "")
      .replace(/<[^>]*>/g, "")
      .trim()
      .slice(0, 3000);
  }

  protected string(value: unknown): string {
    return typeof value === "string" ? value : "";
  }
}