import Link from 'next/link';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/knowledge', label: 'Dashboard' },
  { href: '/knowledge/library', label: 'Library' },
  { href: '/knowledge/documents', label: 'Documents' },
  { href: '/knowledge/collections', label: 'Collections' },
  { href: '/knowledge/categories', label: 'Categories' },
  { href: '/knowledge/tags', label: 'Tags' },
  { href: '/knowledge/sources', label: 'Sources' },
  { href: '/knowledge/connectors', label: 'Connectors' },
  { href: '/knowledge/approvals', label: 'Approvals' },
  { href: '/knowledge/versions', label: 'Versions' },
  { href: '/knowledge/playground', label: 'AI Playground' },
  { href: '/knowledge/analytics', label: 'Analytics' },
  { href: '/knowledge/diagnostics', label: 'Diagnostics' },
  { href: '/knowledge/uploads', label: 'Uploads' },
  { href: '/knowledge/settings', label: 'Settings' },
  { href: '/knowledge/sync-jobs', label: 'Sync Jobs' },
  { href: '/knowledge/index-health', label: 'Index Health' },
] as const;

export function KnowledgeWorkspaceShell({
  title,
  subtitle,
  children,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="workspace">
      <aside className="workspace-nav" aria-label="Knowledge administration">
        <p className="eyebrow">
          <Link href="/">Admin</Link> · Knowledge
        </p>
        <h2 className="workspace-brand">Knowledge Workspace</h2>
        <nav>
          <ul className="nav-list">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="workspace-main">
        <header className="workspace-header">
          <h1>{title}</h1>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </header>
        <div className="workspace-body">{children}</div>
      </main>
    </div>
  );
}
