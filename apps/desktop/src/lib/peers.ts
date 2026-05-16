/** Derive up to 2 initials from a display name. */
export function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/** Deterministic oklch color from a peer UUID (stable across sessions). */
export function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash * 31) + id.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `oklch(0.78 0.13 ${hue})`;
}
