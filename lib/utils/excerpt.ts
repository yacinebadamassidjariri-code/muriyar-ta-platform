/**
 * Returns a short, plain-text snippet for cards when no explicit description
 * is available. Pure function; safe in server components.
 */
export function deriveExcerpt(body: string, maxChars = 220): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxChars) return collapsed;
  const cut = collapsed.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}