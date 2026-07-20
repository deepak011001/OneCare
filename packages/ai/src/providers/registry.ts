import { MockLlmProvider } from './mock-provider';
import {
  AnthropicProviderStub,
  AzureOpenAiProviderStub,
  OpenAiProviderStub,
} from './stub-providers';
import type { LlmModelInfo, LlmProviderId, LlmProviderPort } from './types';

export class LlmProviderRegistry {
  private readonly providers = new Map<LlmProviderId, LlmProviderPort>();

  constructor(providers: readonly LlmProviderPort[]) {
    for (const provider of providers) {
      this.providers.set(provider.id, provider);
    }
  }

  get(id: LlmProviderId): LlmProviderPort {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Unknown LLM provider: ${id}`);
    }
    return provider;
  }

  listModels(): readonly LlmModelInfo[] {
    return [...this.providers.values()].flatMap((p) => p.listModels());
  }
}

export function createDefaultLlmProviderRegistry(): LlmProviderRegistry {
  return new LlmProviderRegistry([
    new MockLlmProvider(),
    new OpenAiProviderStub(),
    new AzureOpenAiProviderStub(),
    new AnthropicProviderStub(),
  ]);
}
