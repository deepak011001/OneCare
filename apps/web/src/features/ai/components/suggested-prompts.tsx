'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { SUGGESTED_PROMPTS } from '../types';

type CapabilityPrompt = {
  id: string;
  label: string;
  prompt: string;
  kind: string;
};

export function SuggestedPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  const query = useQuery({
    queryKey: ['employee', 'capabilities', 'prompts'],
    queryFn: async () => {
      const res = await api.getEmployeeCapabilityPrompts();
      return (res.data as CapabilityPrompt[]) ?? [];
    },
    staleTime: 60_000,
  });

  const prompts =
    query.data && query.data.length > 0
      ? query.data
          .filter((p) => p.kind === 'starter' || p.kind === 'dashboard')
          .map((p) => p.prompt)
      : SUGGESTED_PROMPTS;

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {prompts.map((prompt) => (
        <Button
          key={prompt}
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => onSelect(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}
