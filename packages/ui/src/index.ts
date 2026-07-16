/** Design tokens — map to Tailwind/CSS variables in apps (see docs/UI_GUIDELINES.md). */
export const brand = {
  name: 'OneCare',
  tagline: 'One Place. Every Answer.',
} as const;

export type EmptyStateProps = {
  readonly title: string;
  readonly description?: string;
};

/** Placeholder contract for shared empty states (React components land in M2). */
export function formatEmptyState(props: EmptyStateProps): string {
  return props.description ? `${props.title} — ${props.description}` : props.title;
}
