import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createAdminAuthClient } from "@/lib/supabase/auth-server";
import { supabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

// อัพรูปปกงาน (admin only) — resize เป็น 1200×630 (Open Graph มาตรฐาน
// FB/LINE share) เก็บ talent-photos/_project-covers/. base64 JSON + Blob
// (gotchas เดิม)
export async function POST(req: NextRequest) {
  const authed = await createAdminAuthClient();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const data = typeof body?.data === "string" ? body.data : "";
  if (!data) return NextResponse.json({ error: "missing file" }, { status: 400 });

  const base64 = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  const input = Buffer.from(base64, "base64");

  let out: Buffer;
  try {
    out = await sharp(input)
      .rotate()
      .resize(1200, 630, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ" }, { status: 400 });
  }

  const path = `_project-covers/${randomUUID()}.jpg`;
  const blob = new Blob([new Uint8Array(out)], { type: "image/jpeg" });
  const { error } = await supabase.storage
    .from("talent-photos")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, path });
}
