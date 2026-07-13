import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { createTalentSession } from "@/lib/auth/talent-session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const idToken = body?.idToken;
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "missing idToken" }, { status: 400 });
  }

  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });

  if (!verifyRes.ok) {
    return NextResponse.json({ error: "invalid LINE token" }, { status: 401 });
  }

  const profile = (await verifyRes.json()) as {
    sub: string;
    name?: string;
    picture?: string;
  };

  // Upsert on line_user_id: only touches identity fields, so an existing
  // talent's status/source/profile data is never overwritten by a re-login.
  const { data: talent, error } = await supabase
    .from("talents")
    .upsert(
      {
        line_user_id: profile.sub,
        line_display_name: profile.name ?? null,
        line_picture_url: profile.picture ?? null,
        source: "self",
      },
      { onConflict: "line_user_id" },
    )
    .select("id")
    .single();

  if (error || !talent) {
    return NextResponse.json(
      { error: error?.message ?? "upsert failed" },
      { status: 500 },
    );
  }

  await createTalentSession(talent.id);

  return NextResponse.json({ ok: true });
}
