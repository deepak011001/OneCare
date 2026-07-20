/**
 * AI hardening hooks — provider-agnostic extension points.
 * Defaults are no-ops so runtime behavior stays identical until wired.
 */

export interface PromptTelemetryEvent {
  readonly promptId: string;
  readonly version: string;
  readonly hash?: string;
  readonly tenantId?: string;
  readonly conversationId?: string;
  readonly latencyMs?: number;
}

export interface PromptTelemetryPort {
  recordRender(event: PromptTelemetryEvent): void;
}

export class NoOpPromptTelemetry implements PromptTelemetryPort {
  recordRender(): void {}
}

export interface TokenBudgetInput {
  readonly estimatedPromptTokens: number;
  readonly maxTokens: number;
  readonly budget: number;
}

export interface TokenBudgetPort {
  /** Returns true when the request is within budget. */
  allow(input: TokenBudgetInput): boolean;
}

export class DefaultTokenBudget implements TokenBudgetPort {
  allow(input: TokenBudgetInput): boolean {
    return input.estimatedPromptTokens + input.maxTokens <= input.budget;
  }
}

export interface ContextGuardInput {
  readonly text: string;
  readonly maxChars: number;
}

export interface ContextGuardPort {
  /** Truncate oversized context without changing semantics when under limit. */
  enforce(input: ContextGuardInput): string;
}

export class DefaultContextGuard implements ContextGuardPort {
  enforce(input: ContextGuardInput): string {
    if (input.text.length <= input.maxChars) return input.text;
    return `${input.text.slice(0, Math.max(0, input.maxChars - 20))}\n…[truncated]`;
  }
}

export interface SafetyHookInput {
  readonly message: string;
  readonly tenantId?: string;
  readonly userId?: string;
}

export interface SafetyHookResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

export interface SafetyHookPort {
  check(input: SafetyHookInput): Promise<SafetyHookResult>;
}

/** Always allow — placeholder for future moderation / hallucination guards. */
export class AllowAllSafetyHook implements SafetyHookPort {
  async check(_input: SafetyHookInput): Promise<SafetyHookResult> {
    return { allowed: true };
  }
}

export interface AiHardeningPorts {
  readonly promptTelemetry: PromptTelemetryPort;
  readonly tokenBudget: TokenBudgetPort;
  readonly contextGuard: ContextGuardPort;
  readonly safety: SafetyHookPort;
}

export function createDefaultAiHardening(): AiHardeningPorts {
  return {
    promptTelemetry: new NoOpPromptTelemetry(),
    tokenBudget: new DefaultTokenBudget(),
    contextGuard: new DefaultContextGuard(),
    safety: new AllowAllSafetyHook(),
  };
}
