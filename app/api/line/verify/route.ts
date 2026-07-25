import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { createTalentSession, verifyTalentLinkToken } from "@/lib/auth/talent-session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const idToken = typeof body?.idToken === "string" ? body.idToken : null;
  const accessToken =
    typeof body?.accessToken === "string" ? body.accessToken : null;
  if (!idToken && !accessToken) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }
  const linkToken = typeof body?.linkToken === "string" ? body.linkToken : null;

  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  let profile: { sub: string; name?: string; picture?: string } | null = null;
  let lastDetail: string | null = null;

  // ทางหลัก: ID token (ต้องมี openid scope)
  if (idToken) {
    const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    });
    if (verifyRes.ok) {
      const p = (await verifyRes.json()) as {
        sub: string;
        name?: string;
        picture?: string;
      };
      profile = { sub: p.sub, name: p.name, picture: p.picture };
    } else {
      const detail = await verifyRes.json().catch(() => null);
      lastDetail = detail?.error_description ?? detail?.error ?? null;
      console.error("[line/verify] id_token rejected:", verifyRes.status, detail);
    }
  }

  // ทางสำรอง: Access token (ใช้ profile scope ที่มีเสมอ — ไม่ต้องพึ่ง openid)
  // ตรวจว่า token ออกให้ channel ของเราจริง แล้วดึงโปรไฟล์
  if (!profile && accessToken) {
    const vr = await fetch(
      `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (vr.ok) {
      const v = (await vr.json()) as { client_id?: string };
      if (v.client_id === channelId) {
        const pr = await fetch("https://api.line.me/v2/profile", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (pr.ok) {
          const p = (await pr.json()) as {
            userId: string;
            displayName?: string;
            pictureUrl?: string;
          };
          profile = { sub: p.userId, name: p.displayName, picture: p.pictureUrl };
        } else {
          lastDetail = "profile fetch failed";
        }
      } else {
        lastDetail = "access token channel mismatch";
        console.error("[line/verify] access_token client mismatch:", v.client_id);
      }
    } else {
      const detail = await vr.json().catch(() => null);
      lastDetail = detail?.error_description ?? detail?.error ?? "access token invalid";
      console.error("[line/verify] access_token rejected:", vr.status, detail);
    }
  }

  if (!profile) {
    return NextResponse.json(
      { error: "invalid LINE token", detail: lastDetail },
      { status: 401 },
    );
  }

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
