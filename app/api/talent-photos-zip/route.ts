import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getPhotoUrl } from "@/lib/storage";
import { isAdminAuthed } from "@/lib/supabase/auth-server";
import { supabase } from "@/lib/supabase/server";
import { createZip, type ZipEntry } from "@/lib/zip";

export const runtime = "nodejs";

// ดาวน์โหลดรูปทั้งหมดของ talent เป็นไฟล์ ZIP เดียว (ส่งให้ลูกค้าได้เลย)
// โฟลเดอร์ในไฟล์ = ชื่อ talent เช่น "GC669Z-Oil/compcard.jpg", ".../1.jpg"
// เฉพาะแอดมินที่ล็อกอินแล้วเท่านั้น (รูปเป็นข้อมูลของ talent)
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const talentId = req.nextUrl.searchParams.get("talent_id") ?? "";
  if (!talentId) {
    return NextResponse.json({ error: "missing talent_id" }, { status: 400 });
  }

  const { data: talent } = await supabase
    .from("talents")
    .select("code, nickname_en, nickname_th")
    .eq("id", talentId)
    .maybeSingle();
  if (!talent) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: photos } = await supabase
    .from("talent_photos")
    .select("kind, storage_path, display_order")
    .eq("talent_id", talentId)
    .order("display_order", { ascending: true });
  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: "ยังไม่มีรูป" }, { status: 404 });
  }

  // ชื่อโฟลเดอร์/ไฟล์ = รหัส + ชื่อ (ตัดอักขระที่ใช้ในชื่อไฟล์ไม่ได้ออก)
  const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").trim();
  const folder =
    safe(
      [talent.code, talent.nickname_en || talent.nickname_th]
        .filter(Boolean)
        .join("-"),
    ) || "gamdang-talent";

  const entries: ZipEntry[] = [];
  let n = 0;
  for (const p of photos) {
    try {
      const upstream = await fetch(getPhotoUrl(p.storage_path));
      if (!upstream.ok) continue;
      // แปลงเป็น JPEG ให้ลูกค้าเปิดได้ทุกเครื่อง (ที่เก็บเป็น WebP)
      const jpeg = await sharp(Buffer.from(await upstream.arrayBuffer()))
        .rotate()
        .jpeg({ quality: 88 })
        .toBuffer();
      const name =
        p.kind === "compcard" ? "compcard" : `${String(++n).padStart(2, "0")}`;
      entries.push({ name: `${folder}/${name}.jpg`, data: jpeg });
    } catch {
      // รูปเสีย/หาย — ข้ามไป ไม่ให้ทั้ง zip ล้ม
    }
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: "อ่านรูปไม่สำเร็จ" }, { status: 500 });
  }

  const zip = createZip(entries);
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${folder}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
