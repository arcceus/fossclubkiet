import type { Quote } from "@/types";
import { QUOTES, DEFAULT_QUOTE } from "@/data/quotes";

const MS_PER_DAY = 86_400_000;

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/**
 * Stride through the list at roughly the golden ratio of its length, nudged
 * down until it is coprime with the length. Because the stride is coprime,
 * `day * STRIDE mod N` is a permutation: every quote appears exactly once
 * per N days (no repeats, no gaps), and consecutive days land ~62% of the
 * list apart instead of walking it in file order (which would show a week
 * of the same batch/author). A plain multiplicative hash mod N only reached
 * ~130 of 360 quotes per year, so a permutation is used instead.
 */
const STRIDE = (() => {
  const n = QUOTES.length;
  if (n < 2) return 1;
  let s = Math.round(n * 0.618_033_988_7);
  while (gcd(s, n) !== 1) s--;
  return s;
})();

/**
 * Pick the quote for a given LOCAL calendar day. Pure and deterministic:
 * every call on the same day (in the viewer's timezone) returns the same quote.
 */
export function getQuoteForDate(date: Date): Quote {
  const n = QUOTES.length;
  if (n === 0) return DEFAULT_QUOTE;

  // Days since the epoch for the local Y/M/D (Date.UTC avoids DST drift).
  const day = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY
  );

  // ((x % n) + n) % n keeps the index non-negative for pre-1970 dates.
  return QUOTES[(((day * STRIDE) % n) + n) % n];
}
