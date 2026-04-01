import { logger } from "../utils/index.js";

/** Event names emitted throughout the qwen-pilot lifecycle. */
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

/** Callback signature for hook handlers. */
export type HookHandler = (event: HookEvent, payload: Record<string, unknown>) => void | Promise<void>;

interface HookRegistration {
  id: string;
  event: HookEvent | "*";
  handler: HookHandler;
  once: boolean;
}

/**
 * Central event bus for the qwen-pilot lifecycle.
 *
 * Listeners can subscribe to specific events or use `"*"` as a wildcard.
 * Handlers are invoked sequentially and errors are caught so that one
 * failing handler does not prevent the rest from executing.
 */
class HookManager {
  private hooks: HookRegistration[] = [];
  private idCounter = 0;
  private enabled = true;

  /** Enable or disable all hook firing. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Register a persistent handler for an event.
   *
   * @param event   - Event name or `"*"` for all events.
   * @param handler - Callback to invoke.
   * @returns A unique registration ID for later removal.
   */
  on(event: HookEvent | "*", handler: HookHandler): string {
    const id = `hook_${++this.idCounter}`;
    this.hooks.push({ id, event, handler, once: false });
    return id;
  }

  /**
   * Register a one-shot handler that is removed after firing once.
   *
   * @param event   - Event name or `"*"` for all events.
   * @param handler - Callback to invoke.
   * @returns A unique registration ID.
   */
  once(event: HookEvent | "*", handler: HookHandler): string {
    const id = `hook_${++this.idCounter}`;
    this.hooks.push({ id, event, handler, once: true });
    return id;
  }

  /**
   * Remove a previously-registered hook by its ID.
   *
   * @param id - The registration ID returned by {@link on} or {@link once}.
   * @returns `true` if the hook was found and removed.
   */
  off(id: string): boolean {
    const idx = this.hooks.findIndex((h) => h.id === id);
    if (idx === -1) return false;
    this.hooks.splice(idx, 1);
    return true;
  }

  /**
   * Emit an event, invoking all matching handlers.
   *
   * @param event   - The event to emit.
   * @param payload - Arbitrary data to pass to handlers.
   */
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

  /** Remove all registered hooks. */
  clear(): void {
    this.hooks = [];
  }

  /** Return a summary of all currently registered hooks. */
  listRegistered(): Array<{ id: string; event: string }> {
    return this.hooks.map((h) => ({ id: h.id, event: h.event }));
  }
}

/** Shared singleton hook manager. */
export const hookManager = new HookManager();
