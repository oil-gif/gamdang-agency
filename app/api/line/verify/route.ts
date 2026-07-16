import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { createTalentSession, verifyTalentLinkToken } from "@/lib/auth/talent-session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const idToken = body?.idToken;
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "missing idToken" }, { status: 400 });
  }
  const linkToken = typeof body?.linkToken === "string" ? body.linkToken : null;

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

  const setSession = () =>
    createTalentSession({
      lineUserId: profile.sub,
      lineName: profile.name ?? null,
      linePicture: profile.picture ?? null,
    });

  // An admin-issued link attaches one existing (usually admin-created)
  // talent to this LINE account. A LINE account can own many talents, so
  // the only guard is that the target isn't already owned by a DIFFERENT
  // LINE account.
  if (linkToken) {
    const link = await verifyTalentLinkToken(linkToken);
    if (!link) {
      return NextResponse.json(
        { error: "ลิงก์เชื่อมบัญชีหมดอายุหรือไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const { data: target, error: fetchError } = await supabase
      .from("talents")
      .select("id, line_user_id")
      .eq("id", link.talentId)
      .single();

    if (fetchError || !target) {
      return NextResponse.json({ error: "ไม่พบ talent ที่ต้องการผูก" }, { status: 404 });
    }

    if (target.line_user_id && target.line_user_id !== profile.sub) {
      return NextResponse.json(
        { error: "โปรไฟล์นี้ผูกกับ LINE อื่นไปแล้ว กรุณาติดต่อแอดมิน" },
        { status: 409 },
      );
    }

    const { error: updateError } = await supabase
      .from("talents")
      .update({
        line_user_id: profile.sub,
        line_display_name: profile.name ?? null,
        line_picture_url: profile.picture ?? null,
      })
      .eq("id", target.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await setSession();
    return NextResponse.json({ ok: true });
  }

  // Plain login — just prove the LINE identity and set the session. We do
  // NOT auto-create a talent here anymore; the /apply/profiles page lists
  // this account's talents and lets the parent add each child explicitly.
  await setSession();
  return NextResponse.json({ ok: true });
}
