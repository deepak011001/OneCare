import { brand } from '@onecare/ui';

export default function AdminHomePage() {
  return (
    <main className="shell">
      <p className="eyebrow">Admin Portal</p>
      <h1>{brand.name}</h1>
      <p className="tagline">Users · Roles · Agents · MCP · Knowledge · Flags</p>
      <p className="muted">Admin shell lands in M7. Foundation scaffold (M0).</p>
    </main>
  );
}
