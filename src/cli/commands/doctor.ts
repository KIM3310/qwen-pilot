import { join } from "node:path";
import { commandExists, fileExists, logger } from "../../utils/index.js";
import { loadConfig, validateConfig, DEFAULT_CONFIG } from "../../config/index.js";

interface CheckResult {
  name: string;
  status: "ok" | "warn" | "fail";
  message: string;
}

export async function doctorCommand(): Promise<void> {
  logger.banner("qwen-pilot doctor");

  const checks: CheckResult[] = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split(".")[0], 10);
  checks.push({
    name: "Node.js",
    status: major >= 20 ? "ok" : "fail",
    message: major >= 20 ? `${nodeVersion} (>= 20 required)` : `${nodeVersion} — Node.js >= 20 is required`,
  });

  // Check Qwen CLI
  const hasQwen = await commandExists("qwen");
  checks.push({
    name: "Qwen CLI",
    status: hasQwen ? "ok" : "warn",
    message: hasQwen ? "Found in PATH" : "Not found — install Qwen CLI for full functionality",
  });

  // Check tmux
  const hasTmux = await commandExists("tmux");
  checks.push({
    name: "tmux",
    status: hasTmux ? "ok" : "warn",
    message: hasTmux ? "Found in PATH" : "Not found — required for team mode",
  });

  // Check state directory
  const cwd = process.cwd();
  const stateExists = await fileExists(join(cwd, ".qwen-pilot"));
  checks.push({
    name: "State directory",
    status: stateExists ? "ok" : "warn",
    message: stateExists ? ".qwen-pilot/ exists" : "Not initialized — run 'qp setup'",
  });

  // Check config
  try {
    const config = await loadConfig();
    const validation = validateConfig(config);
    checks.push({
      name: "Configuration",
      status: validation.valid ? "ok" : "warn",
      message: validation.valid ? "Valid" : `Issues: ${validation.errors.join(", ")}`,
    });
  } catch (e) {
    checks.push({
      name: "Configuration",
      status: "fail",
      message: `Failed to load: ${e}`,
    });
  }

  // Check AGENTS.md
  const agentsExists = await fileExists(join(cwd, "AGENTS.md"));
  checks.push({
    name: "AGENTS.md",
    status: agentsExists ? "ok" : "warn",
    message: agentsExists ? "Found" : "Not found — recommended for context injection",
  });

  // Check prompts directory
  const promptsExists = await fileExists(join(cwd, "prompts"));
  checks.push({
    name: "Prompts directory",
    status: promptsExists ? "ok" : "warn",
    message: promptsExists ? "Found" : "Using built-in prompts only",
  });

  // Print results
  const icons = { ok: "\x1b[32m✓\x1b[0m", warn: "\x1b[33m!\x1b[0m", fail: "\x1b[31m✗\x1b[0m" };
  for (const check of checks) {
    console.log(`  ${icons[check.status]} ${check.name.padEnd(20)} ${check.message}`);
  }

  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  console.log();
  if (failCount > 0) {
    logger.error(`${failCount} check(s) failed, ${warnCount} warning(s)`);
    process.exit(1);
  } else if (warnCount > 0) {
    logger.warn(`All checks passed with ${warnCount} warning(s)`);
  } else {
    logger.success("All checks passed!");
  }
}
