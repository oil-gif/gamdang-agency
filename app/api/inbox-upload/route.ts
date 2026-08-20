import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { supabase } from "@/lib/supabase/server";
import { guardAdminOnly } from "@/lib/auth/upload-guard";

// sharp is a native binding — must run on the Node.js runtime, not Edge.
export const runtime = "nodejs";

// รับรูป batch จากหน้า /admin/photos — ย่อ + แปลง webp แล้วพักไว้ที่
// _unassigned/ รอแอดมินกดมอบหมายว่าเป็นรูปของ talent คนไหน
// (base64 JSON + Blob upload — gotchas เดิมของ LINE webview / Vercel Buffer)
export async function POST(req: NextRequest) {
  // ⚠️ เดิมไม่มีการตรวจสิทธิ์เลย — ใครยิง URL นี้ก็อัพรูปเข้าคลังกลางได้
  // (พิสูจน์แล้วว่ายิงจากเครื่องนอกระบบสำเร็จจริง 2026-08-20)
  // หน้านี้เป็นเครื่องมือของแอดมิน (/admin/photos) เท่านั้น
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
  const inputBuffer = Buffer.from(base64, "base64");

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer)
      .rotate()
      // มาตรฐานเก็บรูป: ด้านยาวไม่เกิน 1600px + WebP q80 (ไม่เก็บไฟล์ต้นฉบับเต็ม)
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ" }, { status: 400 });
  }

  const path = `_unassigned/${randomUUID()}.webp`;
  const blob = new Blob([new Uint8Array(outputBuffer)], { type: "image/webp" });
  const { error: uploadError } = await supabase.storage
    .from("talent-photos")
    .upload(path, blob, { contentType: "image/webp" });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error } = await supabase.from("photo_inbox").insert({ storage_path: path });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path });
}
