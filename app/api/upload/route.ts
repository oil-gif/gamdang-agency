import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { supabase } from "@/lib/supabase/server";
import { getTalentSession } from "@/lib/auth/talent-session";

// sharp is a native binding — must run on the Node.js runtime, not Edge.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Body is base64 JSON, not multipart — see the note in PhotoUploader.tsx
  // (the LINE in-app browser corrupts binary multipart uploads).
  const body = await req.json().catch(() => null);
  const talentId = String(body?.talent_id ?? "");
  const kind = String(body?.kind ?? "");
  const data = typeof body?.data === "string" ? body.data : "";

  if (!data || !talentId) {
    return NextResponse.json({ error: "missing file or talent_id" }, { status: 400 });
  }
  if (kind !== "gallery" && kind !== "compcard") {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  // This endpoint has no admin auth check (only /admin/:path* pages are
  // gated) — a logged-in talent's talent_id is now visible in /apply/edit's
  // hidden form fields, so anyone with a talent session must be blocked
  // from uploading to a talent_id that isn't their own.
  const talentSession = await getTalentSession();
  if (talentSession && talentSession.talentId !== talentId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const base64 = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  const inputBuffer = Buffer.from(base64, "base64");
  const maxWidth = kind === "compcard" ? 1200 : 1600;

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ" }, { status: 400 });
  }

  const path = `${talentId}/${kind}/${randomUUID()}.webp`;

  // Upload a Blob, NOT the raw Node Buffer: in the Vercel serverless
  // runtime, supabase-js mangles a Buffer payload (bytes come out
  // UTF-8-replaced), storing an undecodable image. Wrapping the bytes in a
  // Blob keeps them binary-clean. (This never showed up in local dev, where
  // Buffer uploads happen to survive.)
  const outputBlob = new Blob([new Uint8Array(outputBuffer)], {
    type: "image/webp",
  });

  const { error: uploadError } = await supabase.storage
    .from("talent-photos")
    .upload(path, outputBlob, { contentType: "image/webp" });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Only one active comp card per talent — replace the old one.
  if (kind === "compcard") {
    const { data: existing } = await supabase
      .from("talent_photos")
      .select("id, storage_path")
      .eq("talent_id", talentId)
      .eq("kind", "compcard")
      .maybeSingle();

    if (existing) {
      await supabase.storage.from("talent-photos").remove([existing.storage_path]);
      await supabase.from("talent_photos").delete().eq("id", existing.id);
    }
  }

  const { data: photoRow, error: insertError } = await supabase
    .from("talent_photos")
    .insert({ talent_id: talentId, kind, storage_path: path })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (kind === "compcard") {
    await supabase
      .from("talents")
      .update({ compcard_photo_id: photoRow.id })
      .eq("id", talentId);
  }

  revalidatePath(`/admin/talents/${talentId}`);

  return NextResponse.json({ ok: true, photo: photoRow });
}
