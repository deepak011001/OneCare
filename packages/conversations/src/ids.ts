import type { Brand } from '@onecare/shared';

export type ConversationId = Brand<string, 'ConversationId'>;
export type MessageId = Brand<string, 'MessageId'>;

export function asConversationId(value: string): ConversationId {
  return value as ConversationId;
}

export function asMessageId(value: string): MessageId {
  return value as MessageId;
}
