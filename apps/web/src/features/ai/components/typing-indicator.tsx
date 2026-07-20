'use client';

export function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1 px-1 py-2 text-xs text-muted-foreground"
      aria-live="polite"
    >
      <span className="inline-flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </span>
      OneCare is thinking…
    </div>
  );
}
