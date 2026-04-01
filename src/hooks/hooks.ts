import { logger } from "../utils/index.js";

export type HookEvent =
  | "session:start"
  | "session:end"
  | "session:error"
  | "workflow:start"
  | "workflow:step"
  | "workflow:end"
  | "team:spawn"
  | "team:complete"
  | "task:assign"
  | "task:complete"
  | "task:fail"
  | "error";

export type HookHandler = (event: HookEvent, payload: Record<string, unknown>) => void | Promise<void>;

interface HookRegistration {
  id: string;
  event: HookEvent | "*";
  handler: HookHandler;
  once: boolean;
}

class HookManager {
  private hooks: HookRegistration[] = [];
  private idCounter = 0;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  on(event: HookEvent | "*", handler: HookHandler): string {
    const id = `hook_${++this.idCounter}`;
    this.hooks.push({ id, event, handler, once: false });
    return id;
  }

  once(event: HookEvent | "*", handler: HookHandler): string {
    const id = `hook_${++this.idCounter}`;
    this.hooks.push({ id, event, handler, once: true });
    return id;
  }

  off(id: string): boolean {
    const idx = this.hooks.findIndex((h) => h.id === id);
    if (idx === -1) return false;
    this.hooks.splice(idx, 1);
    return true;
  }

  async emit(event: HookEvent, payload: Record<string, unknown> = {}): Promise<void> {
    if (!this.enabled) return;

    const toRemove: string[] = [];

    for (const reg of this.hooks) {
      if (reg.event !== event && reg.event !== "*") continue;

      try {
        await reg.handler(event, payload);
      } catch (e) {
        logger.warn(`Hook ${reg.id} failed for event ${event}: ${e}`);
      }

      if (reg.once) {
        toRemove.push(reg.id);
      }
    }

    for (const id of toRemove) {
      this.off(id);
    }
  }

  clear(): void {
    this.hooks = [];
  }

  listRegistered(): Array<{ id: string; event: string }> {
    return this.hooks.map((h) => ({ id: h.id, event: h.event }));
  }
}

export const hookManager = new HookManager();
