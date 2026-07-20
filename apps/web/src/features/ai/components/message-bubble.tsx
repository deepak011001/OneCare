'use client';

import { cn } from '@/lib/utils';
import type { ChatMessageView } from '../types';

export function MessageBubble({ message }: { message: ChatMessageView }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-card text-card-foreground',
        )}
      >
        <div className="mb-1 text-[10px] uppercase tracking-wide opacity-70">
          {isUser ? 'You' : 'OneCare AI'}
          {message.streaming ? ' · typing' : ''}
        </div>
        <div className="whitespace-pre-wrap">
          {message.content || (message.streaming ? '…' : '')}
        </div>
      </div>
    </div>
  );
}
