'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUiStore } from '@/stores/ui-store';
import { APP_NAV, filterNavByPermissions } from '@/features/navigation/nav-config';
import { useAuthStore } from '@/stores/auth-store';

export function CommandPalette() {
  const router = useRouter();
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);
  const items = filterNavByPermissions(APP_NAV, hasAnyPermission);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-3 p-4 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>
            Placeholder for M2. Future milestones will connect this to OneCare AI search and actions.
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="Type a command…" aria-label="Command search" autoFocus />
        <ul className="max-h-64 space-y-1 overflow-auto">
          {items.map((item) => (
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
      </DialogContent>
    </Dialog>
  );
}
