import { NextResponse } from "next/server";
import sharp from "sharp";
import { getPhotoUrl } from "@/lib/storage";
import { supabase } from "@/lib/supabase/server";

// sharp is a native binding — must run on the Node.js runtime, not Edge.
export const runtime = "nodejs";

// Serves talent photos same-origin, transcoded to JPEG. The LINE LIFF
// in-app browser renders JPEG (e.g. LINE profile pics) but fails on the
// WebP files we store, so hot-linking the WebP — directly or via
// next/image (which also emits WebP) — shows a broken image. Re-encoding
// to JPEG here fixes it for every browser. Filenames are immutable UUIDs,
// so the result is safe to cache aggressively.
// รองรับ ?w=320 → ย่อเป็น thumbnail (สำหรับหน้า grid ที่มีการ์ดเยอะๆ
// จะได้โหลดเร็วแม้ข้อมูลเป็นหมื่นคน) — ไม่ใส่ = ขนาดเต็ม
//
// ⚠️ ต้อง same-origin เสมอ — ห้ามเปลี่ยนเป็น redirect ไป Supabase
// `components/compcard/CompcardGenerator.tsx` โหลด /photo/... ไปวาดบน canvas
// ถ้ารูปมาจากโดเมนอื่น canvas จะ taint แล้วปุ่มสร้างคอมการ์ดพัง
//
// ===== ลด CPU ของ Vercel (2026-09-17) =====
// Vercel แพ็กเกจฟรีเกินโควตา Fluid Active CPU (4h37m / 4h) · ตัวกินหลักคือ
// sharp ที่รันทุกครั้งที่รูปยังไม่อยู่ใน CDN cache — และ cache ถูกล้างทุกครั้งที่
// deploy (เดือนที่ผ่านมา deploy ~57 ครั้ง) รูปทั้งเว็บเลยถูกแปลงซ้ำไปเรื่อยๆ
//
// แก้ 2 ทาง (วัดจาก 60 รูปตัวอย่างจริง ก่อนตัดสินใจ):
// 1. รูปย่อ w=320 → แปลงครั้งเดียว เก็บถาวรใน storage ที่ `_cache/w320/…`
//    ครั้งต่อไปแค่อ่านไฟล์ส่งกลับ (I/O ไม่นับเป็น CPU) · รอด deploy
//    กินพื้นที่เพิ่มแค่ ~62 MB (เฉลี่ย 15 KB/รูป)
//    ❌ ไม่เก็บขนาดเต็ม: +662 MB → รวม ~1.13 GB เกิน 1 GB ของ Supabase ฟรี
// 2. ต้นฉบับที่เป็น JPEG อยู่แล้ว + ขอขนาดเต็ม → ส่งต่อเลย ไม่ต้องแปลงซ้ำ
//    (762 ไฟล์ เฉลี่ย 273 KB = ไฟล์ใหญ่สุด แปลงแพงสุด)
//
// ทุกเส้นทางใหม่ถ้าพลาด → ตกกลับไปแปลงแบบเดิม รูปต้องไม่พังเด็ดขาด
// (เคยรูปพังทั้งเว็บ 6 ชม. เมื่อ 2026-08-19)
const BUCKET = "talent-photos";
const CACHED_WIDTHS = new Set([320]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const storagePath = path.join("/");
  const sp = new URL(req.url).searchParams;
  const wRaw = sp.get("w");
  const width = wRaw
    ? Math.min(Math.max(parseInt(wRaw, 10) || 0, 64), 1600)
    : null;
  // ?dl=<ชื่อไฟล์> → บังคับดาวน์โหลด (แอดมินกด "บันทึกรูป" ส่งให้ลูกค้าได้เลย)
  // ใช้ Content-Disposition แทน attribute download — ทำงานบนมือถือด้วย
  const dlRaw = sp.get("dl");
  const dlName = dlRaw
    ? `${dlRaw.replace(/[^\w\-. ]/g, "").slice(0, 60) || "gamdang"}.jpg`
    : null;

  // Only ever serve from the known layouts: {talentId}/{kind}/{file},
  // _unassigned/{file} (photo inbox) หรือ _project-covers/{file} (รูปปกงาน)
  if (
    !/^([\w-]+\/(gallery|compcard|casting)|_unassigned|_project-covers)\/[\w-]+\.\w+$/.test(
      storagePath,
    )
  ) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // ---- 1) รูปย่อที่เคยแปลงเก็บไว้แล้ว → ส่งเลย ไม่เรียก sharp ----
  const cacheKey =
    width && CACHED_WIDTHS.has(width)
      ? `_cache/w${width}/${storagePath}.jpg`
      : null;
  if (cacheKey) {
    try {
      const hit = await fetch(getPhotoUrl(cacheKey));
      if (hit.ok) {
        const bytes = new Uint8Array(await hit.arrayBuffer());
        if (isJpeg(bytes)) return jpegResponse(bytes, dlName, "cache");
      }
    } catch {
      // อ่าน cache ไม่ได้ → แปลงแบบเดิมด้านล่าง
    }
  }

  const upstream = await fetch(getPhotoUrl(storagePath));
  if (!upstream.ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const input = Buffer.from(await upstream.arrayBuffer());

  // ---- 2) ต้นฉบับเป็น JPEG อยู่แล้ว + ขอขนาดเต็ม → ส่งต่อได้เลย ----
  // เช็คจาก byte จริง (FF D8 FF) ไม่เชื่อนามสกุลไฟล์อย่างเดียว
  // + ต้องไม่มี EXIF สั่งหมุนภาพ — ทางเดิม .rotate() หมุนให้ตรงก่อนส่ง ถ้าส่งต่อ
  // ดิบๆ จะต้องพึ่งเบราว์เซอร์หมุนเอง (ตรวจแล้ว 2026-09-17: JPEG ในระบบ 704 ไฟล์
  // ไม่มีสักไฟล์ที่หมุน แต่กันไว้สำหรับรูปที่อัพเข้ามาทีหลัง) · metadata() อ่านแค่
  // หัวไฟล์ ไม่ถอดรูป จึงแทบไม่กิน CPU
  if (!width && isJpeg(input)) {
    try {
      const { orientation } = await sharp(input).metadata();
      if (!orientation || orientation === 1) {
        return jpegResponse(new Uint8Array(input), dlName, "original");
      }
    } catch {
      // อ่านหัวไฟล์ไม่ได้ → แปลงแบบเดิม
    }
  }

  // ---- 3) แปลงด้วย sharp (ทางเดิม) ----
  let jpeg: Buffer;
  try {
    let pipeline = sharp(input).rotate();
    if (width) {
      pipeline = pipeline.resize({ width, withoutEnlargement: true });
    }
    jpeg = await pipeline
      .jpeg({ quality: width && width <= 480 ? 72 : 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "bad image" }, { status: 422 });
  }

  // เก็บรูปย่อไว้ใช้ครั้งหน้า — พลาดก็ไม่เป็นไร ครั้งหน้าจะลองเก็บใหม่
  if (cacheKey) {
    try {
      // ⚠️ ต้องห่อเป็น Blob — ส่ง Buffer ตรงๆ ไฟล์เสียบน Vercel (เคยโดนแล้ว)
      await supabase.storage
        .from(BUCKET)
        .upload(cacheKey, new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }), {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: false, // มีคนเก็บพร้อมกันแล้ว → ปล่อย error ไป ไม่ต้องทับ
        });
    } catch {
      /* ไม่เป็นไร */
    }
  }

  return jpegResponse(new Uint8Array(jpeg), dlName, "transcode");
}

// JPEG ขึ้นต้นด้วย FF D8 FF เสมอ
function isJpeg(b: Uint8Array) {
  return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

function jpegResponse(
  bytes: Uint8Array,
  dlName: string | null,
  source: "cache" | "original" | "transcode",
) {
  return new NextResponse(new Blob([bytes as BlobPart], { type: "image/jpeg" }), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      // ไว้ตรวจว่ารูปมาจากทางไหน (ดูใน DevTools ได้)
      "X-Photo-Source": source,
      ...(dlName
        ? { "Content-Disposition": `attachment; filename="${dlName}"` }
        : {}),
    },
  });
}
