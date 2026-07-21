import { hashPromptContent } from './hash';
import { renderPromptTemplate } from './render';
import type { PromptRenderInput, PromptTemplate, RenderedPrompt } from './types';
import { validatePromptTemplate } from './validate';

export interface PromptRegistryPort {
  register(prompt: Omit<PromptTemplate, 'hash'> & { hash?: string }): PromptTemplate;
  get(promptId: string, version?: string): PromptTemplate | null;
  render(input: PromptRenderInput): RenderedPrompt;
  list(): readonly PromptTemplate[];
}

export class InMemoryPromptRegistry implements PromptRegistryPort {
  private readonly prompts = new Map<string, PromptTemplate[]>();

  register(input: Omit<PromptTemplate, 'hash'> & { hash?: string }): PromptTemplate {
    const prompt: PromptTemplate = {
      ...input,
      hash: input.hash ?? hashPromptContent(input.template),
    };
    validatePromptTemplate(prompt);
    const list = this.prompts.get(prompt.id) ?? [];
    const next = [...list.filter((p) => p.version !== prompt.version), prompt];
    this.prompts.set(prompt.id, next);
    return prompt;
  }

  get(promptId: string, version?: string): PromptTemplate | null {
    const list = this.prompts.get(promptId) ?? [];
    if (version) {
      return list.find((p) => p.version === version) ?? null;
    }
    return list.find((p) => p.active) ?? list[list.length - 1] ?? null;
  }

  render(input: PromptRenderInput): RenderedPrompt {
    const prompt = this.get(input.promptId, input.version);
    if (!prompt) {
      throw new Error(`Prompt not found: ${input.promptId}`);
    }
    return renderPromptTemplate(prompt, input);
  }

  list(): readonly PromptTemplate[] {
    return [...this.prompts.values()].flat();
  }
}

/** Seed runtime prompt refs — content is versioned data, not hardcoded agent logic. */
export function createDefaultPromptRegistry(): InMemoryPromptRegistry {
  const registry = new InMemoryPromptRegistry();
  registry.register({
    id: 'orchestrator.system',
    kind: 'system',
    version: '1.1.0',
    active: true,
    template:
      'You are the OneCare Master Orchestrator for tenant {{tenantId}}. Route work to domain agents and ESS capabilities. Prefer grounded capability/tool results over free-form invention. Never invent tools, policies, balances, or citations. If knowledge retrieval returns no source, say so. For leave/attendance writes, require confirmation before side effects.',
    variables: [{ name: 'tenantId', required: true, description: 'Active tenant' }],
  });
  registry.register({
    id: 'agent.employee.system',
    kind: 'system',
    version: '1.0.0',
    active: true,
    template:
      'You are the OneCare Employee Agent ({{agentId}}) v{{version}}. Help employees with leave, attendance, and knowledge using registered capabilities and MCP tools only. Capabilities: {{capabilities}}. For policy/FAQ questions, prefer grounded knowledge-base answers with sources. Accept varied employee phrasing; respond in a clear professional HR tone. Never invent HR policy. Clarify missing slots before write actions.',
    variables: [
      { name: 'agentName', required: true },
      { name: 'agentId', required: true },
      { name: 'version', required: true },
      { name: 'capabilities', required: true },
    ],
  });
  registry.register({
    id: 'agent.placeholder',
    kind: 'system',
    version: '1.1.0',
    active: true,
    template:
      'You are {{agentName}} ({{agentId}}) v{{version}}. Capabilities: {{capabilities}}. This agent is registered but domain workflows are not fully implemented yet — do not invent enterprise actions or policies. Offer to route to Employee Agent for leave, attendance, and knowledge.',
    variables: [
      { name: 'agentName', required: true },
      { name: 'agentId', required: true },
      { name: 'version', required: true },
      { name: 'capabilities', required: true },
    ],
  });
  return registry;
}
