# OneCare — Agent Lifecycle

**Related:** [`AGENT_FRAMEWORK.md`](./AGENT_FRAMEWORK.md)

## Hooks

| Phase | When |
|-------|------|
| `initialize` | Agent / turn bootstrap |
| `beforePlanning` | Before planner runs |
| `beforeExecution` | Before tools / capabilities execute |
| `afterExecution` | After execution completes |
| `beforeResponse` | Transform / inspect outbound result |
| `shutdown` | Cleanup |

Defaults are no-ops via `mergeLifecycleHooks` / `DEFAULT_LIFECYCLE_HOOKS`.

Failures wrap as `LifecycleError`. Telemetry may record `agent.lifecycle` / `agent.selected`.
