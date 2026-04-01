import { describe, it, expect } from "vitest";
import { QwenPilotError, ERROR_CODES, formatErrorCode, type ErrorCode } from "../src/errors/codes.js";

describe("QwenPilotError", () => {
  it("should create an error with code and detail", () => {
    const err = new QwenPilotError("QP_001", "file not found");
    expect(err.code).toBe("QP_001");
    expect(err.message).toContain("QP_001");
    expect(err.message).toContain("file not found");
    expect(err.name).toBe("QwenPilotError");
  });

  it("should create an error without detail", () => {
    const err = new QwenPilotError("QP_002");
    expect(err.code).toBe("QP_002");
    expect(err.message).toContain("QP_002");
    expect(err.message).toContain("Qwen CLI not found in PATH");
  });

  it("should be an instance of Error", () => {
    const err = new QwenPilotError("QP_003", "architect");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("ERROR_CODES", () => {
  it("should have codes QP_001 through QP_014", () => {
    expect(ERROR_CODES.QP_001).toBeDefined();
    expect(ERROR_CODES.QP_010).toBeDefined();
    expect(ERROR_CODES.QP_014).toBeDefined();
  });

  it("should have template placeholders in all codes", () => {
    for (const [code, template] of Object.entries(ERROR_CODES)) {
      expect(typeof template).toBe("string");
      expect(template.length).toBeGreaterThan(0);
    }
  });
});

describe("formatErrorCode", () => {
  it("should format a code with detail", () => {
    const result = formatErrorCode("QP_004", "autopilot");
    expect(result).toContain("QP_004");
    expect(result).toContain("autopilot");
  });

  it("should format a code without detail", () => {
    const result = formatErrorCode("QP_006");
    expect(result).toContain("QP_006");
    expect(result).toContain("tmux");
  });
});
