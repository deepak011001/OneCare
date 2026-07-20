import { getApiBaseUrl } from '@/lib/api/client';
import type { ExecutionPlanView } from './types';

export type StreamHandlers = {
  onConversation?: (data: { conversationId: string; title: string }) => void;
  onPlan?: (plan: ExecutionPlanView) => void;
  onDelta?: (text: string) => void;
  onDone?: (data: { conversationId: string }) => void;
  onError?: (message: string) => void;
};

function parseSseChunk(chunk: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = chunk.split('\n\n');
  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) {
      events.push({ event, data: dataLines.join('\n') });
    }
  }
  return events;
}

export async function streamAiChat(input: {
  message: string;
  conversationId?: string | null;
  accessToken: string | null;
  signal?: AbortSignal;
  handlers: StreamHandlers;
}): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/v1/ai/chat`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      ...(input.accessToken ? { Authorization: `Bearer ${input.accessToken}` } : {}),
    },
    body: JSON.stringify({
      message: input.message,
      stream: true,
      ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    }),
    ...(input.signal ? { signal: input.signal } : {}),
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(text || `Chat failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      for (const evt of parseSseChunk(part + '\n\n')) {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(evt.data) as Record<string, unknown>;
        } catch {
          continue;
        }
        if (evt.event === 'conversation') {
          input.handlers.onConversation?.({
            conversationId: String(payload.conversationId ?? ''),
            title: String(payload.title ?? 'Conversation'),
          });
        }
        if (evt.event === 'plan') {
          input.handlers.onPlan?.(payload as unknown as ExecutionPlanView);
        }
        if (evt.event === 'delta' && typeof payload.text === 'string') {
          input.handlers.onDelta?.(payload.text);
        }
        if (evt.event === 'done') {
          input.handlers.onDone?.({ conversationId: String(payload.conversationId ?? '') });
        }
        if (evt.event === 'error') {
          input.handlers.onError?.(String(payload.message ?? 'stream error'));
        }
      }
    }
  }
}
