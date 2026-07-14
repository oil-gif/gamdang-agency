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
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const storagePath = path.join("/");

  // Only ever serve from the known layout: {talentId}/{kind}/{file}.
  if (!/^[\w-]+\/(gallery|compcard|casting)\/[\w-]+\.\w+$/.test(storagePath)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const upstream = await fetch(getPhotoUrl(storagePath));
  if (!upstream.ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const input = Buffer.from(await upstream.arrayBuffer());
  let jpeg: Buffer;
  try {
    jpeg = await sharp(input).rotate().jpeg({ quality: 82 }).toBuffer();
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
