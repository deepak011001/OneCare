export type PromptKind = 'system' | 'developer' | 'user' | 'tool';

export interface PromptVariable {
  readonly name: string;
  readonly required: boolean;
  readonly description?: string;
  readonly defaultValue?: string;
}

export interface PromptTemplate {
  readonly id: string;
  readonly kind: PromptKind;
  readonly version: string;
  readonly template: string;
  readonly variables: readonly PromptVariable[];
  readonly hash: string;
  readonly active: boolean;
}

export interface PromptRenderInput {
  readonly promptId: string;
  readonly version?: string;
  readonly variables: Readonly<Record<string, string>>;
}

export interface RenderedPrompt {
  readonly promptId: string;
  readonly version: string;
  readonly kind: PromptKind;
  readonly content: string;
}
