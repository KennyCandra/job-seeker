import { isAbsolute, relative, resolve } from "path";

export function resolveContainedPath(root: string, target: string): string | null {
  const rootPath = resolve(root);
  const targetPath = resolve(target);
  const relativePath = relative(rootPath, targetPath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return null;
  }

  return targetPath;
}
