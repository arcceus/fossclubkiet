import fs from "node:fs";
import path from "node:path";
import type { SiteContent } from "@/types";
import { getAnnouncements } from "./announcements";

const SITE_CONTENT_PATH = path.join(process.cwd(), "data", "site-content.json");

function getSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  return {
    enabled: Boolean(url && key),
    url: url.replace(/\/$/, ""),
    key,
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().enabled;
}

function getSupabaseHeaders(key: string): Record<string, string> {
  // Supabase new API keys (sb_publishable_... / sb_secret_...) use `apikey` header;
  // legacy JWT keys also use `Authorization: Bearer <jwt>`.
  const headers: Record<string, string> = {
    apikey: key,
  };
  if (key.split(".").length === 3) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

export function readLocalSiteContent(): SiteContent {
  const raw = fs.readFileSync(SITE_CONTENT_PATH, "utf-8");
  const parsed = JSON.parse(raw) as SiteContent;

  // If announcements array is missing or empty in site-content.json, hydrate from data/announcements/*.json
  if (!Array.isArray(parsed.announcements) || parsed.announcements.length === 0) {
    parsed.announcements = getAnnouncements();
  } else {
    parsed.announcements.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }
  return parsed;
}

export function writeLocalSiteContent(content: SiteContent): void {
  const normalized: SiteContent = {
    ...content,
    updatedAt: new Date().toISOString(),
    announcements: (content.announcements || []).map((a, idx) => ({
      ...a,
      order: idx,
    })),
  };

  fs.writeFileSync(
    SITE_CONTENT_PATH,
    JSON.stringify(normalized, null, 2) + "\n",
    "utf-8"
  );

  // Also keep data/announcements/*.json synchronized for backward compatibility
  const announcementsDir = path.join(process.cwd(), "data", "announcements");
  if (fs.existsSync(announcementsDir)) {
    const existingJson = fs
      .readdirSync(announcementsDir)
      .filter((f) => f.endsWith(".json"));
    for (const file of existingJson) {
      try {
        fs.unlinkSync(path.join(announcementsDir, file));
      } catch {
        // ignore if read-only in serverless
      }
    }
    normalized.announcements.forEach((item, index) => {
      const safeId = item.id.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
      const filename = `${index}-${safeId}.json`;
      try {
        fs.writeFileSync(
          path.join(announcementsDir, filename),
          JSON.stringify(item, null, 2) + "\n",
          "utf-8"
        );
      } catch {
        // ignore if read-only
      }
    });
  }
}

export async function getSiteContent(): Promise<{
  content: SiteContent;
  source: "supabase" | "local";
}> {
  const sb = getSupabaseConfig();
  if (sb.enabled) {
    try {
      const res = await fetch(
        `${sb.url}/rest/v1/fossc_site_content?id=eq.primary&select=content`,
        {
          headers: getSupabaseHeaders(sb.key),
          cache: "no-store",
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as { content?: SiteContent }[];
        if (rows.length > 0 && rows[0].content) {
          return { content: rows[0].content, source: "supabase" };
        }
      }
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to local JSON:", err);
    }
  }

  return { content: readLocalSiteContent(), source: "local" };
}

export async function saveSiteContent(
  content: SiteContent,
  actor = "admin"
): Promise<{
  savedTo: ("supabase" | "local")[];
  error?: string;
}> {
  const normalized: SiteContent = {
    ...content,
    updatedAt: new Date().toISOString(),
    announcements: (content.announcements || []).map((a, idx) => ({
      ...a,
      order: idx,
    })),
  };

  const savedTo: ("supabase" | "local")[] = [];
  let supabaseError: string | undefined;

  const sb = getSupabaseConfig();
  if (sb.enabled) {
    try {
      const upsertRes = await fetch(`${sb.url}/rest/v1/fossc_site_content`, {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(sb.key),
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          id: "primary",
          content: normalized,
          updated_at: normalized.updatedAt,
          updated_by: actor,
        }),
      });

      if (!upsertRes.ok) {
        const errText = await upsertRes.text();
        supabaseError = `Supabase upsert error (${upsertRes.status}): ${errText}`;
      } else {
        savedTo.push("supabase");
        // Best-effort insert into history snapshot table
        fetch(`${sb.url}/rest/v1/fossc_site_content_history`, {
          method: "POST",
          headers: {
            ...getSupabaseHeaders(sb.key),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: normalized,
            saved_at: normalized.updatedAt,
            saved_by: actor,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      supabaseError =
        err instanceof Error ? err.message : "Unknown Supabase error";
    }
  }

  try {
    writeLocalSiteContent(normalized);
    savedTo.push("local");
  } catch (err) {
    // In serverless production (e.g. Vercel), local disk is read-only
    if (savedTo.length === 0) {
      return {
        savedTo,
        error:
          supabaseError ||
          (err instanceof Error ? err.message : "Failed to write content"),
      };
    }
  }

  return { savedTo, error: supabaseError };
}
