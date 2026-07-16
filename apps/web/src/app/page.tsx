import { brand } from '@onecare/ui';

export default function HomePage() {
  return (
    <main className="shell">
      <p className="eyebrow">Enterprise Agentic AI</p>
      <h1>{brand.name}</h1>
      <p className="tagline">{brand.tagline}</p>
      <p className="muted">Foundation scaffold (M0). Product shell lands in M2.</p>
    </main>
  );
}
