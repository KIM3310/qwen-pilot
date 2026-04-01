import { join } from "node:path";
import { readJsonFile, writeJsonFile, fileExists, ensureDir, listFiles, logger } from "../utils/index.js";

export interface StateStore {
  baseDir: string;
  get<T = unknown>(namespace: string, key: string): Promise<T | null>;
  set(namespace: string, key: string, value: unknown): Promise<void>;
  delete(namespace: string, key: string): Promise<boolean>;
  list(namespace: string): Promise<string[]>;
  clear(namespace: string): Promise<void>;
}

export function createStateStore(baseDir: string): StateStore {
  function nsDir(namespace: string): string {
    return join(baseDir, namespace);
  }

  function keyPath(namespace: string, key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
    return join(nsDir(namespace), `${safeKey}.json`);
  }

  return {
    baseDir,

    async get<T = unknown>(namespace: string, key: string): Promise<T | null> {
      const p = keyPath(namespace, key);
      if (!(await fileExists(p))) return null;
      try {
        return await readJsonFile<T>(p);
      } catch {
        logger.warn(`Corrupted state entry: ${namespace}/${key}`);
        return null;
      }
    },

    async set(namespace: string, key: string, value: unknown): Promise<void> {
      await ensureDir(nsDir(namespace));
      await writeJsonFile(keyPath(namespace, key), value);
    },

    async delete(namespace: string, key: string): Promise<boolean> {
      const p = keyPath(namespace, key);
      if (!(await fileExists(p))) return false;
      const { unlink } = await import("node:fs/promises");
      await unlink(p);
      return true;
    },

    async list(namespace: string): Promise<string[]> {
      const files = await listFiles(nsDir(namespace), ".json");
      return files.map((f) => f.replace(/\.json$/, ""));
    },

    async clear(namespace: string): Promise<void> {
      const keys = await this.list(namespace);
      for (const key of keys) {
        await this.delete(namespace, key);
      }
    },
  };
}

export async function initializeStateDir(stateDir: string): Promise<StateStore> {
  await ensureDir(stateDir);
  await ensureDir(join(stateDir, "sessions"));
  await ensureDir(join(stateDir, "memory"));
  await ensureDir(join(stateDir, "history"));
  return createStateStore(stateDir);
}
