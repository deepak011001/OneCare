'use client';

import Link from 'next/link';
import { brand } from '@onecare/ui';

const KNOWLEDGE_LINKS = [
  { href: '/knowledge', label: 'Knowledge Dashboard' },
  { href: '/knowledge/library', label: 'Library' },
  { href: '/knowledge/documents', label: 'Documents' },
  { href: '/knowledge/playground', label: 'AI Playground' },
  { href: '/knowledge/approvals', label: 'Approvals' },
  { href: '/knowledge/analytics', label: 'Analytics' },
  { href: '/knowledge/sources', label: 'Sources & Connectors' },
] as const;

const AGENT_LINKS = [
  { href: '/agents', label: 'Agents Overview' },
  { href: '/agents/registry', label: 'Agent Registry' },
  { href: '/agents/health', label: 'Agent Health' },
] as const;

export default function AdminHomePage() {
  return (
    <main className="shell">
      <p className="eyebrow">Admin Portal</p>
      <h1>{brand.name}</h1>
      <p className="tagline">Users · Roles · Agents · MCP · Knowledge · Flags</p>
      <section style={{ marginTop: '2rem' }}>
        <h2>Enterprise Knowledge Administration</h2>
        <p className="muted">
          M6.8 — manage company knowledge through UI. APIs at /v1/admin/knowledge.
        </p>
        <ul>
          {KNOWLEDGE_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section style={{ marginTop: '2rem' }}>
        <h2>Enterprise Agent Framework</h2>
        <p className="muted">M6.5 admin shell — APIs at /v1/agents.</p>
        <ul>
          {AGENT_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
