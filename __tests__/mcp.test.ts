import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createMcpServer } from "../src/mcp/server.js";
import { createStateStore, initializeStateDir } from "../src/state/store.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("MCP Server", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-mcp-test-"));
    await initializeStateDir(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should create an MCP server instance", () => {
    const server = createMcpServer(tempDir);
    expect(server).toBeInstanceOf(McpServer);
  });

  it("should store and retrieve a memory value via the state store", async () => {
    const store = createStateStore(tempDir);
    await store.set("memory", "test-key", { hello: "world" });
    const value = await store.get<{ hello: string }>("memory", "test-key");
    expect(value).not.toBeNull();
    expect(value!.hello).toBe("world");
  });

  it("should list memory keys after setting values", async () => {
    const store = createStateStore(tempDir);
    await store.set("memory", "key-a", "value-a");
    await store.set("memory", "key-b", "value-b");
    const keys = await store.list("memory");
    expect(keys.sort()).toEqual(["key-a", "key-b"]);
  });

  it("should delete a memory key", async () => {
    const store = createStateStore(tempDir);
    await store.set("memory", "del-key", "to-delete");
    const deleted = await store.delete("memory", "del-key");
    expect(deleted).toBe(true);
    const value = await store.get("memory", "del-key");
    expect(value).toBeNull();
  });

  it("should return false when deleting non-existent memory key", async () => {
    const store = createStateStore(tempDir);
    const deleted = await store.delete("memory", "no-such-key");
    expect(deleted).toBe(false);
  });

  it("should return null for non-existent memory key", async () => {
    const store = createStateStore(tempDir);
    const value = await store.get("memory", "missing");
    expect(value).toBeNull();
  });

  it("should list sessions from the sessions directory", async () => {
    // Write a fake session file
    const sessionsDir = path.join(tempDir, "sessions");
    const sessionData = {
      id: "test1234",
      tier: "balanced",
      model: "qwen3-coder-plus",
      sandboxMode: "relaxed",
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      promptCount: 5,
      context: [],
    };
    fs.writeFileSync(
      path.join(sessionsDir, "test1234.json"),
      JSON.stringify(sessionData, null, 2),
    );

    const { listSessions } = await import("../src/harness/session.js");
    const sessions = await listSessions(tempDir);
    expect(sessions.length).toBe(1);
    expect(sessions[0]!.id).toBe("test1234");
    expect(sessions[0]!.promptCount).toBe(5);
  });

  it("should clear all keys in a memory namespace", async () => {
    const store = createStateStore(tempDir);
    await store.set("memory", "x", 1);
    await store.set("memory", "y", 2);
    await store.set("memory", "z", 3);
    await store.clear("memory");
    const keys = await store.list("memory");
    expect(keys).toHaveLength(0);
  });

  it("should handle JSON parse of stored values correctly", async () => {
    const store = createStateStore(tempDir);
    // Store a complex object
    const complex = { arr: [1, 2, 3], nested: { a: true } };
    await store.set("memory", "complex", complex);
    const retrieved = await store.get<typeof complex>("memory", "complex");
    expect(retrieved).toEqual(complex);
  });

  it("should isolate namespaces from each other", async () => {
    const store = createStateStore(tempDir);
    await store.set("memory", "shared-key", "memory-value");
    await store.set("sessions", "shared-key", "session-value");

    const memVal = await store.get("memory", "shared-key");
    const sessVal = await store.get("sessions", "shared-key");
    expect(memVal).toBe("memory-value");
    expect(sessVal).toBe("session-value");
  });
});
