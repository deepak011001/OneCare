'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ConversationSummary } from '../types';

export function ConversationSidebar(props: {
  conversations: readonly ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-muted/20">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <h2 className="text-sm font-semibold">Conversations</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={props.onNew}
          aria-label="New chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ul className="flex-1 space-y-1 overflow-auto p-2">
        {props.conversations.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-muted-foreground">
            No conversations yet
          </li>
        ) : (
          props.conversations.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                  props.activeId === item.id && 'bg-accent',
                )}
                onClick={() => props.onSelect(item.id)}
              >
                <div className="line-clamp-1 font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.messageCount} messages</div>
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
