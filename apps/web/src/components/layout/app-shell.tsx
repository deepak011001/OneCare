'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronsLeft, ChevronsRight, Menu, Moon, Search, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { APP_NAV, filterNavByPermissions } from '@/features/navigation/nav-config';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CommandPalette } from '@/components/layout/command-palette';

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const principal = useAuthStore((s) => s.principal);
  const tenant = useAuthStore((s) => s.tenant);
  const clear = useAuthStore((s) => s.clear);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);

  const nav = filterNavByPermissions(APP_NAV, hasAnyPermission);

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      clear();
    }
    toast.success('Signed out');
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform lg:static lg:translate-x-0',
          sidebarCollapsed && 'lg:w-16',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="Primary"
      >
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            OC
          </div>
          {!sidebarCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">OneCare</p>
              <p className="truncate text-xs text-muted-foreground">
                {tenant?.displayName ?? 'Workspace'}
              </p>
            </div>
          ) : null}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <div key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                    active && 'bg-accent text-accent-foreground',
                    sidebarCollapsed && 'justify-center px-2',
                  )}
                  aria-current={active ? 'page' : undefined}
                  title={item.label}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {!sidebarCollapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
                {!sidebarCollapsed && item.children?.length
                  ? item.children.map((child) => {
                      const childActive = pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.id}
                          href={child.href}
                          onClick={() => setMobileNavOpen(false)}
                          className={cn(
                            'ml-7 mt-1 flex items-center rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
                            childActive && 'bg-accent text-foreground',
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })
                  : null}
              </div>
            );
          })}
        </nav>
        <div className="hidden border-t p-2 lg:block">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
            {!sidebarCollapsed ? 'Collapse' : null}
          </Button>
        </div>
      </aside>

      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative hidden min-w-0 flex-1 md:block md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              readOnly
              placeholder="Search or press Ctrl+K"
              className="cursor-pointer pl-9"
              onFocus={() => setCommandPaletteOpen(true)}
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Open command palette"
            />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Notifications (coming soon)"
            >
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Theme">
                  <Sun className="h-5 w-5 dark:hidden" />
                  <Moon className="hidden h-5 w-5 dark:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="mr-2 h-4 w-4" /> Light {theme === 'light' ? '✓' : ''}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="mr-2 h-4 w-4" /> Dark {theme === 'dark' ? '✓' : ''}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor className="mr-2 h-4 w-4" /> System {theme === 'system' ? '✓' : ''}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2 px-2"
                  aria-label="Account menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials(principal?.displayName ?? 'U')}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[8rem] truncate text-sm sm:inline">
                    {principal?.displayName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{principal?.displayName}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {principal?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/app/settings')}>
                  Profile & settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleLogout()}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
        <footer className="border-t px-4 py-3 text-xs text-muted-foreground">
          OneCare · One Place. Every Answer.
        </footer>
      </div>

      <aside className="hidden w-0 xl:block" aria-hidden />
      <CommandPalette />
    </div>
  );
}
