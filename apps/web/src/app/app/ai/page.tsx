'use client';

import { Suspense } from 'react';
import { ChatWorkspace } from '@/features/ai/components/chat-workspace';
import { Spinner } from '@/components/ui/spinner';

export default function AiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ChatWorkspace />
    </Suspense>
  );
}
