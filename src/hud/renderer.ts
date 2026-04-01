/**
 * HUD renderer: formats session metrics for terminal display.
 * Supports compact single-line (tmux-friendly) and full dashboard views.
 */

// ANSI color codes
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  magenta: "\x1b[35m",
  bgBlack: "\x1b[40m",
} as const;

export interface HudState {
  sessionId: string;
  model: string;
  tier: string;
  promptsSent: number;
  estimatedTokens: number;
  elapsedMs: number;
  activeWorkflow: string | null;
  workflowStep: string | null;
  teamWorkers: number;
  status: "idle" | "running" | "error";
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, "0")}m${String(seconds).padStart(2, "0")}s`;
  if (minutes > 0) return `${minutes}m${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function statusIcon(status: HudState["status"]): string {
  switch (status) {
    case "running":
      return `${C.green}●${C.reset}`;
    case "error":
      return `${C.red}●${C.reset}`;
    default:
      return `${C.dim}○${C.reset}`;
  }
}

function statusLabel(status: HudState["status"]): string {
  switch (status) {
    case "running":
      return `${C.green}RUNNING${C.reset}`;
    case "error":
      return `${C.red}ERROR${C.reset}`;
    default:
      return `${C.dim}IDLE${C.reset}`;
  }
}

/**
 * Compact single-line HUD for tmux status bar or quick glance.
 */
export function renderHud(state: HudState): string {
  const elapsed = formatDuration(state.elapsedMs);
  const tokens = formatNumber(state.estimatedTokens);
  const workflow = state.activeWorkflow
    ? `${state.activeWorkflow} [${state.workflowStep}]`
    : "none";
  const team = state.teamWorkers > 0 ? `${state.teamWorkers} workers` : "-";
  const icon = statusIcon(state.status);

  return [
    `${icon} ${C.bold}${state.model}${C.reset} (${state.tier})`,
    `Prompts: ${C.cyan}${state.promptsSent}${C.reset}`,
    `Tokens: ${C.cyan}~${tokens}${C.reset}`,
    `Time: ${C.yellow}${elapsed}${C.reset}`,
    `Workflow: ${workflow}`,
    `Team: ${team}`,
  ].join(" | ");
}

/**
 * Full multi-line dashboard view with box-drawing characters.
 */
export function renderHudFull(state: HudState): string {
  const elapsed = formatDuration(state.elapsedMs);
  const tokens = formatNumber(state.estimatedTokens);
  const workflow = state.activeWorkflow
    ? `${C.magenta}${state.activeWorkflow}${C.reset} [${state.workflowStep}]`
    : `${C.dim}none${C.reset}`;
  const team = state.teamWorkers > 0
    ? `${C.cyan}${state.teamWorkers}${C.reset} workers`
    : `${C.dim}-${C.reset}`;

  const title = ` ${C.bold}QWEN PILOT HUD${C.reset} `;
  const sessionLine = `  Session   ${C.dim}${state.sessionId}${C.reset}`;
  const modelLine = `  Model     ${C.bold}${state.model}${C.reset} (${state.tier})`;
  const statusLine = `  Status    ${statusLabel(state.status)}`;
  const promptsLine = `  Prompts   ${C.cyan}${state.promptsSent}${C.reset}`;
  const tokensLine = `  Tokens    ${C.cyan}~${tokens}${C.reset}`;
  const timeLine = `  Elapsed   ${C.yellow}${elapsed}${C.reset}`;
  const workflowLine = `  Workflow  ${workflow}`;
  const teamLine = `  Team      ${team}`;

  const width = 52;
  const hBar = "\u2500".repeat(width);
  const topLeft = "\u250C";
  const topRight = "\u2510";
  const botLeft = "\u2514";
  const botRight = "\u2518";
  const vBar = "\u2502";
  const tLeft = "\u251C";
  const tRight = "\u2524";

  const lines = [
    `${topLeft}${hBar}${topRight}`,
    `${vBar}${title.padEnd(width + countAnsi(title))}${vBar}`,
    `${tLeft}${"─".repeat(width)}${tRight}`,
    `${vBar}${padAnsi(sessionLine, width)}${vBar}`,
    `${vBar}${padAnsi(modelLine, width)}${vBar}`,
    `${vBar}${padAnsi(statusLine, width)}${vBar}`,
    `${tLeft}${"─".repeat(width)}${tRight}`,
    `${vBar}${padAnsi(promptsLine, width)}${vBar}`,
    `${vBar}${padAnsi(tokensLine, width)}${vBar}`,
    `${vBar}${padAnsi(timeLine, width)}${vBar}`,
    `${tLeft}${"─".repeat(width)}${tRight}`,
    `${vBar}${padAnsi(workflowLine, width)}${vBar}`,
    `${vBar}${padAnsi(teamLine, width)}${vBar}`,
    `${botLeft}${hBar}${botRight}`,
  ];

  return lines.join("\n");
}

/** Count bytes consumed by ANSI escape sequences in a string. */
function countAnsi(s: string): number {
  // eslint-disable-next-line no-control-regex
  const stripped = s.replace(/\x1b\[[0-9;]*m/g, "");
  return s.length - stripped.length;
}

/** Pad a string that may contain ANSI codes to a visual width. */
function padAnsi(s: string, width: number): string {
  const visual = s.length - countAnsi(s);
  if (visual >= width) return s;
  return s + " ".repeat(width - visual);
}
