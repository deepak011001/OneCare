import type { PromptRenderInput, PromptTemplate, RenderedPrompt } from './types';
import { PromptValidationError, validatePromptTemplate } from './validate';

export function renderPromptTemplate(
  prompt: PromptTemplate,
  input: PromptRenderInput,
): RenderedPrompt {
  validatePromptTemplate(prompt);
  const values: Record<string, string> = { ...input.variables };
  for (const variable of prompt.variables) {
    if (values[variable.name] === undefined) {
      if (variable.defaultValue !== undefined) {
        values[variable.name] = variable.defaultValue;
      } else if (variable.required) {
        throw new PromptValidationError(`missing required variable: ${variable.name}`);
      }
    }
  }
  const content = prompt.template.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    (_m, name: string) => {
      return values[name] ?? '';
    },
  );
  return {
    promptId: prompt.id,
    version: prompt.version,
    kind: prompt.kind,
    content,
  };
}
