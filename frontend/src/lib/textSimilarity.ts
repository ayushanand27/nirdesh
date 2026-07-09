/** Rough duplicate detection for UI deduplication. */
export function isDuplicateText(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  if (shorter.length >= 24 && longer.includes(shorter.slice(0, Math.min(60, shorter.length)))) {
    return true;
  }
  return false;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s%±+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
