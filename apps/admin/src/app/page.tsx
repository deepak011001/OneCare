'use client';

import Link from 'next/link';
import { brand } from '@onecare/ui';

const LINKS = [
  { href: '/knowledge/sources', label: 'Knowledge Sources' },
  { href: '/knowledge/sync-jobs', label: 'Sync Jobs' },
  { href: '/knowledge/documents', label: 'Document Library' },
  { href: '/knowledge/diagnostics', label: 'Search Diagnostics' },
  { href: '/knowledge/connectors', label: 'Connector Status' },
  { href: '/knowledge/index-health', label: 'Index Health' },
] as const;

export default function AdminHomePage() {
  return (
    <main className="shell">
      <p className="eyebrow">Admin Portal</p>
      <h1>{brand.name}</h1>
      <p className="tagline">Users · Roles · Agents · MCP · Knowledge · Flags</p>
      <section style={{ marginTop: '2rem' }}>
        <h2>Enterprise Knowledge Platform</h2>
        <p className="muted">M6 admin shell — wire live APIs in subsequent ops work.</p>
        <ul>
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
