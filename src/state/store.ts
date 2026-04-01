import { join } from "node:path";
import { readJsonFile, writeJsonFile, fileExists, ensureDir, listFiles, logger } from "../utils/index.js";

/** A namespaced key-value store backed by the filesystem. */
export interface StateStore {
  /** Root directory of the store. */
  baseDir: string;
  /**
   * Retrieve a value by namespace and key.
   *
   * @returns The stored value, or `null` if not found.
   */
  get<T = unknown>(namespace: string, key: string): Promise<T | null>;
  /**
   * Persist a value under the given namespace and key.
   */
  set(namespace: string, key: string, value: unknown): Promise<void>;
  /**
   * Delete a key from a namespace.
   *
   * @returns `true` if the key existed and was removed.
   */
  delete(namespace: string, key: string): Promise<boolean>;
  /**
   * List all keys in a namespace.
   */
  list(namespace: string): Promise<string[]>;
  /**
   * Remove all keys in a namespace.
   */
  clear(namespace: string): Promise<void>;
}

/**
 * Create a filesystem-backed state store rooted at `baseDir`.
 *
 * Each namespace becomes a subdirectory; each key becomes a JSON file.
 *
 * @param baseDir - Absolute path to the store root.
 * @returns A {@link StateStore} instance.
 */
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

/**
 * Create the state directory structure and return a ready-to-use store.
 *
 * @param stateDir - Absolute path to the `.qwen-pilot` directory.
 * @returns An initialised {@link StateStore}.
 */
export async function initializeStateDir(stateDir: string): Promise<StateStore> {
  await ensureDir(stateDir);
  await ensureDir(join(stateDir, "sessions"));
  await ensureDir(join(stateDir, "memory"));
  await ensureDir(join(stateDir, "history"));
  return createStateStore(stateDir);
}
