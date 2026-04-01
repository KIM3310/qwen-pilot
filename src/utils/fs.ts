import { readFile, writeFile, mkdir, readdir, stat, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { constants } from "node:fs";

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
}

export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const raw = await readTextFile(filePath);
  return JSON.parse(raw) as T;
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await writeTextFile(filePath, JSON.stringify(data, null, 2) + "\n");
}

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

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function isDirectory(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export function resolveFromRoot(...segments: string[]): string {
  return join(process.cwd(), ...segments);
}
