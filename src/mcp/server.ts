import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createStateStore, type StateStore } from "../state/index.js";
import { loadConfig } from "../config/index.js";
import { listSessions } from "../harness/index.js";
import { join } from "node:path";

export function createMcpServer(stateDir: string): McpServer {
  const server = new McpServer({
    name: "qwen-pilot",
    version: "1.0.0",
  });

  const store = createStateStore(stateDir);

  // Resource: session state
  server.resource("sessions", "qwen-pilot://sessions", async (uri) => {
    const sessions = await listSessions(stateDir);
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(sessions, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  });

  // Resource: memory store
  server.resource("memory", "qwen-pilot://memory", async (uri) => {
    const keys = await store.list("memory");
    const entries: Record<string, unknown> = {};
    for (const key of keys) {
      entries[key] = await store.get("memory", key);
    }
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(entries, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  });

  // Tool: memory get
  server.tool(
    "memory_get",
    "Retrieve a value from the qwen-pilot memory store",
    { key: z.string().describe("The memory key to retrieve") },
    async ({ key }) => {
      const value = await store.get("memory", key);
      return {
        content: [
          {
            type: "text" as const,
            text: value !== null ? JSON.stringify(value) : `Key "${key}" not found`,
          },
        ],
      };
    },
  );

  // Tool: memory set
  server.tool(
    "memory_set",
    "Store a value in the qwen-pilot memory store",
    {
      key: z.string().describe("The memory key"),
      value: z.string().describe("The value to store (JSON string)"),
    },
    async ({ key, value }) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = value;
      }
      await store.set("memory", key, parsed);
      return {
        content: [{ type: "text" as const, text: `Stored "${key}" successfully` }],
      };
    },
  );

  // Tool: memory list
  server.tool("memory_list", "List all keys in the qwen-pilot memory store", {}, async () => {
    const keys = await store.list("memory");
    return {
      content: [{ type: "text" as const, text: JSON.stringify(keys) }],
    };
  });

  // Tool: memory delete
  server.tool(
    "memory_delete",
    "Delete a key from the qwen-pilot memory store",
    { key: z.string().describe("The memory key to delete") },
    async ({ key }) => {
      const deleted = await store.delete("memory", key);
      return {
        content: [
          {
            type: "text" as const,
            text: deleted ? `Deleted "${key}"` : `Key "${key}" not found`,
          },
        ],
      };
    },
  );

  // Tool: session list
  server.tool("session_list", "List all qwen-pilot sessions", {}, async () => {
    const sessions = await listSessions(stateDir);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            sessions.map((s) => ({
              id: s.id,
              tier: s.tier,
              model: s.model,
              promptCount: s.promptCount,
              createdAt: new Date(s.createdAt).toISOString(),
            })),
            null,
            2,
          ),
        },
      ],
    };
  });

  return server;
}

export async function startMcpServer(): Promise<void> {
  const config = await loadConfig();
  const stateDir = join(process.cwd(), config.stateDir);
  const server = createMcpServer(stateDir);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
