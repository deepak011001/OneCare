import type { CapabilityResponse, ResponseBlock } from '../types';

export function textResponse(
  text: string,
  options?: {
    readonly suggestedReplies?: readonly string[];
    readonly blocks?: readonly ResponseBlock[];
  },
): CapabilityResponse {
  const blocks: ResponseBlock[] = [{ type: 'text', text }, ...(options?.blocks ?? [])];
  if (options?.suggestedReplies?.length) {
    blocks.push({ type: 'suggestions', replies: options.suggestedReplies });
  }
  return {
    text,
    blocks,
    ...(options?.suggestedReplies ? { suggestedReplies: options.suggestedReplies } : {}),
  };
}

export function formatStructuredResponse(input: {
  readonly text: string;
  readonly suggestedReplies?: readonly string[];
  readonly blocks?: readonly ResponseBlock[];
}): CapabilityResponse {
  return textResponse(input.text, {
    ...(input.suggestedReplies ? { suggestedReplies: input.suggestedReplies } : {}),
    ...(input.blocks ? { blocks: input.blocks } : {}),
  });
}
