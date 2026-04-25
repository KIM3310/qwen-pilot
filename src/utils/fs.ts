import { constants } from "node:fs";
import { access, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Check whether a file or directory exists at the given path.
 *
 * @param filePath - Absolute or relative path to check.
 * @returns `true` if the path is accessible.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a file as a UTF-8 string.
 *
 * @param filePath - Path to the file.
 * @returns The file contents.
 */
export async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}

/**
 * Write a UTF-8 string to a file, creating parent directories as needed.
 *
 * @param filePath - Destination path.
 * @param content  - The string to write.
 */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
}

/**
 * Read and parse a JSON file.
 *
 * @param filePath - Path to the `.json` file.
 * @returns The parsed value.
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const raw = await readTextFile(filePath);
  return JSON.parse(raw) as T;
}

/**
 * Serialize a value as pretty-printed JSON and write it to a file.
 *
 * @param filePath - Destination path.
 * @param data     - The value to serialize.
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await writeTextFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * List file names in a directory, optionally filtered by extension.
 *
 * @param dirPath - Directory to list.
 * @param ext     - Optional extension filter (e.g. `".json"`).
 * @returns Array of matching file names (not full paths).
 */
export async function listFiles(dirPath: string, ext?: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath);
    if (ext) {
      return entries.filter((e) => e.endsWith(ext));
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * Ensure a directory exists, creating it (and parents) if necessary.
 *
 * @param dirPath - Directory path to create.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Check whether a path points to a directory.
 *
 * @param p - Path to check.
 * @returns `true` if it is a directory.
 */
export async function isDirectory(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Resolve path segments relative to `process.cwd()`.
 *
 * @param segments - Path segments to join.
 * @returns The resolved absolute path.
 */
export function resolveFromRoot(...segments: string[]): string {
  return join(process.cwd(), ...segments);
}
