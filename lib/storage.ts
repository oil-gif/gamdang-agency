import "server-only";
import { supabase } from "@/lib/supabase/server";

export function getPhotoUrl(path: string) {
  return supabase.storage.from("talent-photos").getPublicUrl(path).data.publicUrl;
}

// Same-origin, JPEG-transcoded URL served by app/photo/[...path]/route.ts.
// Use this in <img>/next/image for anything a LINE LIFF webview will load —
// it can't render our stored WebP files, only JPEG.
// ใส่ w เพื่อขอ thumbnail (เช่น 320 สำหรับหน้า grid) — โหลดเร็วเมื่อการ์ดเยอะ
export function getPhotoProxyUrl(path: string, w?: number) {
  return w ? `/photo/${path}?w=${w}` : `/photo/${path}`;
}
