import Link from 'next/link';
import { brand } from '@onecare/ui';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsla(172,45%,42%,0.18),transparent_42%),linear-gradient(160deg,hsl(210_24%_8%)_0%,hsl(210_22%_14%)_55%,hsl(210_24%_9%)_100%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16 text-white">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(172_55%_62%)]">
          Enterprise Agentic AI
        </p>
        <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">{brand.name}</h1>
        <p className="mt-4 max-w-xl text-xl text-white/85">{brand.tagline}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
            <Link href="/app/dashboard">Open workspace</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
