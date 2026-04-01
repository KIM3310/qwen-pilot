import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createStateStore, initializeStateDir } from "../src/state/store.js";

describe("StateStore", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-state-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should get null for non-existent key", async () => {
    const store = createStateStore(tempDir);
    const val = await store.get("ns", "missing");
    expect(val).toBeNull();
  });

  it("should set and get a value", async () => {
    const store = createStateStore(tempDir);
    await store.set("sessions", "s1", { id: "s1", status: "active" });
    const val = await store.get<{ id: string; status: string }>("sessions", "s1");
    expect(val).not.toBeNull();
    expect(val!.id).toBe("s1");
    expect(val!.status).toBe("active");
  });

  it("should delete an existing key", async () => {
    const store = createStateStore(tempDir);
    await store.set("ns", "key1", "value1");
    const deleted = await store.delete("ns", "key1");
    expect(deleted).toBe(true);
    const val = await store.get("ns", "key1");
    expect(val).toBeNull();
  });

  it("should return false when deleting non-existent key", async () => {
    const store = createStateStore(tempDir);
    const deleted = await store.delete("ns", "nope");
    expect(deleted).toBe(false);
  });

  it("should list keys in a namespace", async () => {
    const store = createStateStore(tempDir);
    await store.set("items", "a", 1);
    await store.set("items", "b", 2);
    await store.set("items", "c", 3);
    const keys = await store.list("items");
    expect(keys.sort()).toEqual(["a", "b", "c"]);
  });

  it("should clear all keys in a namespace", async () => {
    const store = createStateStore(tempDir);
    await store.set("data", "x", 10);
    await store.set("data", "y", 20);
    await store.clear("data");
    const keys = await store.list("data");
    expect(keys).toHaveLength(0);
  });

  it("should sanitize unsafe key characters", async () => {
    const store = createStateStore(tempDir);
    await store.set("ns", "my/key:with.special", "val");
    const val = await store.get("ns", "my/key:with.special");
    expect(val).toBe("val");
  });
});

describe("initializeStateDir", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `qp-init-test-${Date.now()}`);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should create required subdirectories", async () => {
    const store = await initializeStateDir(tempDir);
    expect(store.baseDir).toBe(tempDir);
    expect(fs.existsSync(path.join(tempDir, "sessions"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "memory"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "history"))).toBe(true);
  });
});
