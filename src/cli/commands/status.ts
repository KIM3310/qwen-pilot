import { join } from "node:path";
import { loadConfig } from "../../config/index.js";
import { listSessions } from "../../harness/index.js";
import { listTmuxSessions } from "../../team/index.js";
import { discoverPlugins } from "../../plugins/index.js";
import { logger } from "../../utils/index.js";

/**
 * Display an overview of active sessions, team sessions,
 * discovered plugins, and current configuration.
 */
export async function statusCommand(): Promise<void> {
  const config = await loadConfig();
  const stateDir = join(process.cwd(), config.stateDir);

  logger.banner("qwen-pilot status");

  // Sessions
  const sessions = await listSessions(stateDir);
  console.log(`  Sessions: ${sessions.length}`);

  if (sessions.length > 0) {
    console.log();
    const maxId = Math.max(...sessions.map((s) => s.id.length), 8);
    console.log(`    ${"ID".padEnd(maxId)}  ${"MODEL".padEnd(12)}  ${"TIER".padEnd(10)}  PROMPTS  LAST ACTIVE`);
    console.log(`    ${"─".repeat(maxId)}  ${"─".repeat(12)}  ${"─".repeat(10)}  ${"─".repeat(7)}  ${"─".repeat(20)}`);

    for (const s of sessions.slice(0, 10)) {
      const lastActive = new Date(s.lastActiveAt).toLocaleString();
      console.log(
        `    ${s.id.padEnd(maxId)}  ${s.model.padEnd(12)}  ${s.tier.padEnd(10)}  ${String(s.promptCount).padEnd(7)}  ${lastActive}`,
      );
    }
  }

  // Team sessions
  try {
    const tmuxSessions = await listTmuxSessions(config.team.sessionPrefix);
    console.log(`\n  Active team sessions: ${tmuxSessions.length}`);
    for (const ts of tmuxSessions) {
      console.log(`    - ${ts}`);
    }
  } catch {
    console.log("\n  Team mode: tmux not available");
  }

  // Plugins
  const plugins = await discoverPlugins();
  if (plugins.length > 0) {
    console.log(`\n  Plugins: ${plugins.length}`);
    for (const p of plugins) {
      console.log(`    - [${p.kind}] ${p.name} (${p.filePath})`);
    }
  }

  // Config summary
  console.log("\n  Configuration:");
  console.log(`    Models: ${config.models.high} / ${config.models.balanced} / ${config.models.fast}`);
  console.log(`    Sandbox: ${config.harness.sandboxMode}`);
  console.log(`    Max workers: ${config.team.maxWorkers}`);
}
