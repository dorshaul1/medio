// A small local helper, not promoted to features/media/ — show scale
// ("4 seasons · 73 episodes") is currently the only place in the product
// that needs count-aware pluralization.
export function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}
