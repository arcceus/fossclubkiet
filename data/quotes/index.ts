import type { Quote } from "@/types";
import { SIMPLICITY_QUOTES } from "./simplicity";
import { CORRECTNESS_QUOTES } from "./correctness";
import { CRAFT_QUOTES } from "./craft";
import { FOSS_QUOTES } from "./foss";
import { SYSTEMS_QUOTES } from "./systems";
import { MINDSET_QUOTES } from "./mindset";

export const DEFAULT_QUOTE: Quote = {
  text: "Talk is cheap. Show me the code.",
  author: "Linus Torvalds",
};

/** Lowercase + strip everything but letters/digits, so trivial punctuation,
 *  spacing or curly-quote differences still count as the same quote. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dedupe(quotes: Quote[]): Quote[] {
  const seen = new Set<string>();
  const out: Quote[] = [];
  for (const q of quotes) {
    const key = normalize(q.text);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

/**
 * All quotes, in batch order, deduplicated at module load (first occurrence
 * wins). The batch files are kept clean at the source, but this is a safety
 * net so appending a repeat to any batch never shows a visitor a duplicate.
 */
export const QUOTES: Quote[] = dedupe([
  ...SIMPLICITY_QUOTES,
  ...CORRECTNESS_QUOTES,
  ...CRAFT_QUOTES,
  ...FOSS_QUOTES,
  ...SYSTEMS_QUOTES,
  ...MINDSET_QUOTES,
]);
