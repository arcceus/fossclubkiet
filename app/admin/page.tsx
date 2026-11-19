import { getSiteContent, isSupabaseConfigured } from "@/lib/content";
import { getAdminSession } from "@/lib/auth";
import { getQuoteForDate } from "@/lib/quotes";
import GazetteClient from "../GazetteClient";
import AdminLoginClient from "./AdminLoginClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) {
    return <AdminLoginClient />;
  }

  const { content, source } = await getSiteContent();
  const initialQuote = getQuoteForDate(new Date());

  return (
    <GazetteClient
      initialSiteContent={content}
      initialQuote={initialQuote}
      isAdmin={true}
      adminUser={session.username}
      storageSource={source}
      supabaseConfigured={isSupabaseConfigured()}
    />
  );
}
