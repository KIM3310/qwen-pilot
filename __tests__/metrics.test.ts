import { describe, it, expect } from "vitest";
import { createMetricsTracker, MetricsTracker } from "../src/metrics/tracker.js";

describe("MetricsTracker", () => {
  it("should create a tracker with zero counters", () => {
    const tracker = createMetricsTracker("qwen3-coder-plus");
    const snap = tracker.toJSON();
    expect(snap.promptsSent).toBe(0);
    expect(snap.estimatedTokens).toBe(0);
    expect(snap.model).toBe("qwen3-coder-plus");
    expect(snap.latencySamples).toEqual([]);
  });

  it("should record prompts and estimate tokens", () => {
    const tracker = createMetricsTracker("qwen3.5-plus");
    tracker.recordPrompt(400, 150); // ~100 tokens
    const snap = tracker.toJSON();
    expect(snap.promptsSent).toBe(1);
    expect(snap.estimatedTokens).toBe(100);
    expect(snap.latencySamples).toEqual([150]);
  });

  it("should record completion tokens", () => {
    const tracker = createMetricsTracker("qwen3-coder-next");
    tracker.recordPrompt(100);
    tracker.recordCompletion(200); // ~50 tokens
    const snap = tracker.toJSON();
    expect(snap.estimatedTokens).toBe(75); // 25 + 50
  });

  it("should track multiple prompts", () => {
    const tracker = createMetricsTracker("qwen3-coder-plus");
    tracker.recordPrompt(100, 50);
    tracker.recordPrompt(200, 75);
    tracker.recordPrompt(300, 100);
    const snap = tracker.toJSON();
    expect(snap.promptsSent).toBe(3);
    expect(snap.latencySamples).toEqual([50, 75, 100]);
  });

  it("should measure elapsed time", () => {
    const tracker = createMetricsTracker("qwen3-coder-plus");
    const snap = tracker.toJSON();
    expect(snap.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("should produce a human-readable summary", () => {
    const tracker = createMetricsTracker("qwen3.5-plus");
    tracker.recordPrompt(400, 200);
    const summary = tracker.summary();
    expect(summary).toContain("Prompts sent");
    expect(summary).toContain("Est. tokens");
    expect(summary).toContain("qwen3.5-plus");
    expect(summary).toContain("Avg latency");
  });

  it("should handle summary with no latency samples", () => {
    const tracker = createMetricsTracker("qwen3-coder-plus");
    tracker.recordPrompt(100);
    const summary = tracker.summary();
    expect(summary).toContain("n/a");
  });

  it("should include startedAt as ISO string", () => {
    const tracker = createMetricsTracker("qwen3-coder-plus");
    const snap = tracker.toJSON();
    expect(snap.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
