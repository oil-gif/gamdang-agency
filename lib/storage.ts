import "server-only";
import { supabase } from "@/lib/supabase/server";

export function getPhotoUrl(path: string) {
  return supabase.storage.from("talent-photos").getPublicUrl(path).data.publicUrl;
}

// Same-origin, JPEG-transcoded URL served by app/photo/[...path]/route.ts.
// Use this in <img>/next/image for anything a LINE LIFF webview will load —
// it can't render our stored WebP files, only JPEG.
export function getPhotoProxyUrl(path: string) {
  return `/photo/${path}`;
}
