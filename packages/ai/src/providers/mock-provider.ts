import type {
  LlmCompletionChunk,
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmModelInfo,
  LlmProviderPort,
} from './types';

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function buildReply(request: LlmCompletionRequest): string {
  const lastUser = [...request.messages].reverse().find((m) => m.role === 'user');
  const userText = lastUser?.content?.trim() || 'your request';
  return [
    'OneCare AI runtime (mock provider).',
    '',
    `I received: "${userText}"`,
    '',
    'This milestone uses the Mock LLM only. OpenAI, Azure OpenAI, and Anthropic adapters are registered but not executed.',
    'Domain tools and MCP connectors are intentionally unavailable until later milestones.',
  ].join('\n');
}

async function* chunkText(text: string, signal?: AbortSignal): AsyncGenerator<LlmCompletionChunk> {
  const parts = text.split(/(\s+)/).filter((p) => p.length > 0);
  for (const part of parts) {
    if (signal?.aborted) {
      yield { type: 'error', errorMessage: 'cancelled' };
      return;
    }
    yield { type: 'delta', text: part };
    await new Promise((r) => setTimeout(r, 8));
  }
  yield {
    type: 'done',
    model: 'mock-onecare-v1',
    usage: {
      promptTokens: estimateTokens(text),
      completionTokens: estimateTokens(text),
      totalTokens: estimateTokens(text) * 2,
    },
  };
}

export class MockLlmProvider implements LlmProviderPort {
  readonly id = 'mock' as const;

  listModels(): readonly LlmModelInfo[] {
    return [
      {
        id: 'mock-onecare-v1',
        provider: 'mock',
        displayName: 'OneCare Mock Model',
        available: true,
      },
    ];
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const started = Date.now();
    const text = buildReply(request);
    const promptTokens = estimateTokens(request.messages.map((m) => m.content).join(' '));
    const completionTokens = estimateTokens(text);
    return {
      text,
      model: 'mock-onecare-v1',
      provider: 'mock',
      latencyMs: Date.now() - started,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  }

  async *stream(request: LlmCompletionRequest): AsyncIterable<LlmCompletionChunk> {
    const text = buildReply(request);
    yield* chunkText(text, request.signal);
  }
}
