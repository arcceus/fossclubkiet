import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import {
  getSiteContent,
  isSupabaseConfigured,
  readLocalSiteContent,
  saveSiteContent,
} from "@/lib/content";
import type { SiteContent } from "@/types";

export async function GET() {
  const session = await getAdminSession();
  const { content, source } = await getSiteContent();
  return NextResponse.json({
    content,
    source,
    supabaseConfigured: isSupabaseConfigured(),
    authenticated: Boolean(session),
    username: session?.username || null,
  });
}

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in as admin." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      content?: SiteContent;
      action?: "seed_from_local";
    };

    const contentToSave =
      body.action === "seed_from_local" ? readLocalSiteContent() : body.content;

    if (!contentToSave || !contentToSave.masthead) {
      return NextResponse.json(
        { error: "Invalid site content payload." },
        { status: 400 }
      );
    }

    const result = await saveSiteContent(contentToSave, session.username);
    revalidatePath("/");
    revalidatePath("/admin");

    return NextResponse.json({
      ok: result.savedTo.length > 0,
      savedTo: result.savedTo,
      warning: result.error,
      content: contentToSave,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to save site content.",
      },
      { status: 500 }
    );
  }
}
