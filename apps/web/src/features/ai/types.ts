export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessageView {
  readonly id: string;
  readonly role: ChatRole;
  readonly content: string;
  readonly streaming?: boolean;
}

export interface ConversationSummary {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly messageCount: number;
}

export interface PlanStepView {
  readonly id: string;
  readonly agentId: string;
  readonly intent: string;
  readonly rationale: string;
}

export interface ExecutionPlanView {
  readonly id: string;
  readonly mode: string;
  readonly summary: string;
  readonly steps: readonly PlanStepView[];
}

export const SUGGESTED_PROMPTS = [
  'What is my leave balance?',
  'Apply casual leave tomorrow',
  'Show my attendance today',
  'What is our leave policy?',
  'Explain the work from home policy',
  'Summarize my leave and attendance',
] as const;
