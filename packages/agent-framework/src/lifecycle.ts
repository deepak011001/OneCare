import type { AgentContext, AgentLifecycleHooks, AgentLifecyclePhase } from './types';
import { LifecycleError } from './errors';

/** Safe no-op defaults for every lifecycle hook. */
export const DEFAULT_LIFECYCLE_HOOKS: Required<AgentLifecycleHooks> = {
  initialize: () => undefined,
  beforePlanning: () => undefined,
  beforeExecution: () => undefined,
  afterExecution: () => undefined,
  beforeResponse: (_ctx, result) => result,
  shutdown: () => undefined,
};

export function mergeLifecycleHooks(
  hooks: AgentLifecycleHooks = {},
): Required<AgentLifecycleHooks> {
  return {
    initialize: hooks.initialize ?? DEFAULT_LIFECYCLE_HOOKS.initialize,
    beforePlanning: hooks.beforePlanning ?? DEFAULT_LIFECYCLE_HOOKS.beforePlanning,
    beforeExecution: hooks.beforeExecution ?? DEFAULT_LIFECYCLE_HOOKS.beforeExecution,
    afterExecution: hooks.afterExecution ?? DEFAULT_LIFECYCLE_HOOKS.afterExecution,
    beforeResponse: hooks.beforeResponse ?? DEFAULT_LIFECYCLE_HOOKS.beforeResponse,
    shutdown: hooks.shutdown ?? DEFAULT_LIFECYCLE_HOOKS.shutdown,
  };
}

export async function runLifecyclePhase(
  hooks: AgentLifecycleHooks,
  phase: AgentLifecyclePhase,
  ctx: AgentContext,
  arg?: unknown,
): Promise<unknown> {
  const merged = mergeLifecycleHooks(hooks);
  try {
    switch (phase) {
      case 'initialize':
        await merged.initialize(ctx);
        return undefined;
      case 'beforePlanning':
        await merged.beforePlanning(ctx, String(arg ?? ''));
        return undefined;
      case 'beforeExecution':
        await merged.beforeExecution(ctx);
        return undefined;
      case 'afterExecution':
        await merged.afterExecution(ctx, arg);
        return undefined;
      case 'beforeResponse':
        return await merged.beforeResponse(ctx, arg);
      case 'shutdown':
        await merged.shutdown(ctx);
        return undefined;
      default:
        return undefined;
    }
  } catch (err) {
    throw new LifecycleError(phase, err instanceof Error ? err.message : String(err));
  }
}
