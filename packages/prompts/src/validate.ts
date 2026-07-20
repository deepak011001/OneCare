import type { PromptTemplate } from './types';

export class PromptValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptValidationError';
  }
}

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function extractTemplateVariables(template: string): string[] {
  const names = new Set<string>();
  for (const match of template.matchAll(VARIABLE_PATTERN)) {
    const name = match[1];
    if (name) names.add(name);
  }
  return [...names];
}

export function validatePromptTemplate(prompt: PromptTemplate): void {
  if (!prompt.id.trim()) {
    throw new PromptValidationError('prompt id is required');
  }
  if (!prompt.version.trim()) {
    throw new PromptValidationError('prompt version is required');
  }
  if (!prompt.template.trim()) {
    throw new PromptValidationError('prompt template is required');
  }
  const declared = new Set(prompt.variables.map((v) => v.name));
  for (const used of extractTemplateVariables(prompt.template)) {
    if (!declared.has(used)) {
      throw new PromptValidationError(`undeclared variable {{${used}}}`);
    }
  }
}
