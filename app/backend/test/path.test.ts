import { describe, it, expect } from "bun:test";
import { existsSync } from "fs";
import { join } from "path";
import { resolveContainedPath, APP_ROOT, SKILLS_DIR, FRONTEND_DIST, TEMPLATES_DIR } from "../src/common/paths";
import { JOBS_DIR } from "../src/common/paths";

describe("APP_ROOT resolution", () => {
  it("resolves to the actual repo root, not a nested app/ dir", () => {
    expect(existsSync(join(APP_ROOT, "docker-compose.yml"))).toBe(true);
    expect(existsSync(join(APP_ROOT, "app", "backend"))).toBe(true);
  });

  it("finds the real skills directory with content", () => {
    expect(existsSync(join(SKILLS_DIR, "job_filter.md"))).toBe(true);
    expect(existsSync(join(SKILLS_DIR, "cv_profile.md"))).toBe(true);
  });

  it("points TEMPLATES_DIR at the repo-root templates folder", () => {
    expect(existsSync(join(TEMPLATES_DIR, "resume.tex"))).toBe(true);
  });

  it("never resolves inside a nested app/app path", () => {
    expect(APP_ROOT.includes(join("app", "app"))).toBe(false);
    expect(SKILLS_DIR.includes(join("app", "app"))).toBe(false);
    expect(FRONTEND_DIST.includes(join("app", "app"))).toBe(false);
  });
});

describe("resolveContainedPath", () => {
  it("allows a path inside the base directory", () => {
    const p = resolveContainedPath(JOBS_DIR, "company/job/file.md");
    expect(p).not.toBeNull();
    expect(p!.endsWith("company/job/file.md")).toBe(true);
  });

  it("rejects traversal attempts", () => {
    const p = resolveContainedPath(JOBS_DIR, "../../../etc/passwd");
    expect(p).toBeNull();
  });

  it("rejects absolute paths outside the base", () => {
    const p = resolveContainedPath(JOBS_DIR, "/etc/passwd");
    expect(p).toBeNull();
  });
});
