import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getTalentSession } from "@/lib/auth/talent-session";
import { supabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Comp Card Studio: รับการ์ดที่ browser วาดเสร็จ (canvas JPEG) → บีบอัด
// ให้ไฟล์เล็กแต่คมพอเสนอลูกค้า → ตั้งเป็น Comp Card ตัวจริงของ talent
// (แทนที่ใบเดิม) · auth แบบเดียวกับ /api/upload
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const talentId = String(body?.talent_id ?? "");
  const data = typeof body?.data === "string" ? body.data : "";
  if (!data || !talentId) {
    return NextResponse.json({ error: "missing file or talent_id" }, { status: 400 });
  }

  const talentSession = await getTalentSession();
  if (talentSession) {
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

  const base64 = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  const inputBuffer = Buffer.from(base64, "base64");

  let outputBuffer: Buffer;
  try {
    // คอมการ์ดเก็บเป็น JPEG (เว็บวิว LINE เปิดได้ชัวร์ + ส่งลูกค้าสะดวก)
    outputBuffer = await sharp(inputBuffer)
      .resize({ width: 1800, withoutEnlargement: true })
      .jpeg({ quality: 84 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ" }, { status: 400 });
  }

  const path = `${talentId}/compcard/${randomUUID()}.jpg`;
  const blob = new Blob([new Uint8Array(outputBuffer)], { type: "image/jpeg" });
  const { error: uploadError } = await supabase.storage
    .from("talent-photos")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Comp Card มีได้ใบเดียว — ลบใบเดิม (ไฟล์+row) ก่อนตั้งใบใหม่
  const { data: existing } = await supabase
    .from("talent_photos")
    .select("id, storage_path")
    .eq("talent_id", talentId)
    .eq("kind", "compcard");
  for (const p of existing ?? []) {
    await supabase.storage.from("talent-photos").remove([p.storage_path]);
    await supabase.from("talent_photos").delete().eq("id", p.id);
  }

  const { data: photoRow, error: insertError } = await supabase
    .from("talent_photos")
    .insert({ talent_id: talentId, kind: "compcard", storage_path: path })
    .select()
    .single();
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  await supabase
    .from("talents")
    .update({ compcard_photo_id: photoRow.id })
    .eq("id", talentId);

  return NextResponse.json({ ok: true, path });
}
