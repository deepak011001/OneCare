'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUiStore } from '@/stores/ui-store';
import { APP_NAV, filterNavByPermissions } from '@/features/navigation/nav-config';
import { SUGGESTED_PROMPTS } from '@/features/ai/types';
import { useAuthStore } from '@/stores/auth-store';

export function CommandPalette() {
  const router = useRouter();
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);
  const items = filterNavByPermissions(APP_NAV, hasAnyPermission);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!open);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  const filteredPrompts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUGGESTED_PROMPTS;
    return SUGGESTED_PROMPTS.filter((prompt) => prompt.toLowerCase().includes(q));
  }, [query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <DialogContent className="gap-3 p-4 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>
            Jump to areas of OneCare or start an AI prompt. Ctrl/Cmd+K toggles this dialog.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Search navigation or AI prompts…"
          aria-label="Command search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="space-y-3">
          <div>
            <p className="mb-1 px-1 text-xs font-medium uppercase text-muted-foreground">
              Navigate
            </p>
            <ul className="max-h-40 space-y-1 overflow-auto">
              {filteredNav.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setOpen(false);
                      router.push(item.href);
                    }}
                  >
                    {item.label}
                    {item.placeholder ? (
                      <span className="ml-2 text-xs text-muted-foreground">Coming soon</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {hasAnyPermission(['ai.chat']) ? (
            <div>
              <p className="mb-1 px-1 text-xs font-medium uppercase text-muted-foreground">
                AI prompts
              </p>
              <ul className="max-h-40 space-y-1 overflow-auto">
                {filteredPrompts.map((prompt) => (
                  <li key={prompt}>
                    <button
                      type="button"
                      className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        setOpen(false);
                        router.push(`/app/ai?prompt=${encodeURIComponent(prompt)}`);
                      }}
                    >
                      {prompt}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
