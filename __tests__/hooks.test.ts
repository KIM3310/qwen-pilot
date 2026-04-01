import { describe, it, expect, beforeEach } from "vitest";
import { hookManager, type HookEvent } from "../src/hooks/hooks.js";

describe("HookManager", () => {
  beforeEach(() => {
    hookManager.clear();
    hookManager.setEnabled(true);
  });

  it("should register and emit an event", async () => {
    const received: string[] = [];
    hookManager.on("session:start", (event) => {
      received.push(event);
    });
    await hookManager.emit("session:start", { id: "s1" });
    expect(received).toEqual(["session:start"]);
  });

  it("should support wildcard listeners", async () => {
    const events: string[] = [];
    hookManager.on("*", (event) => {
      events.push(event);
    });
    await hookManager.emit("session:start");
    await hookManager.emit("workflow:end");
    expect(events).toEqual(["session:start", "workflow:end"]);
  });

  it("should fire once-registered hooks only once", async () => {
    let count = 0;
    hookManager.once("task:complete", () => {
      count++;
    });
    await hookManager.emit("task:complete");
    await hookManager.emit("task:complete");
    expect(count).toBe(1);
  });

  it("should unregister a hook by id", async () => {
    let called = false;
    const id = hookManager.on("error", () => {
      called = true;
    });
    hookManager.off(id);
    await hookManager.emit("error");
    expect(called).toBe(false);
  });

  it("should return false when removing non-existent hook", () => {
    expect(hookManager.off("nonexistent")).toBe(false);
  });

  it("should not fire hooks when disabled", async () => {
    let called = false;
    hookManager.on("session:start", () => {
      called = true;
    });
    hookManager.setEnabled(false);
    await hookManager.emit("session:start");
    expect(called).toBe(false);
  });

  it("should list registered hooks", () => {
    hookManager.on("session:start", () => {});
    hookManager.on("workflow:end", () => {});
    const list = hookManager.listRegistered();
    expect(list).toHaveLength(2);
    expect(list[0].event).toBe("session:start");
  });

  it("should handle errors in hook handlers gracefully", async () => {
    hookManager.on("error", () => {
      throw new Error("handler crash");
    });
    // Should not throw
    await hookManager.emit("error", { msg: "test" });
  });
});
