import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { supabase } from "@/lib/supabase/server";

// sharp is a native binding — must run on the Node.js runtime, not Edge.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const talentId = String(form.get("talent_id") ?? "");
  const kind = String(form.get("kind") ?? "");

  if (!(file instanceof File) || !talentId) {
    return NextResponse.json({ error: "missing file or talent_id" }, { status: 400 });
  }
  if (kind !== "gallery" && kind !== "compcard") {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
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

  const { error: uploadError } = await supabase.storage
    .from("talent-photos")
    .upload(path, outputBuffer, { contentType: "image/webp" });

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
