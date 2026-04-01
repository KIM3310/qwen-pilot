import { execFile, spawn, type ChildProcess } from "node:child_process";

/** Result of executing an external command. */
export interface ExecResult {
  /** Standard output. */
  stdout: string;
  /** Standard error. */
  stderr: string;
  /** Process exit code (`0` on success). */
  exitCode: number;
}

/**
 * Execute a command and capture its output.
 *
 * @param cmd  - The executable name or path.
 * @param args - Arguments to pass.
 * @param cwd  - Optional working directory.
 * @returns An {@link ExecResult} (never rejects).
 */
export function exec(cmd: string, args: string[], cwd?: string): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: 30000 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout?.toString() ?? "",
        stderr: stderr?.toString() ?? "",
        exitCode: error?.code ? (typeof error.code === "number" ? error.code : 1) : 0,
      });
    });
  });
}

/**
 * Spawn a detached child process that continues running after the
 * parent exits.
 *
 * @param cmd  - The executable name or path.
 * @param args - Arguments to pass.
 * @param opts - Optional working directory and extra environment.
 * @returns The unref'd child process handle.
 */
export function spawnDetached(
  cmd: string,
  args: string[],
  opts?: { cwd?: string; env?: NodeJS.ProcessEnv },
): ChildProcess {
  const child = spawn(cmd, args, {
    cwd: opts?.cwd,
    env: { ...process.env, ...opts?.env },
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return child;
}

/**
 * Check whether an executable is available on `$PATH`.
 *
 * @param cmd - The command name to look up.
 * @returns `true` if the command was found.
 */
export async function commandExists(cmd: string): Promise<boolean> {
  const isWindows = process.platform === "win32";
  const checkCmd = isWindows ? "where" : "which";
  const result = await exec(checkCmd, [cmd]);
  return result.exitCode === 0 && result.stdout.trim().length > 0;
}

/**
 * Ensure that the Qwen CLI is available on `$PATH`, throwing a
 * descriptive error with install instructions when it is not found.
 *
 * @throws {Error} When `qwen` is not found.
 */
export async function ensureQwenCli(): Promise<void> {
  const foundQwen = await commandExists("qwen");
  const foundQwenCode = await commandExists("qwen-code");
  if (!foundQwen && !foundQwenCode) {
    const msg = [
      "[QP_002] Qwen CLI (Qwen Code) not found in PATH.",
      "",
      "Install it before running this command (or use --dry-run to preview):",
      "",
      "  npm install -g @qwen-code/qwen-code   # via npm (requires Node.js >= 20)",
      "",
      "After installing, verify with:  qwen --version  or  qwen-code --version",
    ].join("\n");
    throw new Error(msg);
  }
}
