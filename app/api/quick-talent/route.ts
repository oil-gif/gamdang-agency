import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { guardAdminOnly } from "@/lib/auth/upload-guard";
import { supabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

// "เพิ่มด่วนจากคอมการ์ด" — สร้างใบร่าง talent 1 ใบต่อคอมการ์ด 1 รูป
//
// บาง talent เรามีแต่คอมการ์ด ไม่รู้วันเกิด/ส่วนสูง แต่ต้องเอาไปเสนอลูกค้าก่อน
// (พี่เจ้าของแจ้ง 2026-09-08) · route นี้จึงสร้างแถวสถานะ "draft" ที่ยังไม่มีชื่อ
// แล้วอัพคอมการ์ดเข้าไปเลย · แอดมินค่อยพิมพ์ชื่อ/เลือก Role ในหน้าจอแล้วกดบันทึก
//
// ทำไมสร้างแถวก่อนแล้วค่อยอัพรูป (ไม่ใช่พักรูปไว้ก่อน): รูปจะได้อยู่ path จริง
// ของคนนั้นตั้งแต่แรก ไม่ต้องมีระบบเก็บกวาดไฟล์ค้างอีกชุด
//
// ⚠️ แอดมินเท่านั้น — สร้าง talent ได้ ต้องกันคนนอกยิงเข้ามาสร้างขยะ
export async function POST(req: NextRequest) {
  const guard = await guardAdminOnly();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = await req.json().catch(() => null);
  const data = typeof body?.data === "string" ? body.data : "";
  if (!data) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }

  const base64 = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  let output: Buffer;
  try {
    // ขนาดเดียวกับ Comp Card Studio — เล็กพอส่งไว คมพอเสนอลูกค้า
    output = await sharp(Buffer.from(base64, "base64"))
      .resize({ width: 1800, withoutEnlargement: true })
      .jpeg({ quality: 84 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ" },
      { status: 400 },
    );
  }

  const { data: created, error: insErr } = await supabase
    .from("talents")
    .insert({ status: "draft", source: "admin", is_model: true })
    .select("id, code")
    .single();
  if (insErr || !created) {
    return NextResponse.json(
      { error: insErr?.message ?? "สร้างใบร่างไม่สำเร็จ" },
      { status: 500 },
    );
  }

  const path = `${created.id}/compcard/${randomUUID()}.jpg`;
  // ⚠️ ต้องห่อเป็น Blob — ส่ง Buffer ตรงๆ ไฟล์จะเสียบน Vercel (เคยโดนมาแล้ว)
  const blob = new Blob([new Uint8Array(output)], { type: "image/jpeg" });
  const { error: upErr } = await supabase.storage
    .from("talent-photos")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (upErr) {
    // อัพรูปไม่ขึ้น → ลบใบร่างทิ้ง ไม่ให้เหลือแถวเปล่าค้างในระบบ
    await supabase.from("talents").delete().eq("id", created.id);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: photo } = await supabase
    .from("talent_photos")
    .insert({
      talent_id: created.id,
      kind: "compcard",
      storage_path: path,
      display_order: 0,
    })
    .select("id")
    .single();
  if (photo) {
    await supabase
      .from("talents")
      .update({ compcard_photo_id: photo.id })
      .eq("id", created.id);
  }

  return NextResponse.json({
    id: created.id,
    code: created.code,
    photo_path: path,
  });
}
