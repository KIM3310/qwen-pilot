import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let cachedVersion: string | null = null;

/**
 * Read the package version from `package.json`.
 *
 * The result is cached after the first call.
 *
 * @returns The semver version string (e.g. `"1.0.0"`).
 */
export function getVersion(): string {
  if (cachedVersion) return cachedVersion;

  try {
    // Resolve relative to this file -> src/utils -> src -> project root
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(currentDir, "..", "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    cachedVersion = pkg.version ?? "0.0.0";
  } catch {
    cachedVersion = "0.0.0";
  }

  return cachedVersion!;
}
