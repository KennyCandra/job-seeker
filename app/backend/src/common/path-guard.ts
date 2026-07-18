import { join, resolve, relative, isAbsolute } from "path";
import { AppException } from "./errors";

/**
 * Resolve `target` against `baseDir`, ensuring the final path stays inside baseDir.
 * Mirrors the legacy filesystem containment check used for downloads and screenshots.
 */
export function resolveContainedPath(baseDir: string, target: string): string | null {
  let resolved: string;
  if (isAbsolute(target)) {
    resolved = target;
  } else {
    resolved = resolve(baseDir, target);
  }

  const relativePath = relative(baseDir, resolved);
  if (relativePath === "") return resolved;
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return null;
  }
  return resolved;
}

export function ensureContained(baseDir: string, target: string): string {
  const resolved = resolveContainedPath(baseDir, target);
  if (!resolved) {
    throw new AppException(403, "Invalid path");
  }
  return resolved;
}

export { join };
