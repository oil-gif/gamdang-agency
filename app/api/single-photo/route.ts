import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getTalentSession } from "@/lib/auth/talent-session";
import { isAdminAuthed } from "@/lib/supabase/auth-server";
import { supabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

// สมัคร Influencer ล้วน: อัพรูปเดียวพอ (ไม่ต้องทำ Comp Card) — เก็บเป็นรูป
// gallery ตัวแทน + จำ path ไว้ที่ talents.compcard_slots["single"] เพื่อ
// อัพซ้ำแล้วแทนที่ใบเดิม (ไม่บวม gallery) · auth เหมือน /api/upload
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const talentId = String(body?.talent_id ?? "");
  const data = typeof body?.data === "string" ? body.data : "";
  if (!data || !talentId) {
    return NextResponse.json({ error: "missing file or talent_id" }, { status: 400 });
  }

  const talentSession = await getTalentSession();
  if (talentSession && !(await isAdminAuthed())) {
    const { data: owned } = await supabase
      .from("talents")
      .select("id")
      .eq("id", talentId)
      .eq("line_user_id", talentSession.lineUserId)
      .maybeSingle();
    if (!owned) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const { data: talent, error: readErr } = await supabase
    .from("talents")
    .select("compcard_slots")
    .eq("id", talentId)
    .maybeSingle();
  if (readErr) {
    return NextResponse.json(
      { error: "ระบบยังไม่พร้อม (migration 014) — แจ้งแอดมินค่ะ" },
      { status: 500 },
    );
  }
  if (!talent) {
    return NextResponse.json({ error: "ไม่พบโปรไฟล์" }, { status: 404 });
  }
  const slots: Record<string, string> = { ...(talent.compcard_slots ?? {}) };

  const base64 = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  const inputBuffer = Buffer.from(base64, "base64");

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1200, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ" }, { status: 400 });
  }

  const path = `${talentId}/gallery/${randomUUID()}.webp`;
  const blob = new Blob([new Uint8Array(outputBuffer)], { type: "image/webp" });
  const { error: uploadError } = await supabase.storage
    .from("talent-photos")
    .upload(path, blob, { contentType: "image/webp" });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // แทนที่รูปเดี่ยวใบเดิม (ถ้ามี)
  const oldPath = slots.single;
  if (oldPath) {
    await supabase.storage.from("talent-photos").remove([oldPath]);
    await supabase.from("talent_photos").delete().eq("storage_path", oldPath);
  }

  await supabase
    .from("talent_photos")
    .insert({ talent_id: talentId, kind: "gallery", storage_path: path });

  slots.single = path;
  const { error: updErr } = await supabase
    .from("talents")
    .update({ compcard_slots: slots })
    .eq("id", talentId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path });
}
