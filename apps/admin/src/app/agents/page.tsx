import Link from 'next/link';

const LINKS = [
  { href: '/agents', label: 'Agents' },
  { href: '/agents/registry', label: 'Agent Registry' },
  { href: '/agents/health', label: 'Agent Health' },
] as const;

export default function AgentsHomePage() {
  return (
    <main className="shell">
      <p className="eyebrow">
        <Link href="/">Admin</Link> · Agents
      </p>
      <h1>Enterprise Agents</h1>
      <p className="muted">
        M6.5 Agent Framework admin shell. APIs at <code>/v1/agents</code>.
      </p>
      <ul>
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
