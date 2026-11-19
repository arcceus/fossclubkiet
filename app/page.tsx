import { getSiteContent, isSupabaseConfigured } from "@/lib/content";
import { getAdminSession } from "@/lib/auth";
import { getQuoteForDate } from "@/lib/quotes";
import GazetteClient from "./GazetteClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ content, source }, session] = await Promise.all([
    getSiteContent(),
    getAdminSession(),
  ]);

  // Server-side pick for the day's quote so the SSR HTML (curl, view-source,
  // no-JS, pre-hydration) already shows a real quote instead of a placeholder.
  // GazetteClient uses it as the hydration snapshot and re-checks the viewer's
  // local day after hydration.
  const initialQuote = getQuoteForDate(new Date());

  return (
    <GazetteClient
      initialSiteContent={content}
      initialQuote={initialQuote}
      isAdmin={Boolean(session)}
      adminUser={session?.username || null}
      storageSource={source}
      supabaseConfigured={isSupabaseConfigured()}
    />
  );
}
