import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { verifySubmitToken } from "@/lib/auth/talent-session";
import { supabase } from "@/lib/supabase/server";

// sharp is a native binding — must run on the Node.js runtime, not Edge.
export const runtime = "nodejs";

const MAX_PHOTOS = 3;

// อัพโหลด/ลบ "รูปเพิ่ม" ของฟอร์ม casting (งาน Model) — auth ด้วย submit token
// เท่านั้น (talent เปิดจากลิงก์ ไม่มี session). body เป็น base64 JSON และ
// storage upload ต้องห่อ Blob — ดู gotcha ใน /api/upload.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const op = body?.op === "delete" ? "delete" : "upload";

  const verified = await verifySubmitToken(token);
  if (!verified) {
    return NextResponse.json({ error: "ลิงก์หมดอายุ" }, { status: 401 });
  }

  const { data: pt } = await supabase
    .from("project_talents")
    .select("id, talent_id, extra_photo_paths")
    .eq("id", verified.projectTalentId)
    .maybeSingle();
  if (!pt) {
    return NextResponse.json({ error: "ไม่พบงานนี้" }, { status: 404 });
  }
  const current: string[] = pt.extra_photo_paths ?? [];

  if (op === "delete") {
    const path = typeof body?.path === "string" ? body.path : "";
    if (!current.includes(path)) {
      return NextResponse.json({ error: "ไม่พบรูปนี้" }, { status: 404 });
    }
    await supabase.storage.from("talent-photos").remove([path]);
    await supabase
      .from("project_talents")
      .update({ extra_photo_paths: current.filter((p) => p !== path) })
      .eq("id", pt.id);
    return NextResponse.json({ ok: true });
  }

  // ===== upload =====
  if (current.length >= MAX_PHOTOS) {
    return NextResponse.json(
      { error: `อัพได้สูงสุด ${MAX_PHOTOS} รูป — ลบรูปเดิมก่อนค่ะ` },
      { status: 400 },
    );
  }
  const data = typeof body?.data === "string" ? body.data : "";
  if (!data) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  const base64 = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  const inputBuffer = Buffer.from(base64, "base64");

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ" }, { status: 400 });
  }

  const path = `${pt.talent_id}/casting/${randomUUID()}.webp`;
  const blob = new Blob([new Uint8Array(outputBuffer)], { type: "image/webp" });
  const { error: uploadError } = await supabase.storage
    .from("talent-photos")
    .upload(path, blob, { contentType: "image/webp" });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("project_talents")
    .update({ extra_photo_paths: [...current, path] })
    .eq("id", pt.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path });
}
