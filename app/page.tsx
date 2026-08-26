import { getAnnouncements } from "@/lib/announcements";
import { getQuoteForDate } from "@/lib/quotes";
import GazetteClient from "./GazetteClient";

export default function Home() {
  const announcements = getAnnouncements();
  // Server-side pick for the day's quote so the SSR HTML (curl, view-source,
  // no-JS, pre-hydration) already shows a real quote instead of a placeholder.
  // GazetteClient uses it as the hydration snapshot and re-checks the viewer's
  // local day after hydration.
  const initialQuote = getQuoteForDate(new Date());
  return (
    <GazetteClient
      initialAnnouncements={announcements}
      initialQuote={initialQuote}
    />
  );
}
