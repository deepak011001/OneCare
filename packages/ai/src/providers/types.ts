export type LlmProviderId = 'mock' | 'openai' | 'azure-openai' | 'anthropic';

export interface LlmModelInfo {
  readonly id: string;
  readonly provider: LlmProviderId;
  readonly displayName: string;
  readonly available: boolean;
}

export interface LlmMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface LlmCompletionRequest {
  readonly model: string;
  readonly messages: readonly LlmMessage[];
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly signal?: AbortSignal;
}

export interface LlmTokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface LlmCompletionChunk {
  readonly type: 'delta' | 'done' | 'error';
  readonly text?: string;
  readonly usage?: LlmTokenUsage;
  readonly model?: string;
  readonly errorMessage?: string;
}

export interface LlmCompletionResult {
  readonly text: string;
  readonly model: string;
  readonly usage: LlmTokenUsage;
  readonly latencyMs: number;
  readonly provider: LlmProviderId;
}

export interface LlmProviderPort {
  readonly id: LlmProviderId;
  listModels(): readonly LlmModelInfo[];
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
  stream(request: LlmCompletionRequest): AsyncIterable<LlmCompletionChunk>;
}
