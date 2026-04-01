import { describe, it, expect } from "vitest";
import { renderHud, renderHudFull, formatDuration, formatNumber, type HudState } from "../src/hud/index.js";

function makeState(overrides: Partial<HudState> = {}): HudState {
  return {
    sessionId: "abc123",
    model: "qwen3-coder-plus",
    tier: "balanced",
    promptsSent: 5,
    estimatedTokens: 12500,
    elapsedMs: 65000,
    activeWorkflow: null,
    workflowStep: null,
    teamWorkers: 0,
    status: "idle",
    ...overrides,
  };
}

/** Strip ANSI escape codes for assertion matching. */
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

describe("formatDuration", () => {
  it("should format milliseconds below 1s", () => {
    expect(formatDuration(450)).toBe("450ms");
  });

  it("should format seconds", () => {
    expect(formatDuration(5000)).toBe("5s");
  });

  it("should format minutes and seconds", () => {
    expect(formatDuration(125000)).toBe("2m05s");
  });

  it("should format hours, minutes, and seconds", () => {
    expect(formatDuration(3_661_000)).toBe("1h01m01s");
  });

  it("should handle zero", () => {
    expect(formatDuration(0)).toBe("0ms");
  });
});

describe("formatNumber", () => {
  it("should return small numbers as-is", () => {
    expect(formatNumber(42)).toBe("42");
  });

  it("should format thousands with k suffix", () => {
    expect(formatNumber(1500)).toBe("1.5k");
  });

  it("should format millions with M suffix", () => {
    expect(formatNumber(2_500_000)).toBe("2.5M");
  });

  it("should handle zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("should handle boundary at 1000", () => {
    expect(formatNumber(1000)).toBe("1.0k");
  });
});

describe("renderHud (compact)", () => {
  it("should include model and tier", () => {
    const output = stripAnsi(renderHud(makeState()));
    expect(output).toContain("qwen3-coder-plus");
    expect(output).toContain("balanced");
  });

  it("should show running status icon", () => {
    const output = renderHud(makeState({ status: "running" }));
    expect(output).toContain("\x1b[32m");
  });

  it("should show error status icon", () => {
    const output = renderHud(makeState({ status: "error" }));
    expect(output).toContain("\x1b[31m");
  });

  it("should show idle status icon", () => {
    const output = renderHud(makeState({ status: "idle" }));
    expect(output).toContain("\x1b[2m");
  });

  it("should show workflow when active", () => {
    const output = stripAnsi(
      renderHud(makeState({ activeWorkflow: "autopilot", workflowStep: "2/5" })),
    );
    expect(output).toContain("autopilot [2/5]");
  });

  it("should show team workers when present", () => {
    const output = stripAnsi(renderHud(makeState({ teamWorkers: 3 })));
    expect(output).toContain("3 workers");
  });

  it("should show formatted token count", () => {
    const output = stripAnsi(renderHud(makeState({ estimatedTokens: 12500 })));
    expect(output).toContain("~12.5k");
  });
});

describe("renderHudFull (dashboard)", () => {
  it("should include box-drawing characters", () => {
    const output = renderHudFull(makeState());
    expect(output).toContain("\u250C");
    expect(output).toContain("\u2514");
    expect(output).toContain("\u2502");
  });

  it("should include QWEN PILOT HUD title", () => {
    const output = stripAnsi(renderHudFull(makeState()));
    expect(output).toContain("QWEN PILOT HUD");
  });

  it("should include session id", () => {
    const output = stripAnsi(renderHudFull(makeState({ sessionId: "test-session-42" })));
    expect(output).toContain("test-session-42");
  });

  it("should render all metric lines", () => {
    const output = stripAnsi(renderHudFull(makeState({ promptsSent: 10, estimatedTokens: 50000, elapsedMs: 120000 })));
    expect(output).toContain("10");
    expect(output).toContain("~50.0k");
    expect(output).toContain("2m00s");
  });
});
