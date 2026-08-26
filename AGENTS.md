<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

- Sidebar content (hours/venue, quote box, Discord link) is hardcoded JSX in `app/GazetteClient.tsx`; client-only values (today's date, quote, dark flag) are read with `useSyncExternalStore` — do not add `setState` calls inside its `useEffect`, `npm run lint` rejects them. The quote's hydration snapshot is the `initialQuote` prop that `app/page.tsx` computes with `getQuoteForDate(new Date())`, so the SSR HTML shows a real quote and the client only re-checks its local day; if `cacheComponents` is ever enabled, that `new Date()` must move behind `connection()`.
- Quotes live in `data/quotes/*.ts` (one per line, append to any batch), are aggregated and deduped in `data/quotes/index.ts`, and the daily pick is `getQuoteForDate` in `lib/quotes.ts`.
- The "Core Members" view (view id still `"officers"`) renders the module-level `CORE_MEMBERS` array in `app/GazetteClient.tsx` (name / email / discord only — no roles, no GPG keys). Add members there.
- `agent-docs/` is the local-only agent knowledge base: read it first, keep it updated, never commit it.
