import { join } from "node:path";
import { loadConfig } from "../../config/index.js";
import { listSessions } from "../../harness/index.js";
import { type HudState, renderHud, renderHudFull } from "../../hud/index.js";
import { listTmuxSessions } from "../../team/index.js";

async function buildHudState(): Promise<HudState> {
  const config = await loadConfig();
  const stateDir = join(process.cwd(), config.stateDir);
  const sessions = await listSessions(stateDir);
  const latest = sessions.length > 0 ? (sessions[sessions.length - 1] ?? null) : null;

  let teamWorkers = 0;
  try {
    const tmux = await listTmuxSessions(config.team.sessionPrefix);
    teamWorkers = tmux.length;
  } catch {
    // tmux not available
  }

  return {
    sessionId: latest?.id ?? "none",
    model: latest?.model ?? "n/a",
    tier: latest?.tier ?? "balanced",
    promptsSent: latest?.promptCount ?? 0,
    estimatedTokens: (latest?.promptCount ?? 0) * 800,
    elapsedMs: latest ? Date.now() - latest.createdAt : 0,
    activeWorkflow: null,
    workflowStep: null,
    teamWorkers,
    status: latest ? "running" : "idle",
  };
}

export async function hudCommand(opts: { watch?: boolean; compact?: boolean }): Promise<void> {
  const renderOnce = async (): Promise<void> => {
    const state = await buildHudState();
    if (opts.compact) {
      console.log(renderHud(state));
    } else {
      console.log(renderHudFull(state));
    }
  };

  if (opts.watch) {
    const clear = (): void => {
      process.stdout.write("\x1b[2J\x1b[H");
    };
    clear();
    await renderOnce();
    setInterval(async () => {
      clear();
      await renderOnce();
    }, 2000);
  } else {
    await renderOnce();
  }
}
