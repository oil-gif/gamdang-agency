import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getTalentSession } from "@/lib/auth/talent-session";
import { SLOTS } from "@/lib/compcard";
import { supabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Comp Card Studio: รับรูปที่ crop แล้วของแต่ละช่อง (หน้าตรง/ครึ่งตัว/...)
// → ย่อ + เก็บเป็นรูป gallery ของ talent + จำ path ไว้ใน talents.compcard_slots
// auth แบบเดียวกับ /api/upload: talent session ต้องเป็นเจ้าของ, admin ผ่าน
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const talentId = String(body?.talent_id ?? "");
  const slot = String(body?.slot ?? "");
  const data = typeof body?.data === "string" ? body.data : "";

  if (!data || !talentId) {
    return NextResponse.json({ error: "missing file or talent_id" }, { status: 400 });
  }
  if (!SLOTS.some((s) => s.key === slot)) {
    return NextResponse.json({ error: "invalid slot" }, { status: 400 });
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

  // อ่าน slots ปัจจุบัน (ไว้ลบรูปเก่าของช่องนี้ + merge ค่าใหม่)
  const { data: talent, error: readErr } = await supabase
    .from("talents")
    .select("compcard_slots")
    .eq("id", talentId)
    .maybeSingle();
  if (readErr) {
    // column ยังไม่มี = ยังไม่ได้ run migration 014
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
      .resize({ width: 1600, height: 1800, fit: "inside", withoutEnlargement: true })
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

  // ลบรูปเก่าของช่องนี้ (ถ้ามี) — กัน gallery บวมจากการ crop ซ้ำๆ
  const oldPath = slots[slot];
  if (oldPath) {
    await supabase.storage.from("talent-photos").remove([oldPath]);
    await supabase.from("talent_photos").delete().eq("storage_path", oldPath);
  }

  await supabase
    .from("talent_photos")
    .insert({ talent_id: talentId, kind: "gallery", storage_path: path });

  slots[slot] = path;
  const { error: updErr } = await supabase
    .from("talents")
    .update({ compcard_slots: slots })
    .eq("id", talentId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path, slots });
}
