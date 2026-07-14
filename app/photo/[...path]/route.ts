import { NextResponse } from "next/server";
import sharp from "sharp";
import { getPhotoUrl } from "@/lib/storage";

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
export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const storagePath = path.join("/");
  const wRaw = new URL(req.url).searchParams.get("w");
  const width = wRaw
    ? Math.min(Math.max(parseInt(wRaw, 10) || 0, 64), 1600)
    : null;

  // Only ever serve from the known layouts: {talentId}/{kind}/{file}
  // หรือ _unassigned/{file} (photo inbox — รูป batch ที่ยังไม่มอบหมาย)
  if (
    !/^([\w-]+\/(gallery|compcard|casting)|_unassigned)\/[\w-]+\.\w+$/.test(
      storagePath,
    )
  ) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const upstream = await fetch(getPhotoUrl(storagePath));
  if (!upstream.ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const input = Buffer.from(await upstream.arrayBuffer());
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

  return new NextResponse(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
