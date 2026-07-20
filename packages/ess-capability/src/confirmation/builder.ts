import type { ConfirmationDraft, ExecutionPlan } from '../types';

/**
 * Capabilities supply summary + risk; framework shapes the confirmation draft
 * consumed by the existing confirmation UX / store.
 */
export function buildConfirmationDraft(input: {
  readonly plan: ExecutionPlan;
  readonly summary: string;
  readonly risk?: ConfirmationDraft['risk'];
  readonly actions?: ConfirmationDraft['actions'];
}): ConfirmationDraft {
  return {
    summary: input.summary,
    risk: input.risk ?? (input.plan.requiresConfirmation ? 'medium' : 'low'),
    toolName: input.plan.toolName,
    arguments: input.plan.arguments,
    actions: input.actions ?? [
      { id: 'confirm', label: 'Confirm' },
      { id: 'cancel', label: 'Cancel' },
    ],
  };
}
