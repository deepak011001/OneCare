import type {
  LlmCompletionChunk,
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmModelInfo,
  LlmProviderId,
  LlmProviderPort,
} from './types';

class UnimplementedProvider implements LlmProviderPort {
  constructor(
    readonly id: LlmProviderId,
    private readonly models: readonly LlmModelInfo[],
  ) {}

  listModels(): readonly LlmModelInfo[] {
    return this.models;
  }

  async complete(_request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    throw new Error(`Provider ${this.id} is not enabled in M3. Use AI_PROVIDER=mock.`);
  }

  stream(_request: LlmCompletionRequest): AsyncIterable<LlmCompletionChunk> {
    const providerId = this.id;
    return {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<LlmCompletionChunk>> {
            throw new Error(`Provider ${providerId} is not enabled in M3. Use AI_PROVIDER=mock.`);
          },
        };
      },
    };
  }
}

export class OpenAiProviderStub extends UnimplementedProvider {
  constructor() {
    super('openai', [
      { id: 'gpt-4.1', provider: 'openai', displayName: 'GPT-4.1 (stub)', available: false },
    ]);
  }
}

export class AzureOpenAiProviderStub extends UnimplementedProvider {
  constructor() {
    super('azure-openai', [
      {
        id: 'azure-gpt-4o',
        provider: 'azure-openai',
        displayName: 'Azure GPT-4o (stub)',
        available: false,
      },
    ]);
  }
}

export class AnthropicProviderStub extends UnimplementedProvider {
  constructor() {
    super('anthropic', [
      {
        id: 'claude-sonnet',
        provider: 'anthropic',
        displayName: 'Claude Sonnet (stub)',
        available: false,
      },
    ]);
  }
}
