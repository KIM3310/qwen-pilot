import { execFile, spawn, type ChildProcess } from "node:child_process";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

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

export async function commandExists(cmd: string): Promise<boolean> {
  const isWindows = process.platform === "win32";
  const checkCmd = isWindows ? "where" : "which";
  const result = await exec(checkCmd, [cmd]);
  return result.exitCode === 0 && result.stdout.trim().length > 0;
}
