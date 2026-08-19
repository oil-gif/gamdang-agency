import type { NextConfig } from "next";

const supabaseHost = process.env.SUPABASE_URL
  ? new URL(process.env.SUPABASE_URL).hostname
  : "";

const nextConfig: NextConfig = {
  // sharp โหลด binary ของ libvips ตอน runtime (ไม่ใช่ตอน bundle) ถ้าไม่บอก
  // Next ไว้ ไฟล์ .so จะไม่ถูกก๊อปเข้าไปใน serverless function แล้วพังตอนใช้งานจริง
  // ด้วย ERR_DLOPEN_FAILED: libvips-cpp.so.x.x.x: cannot open shared object file
  // (เจอจริง 2026-08-19 — พังทั้ง /api อัพโหลดทุกตัว และ /photo proxy รูปทั้งเว็บ)
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@img/**/*"],
    "/photo/**/*": ["./node_modules/@img/**/*"],
  },
  images: {
    // Serve talent photos through our own /_next/image endpoint (same
    // origin as the page) instead of hot-linking supabase.co. Some in-app
    // browsers (notably the LINE LIFF webview) fail to render cross-origin
    // images; same-origin sidesteps that and optimizes for mobile.
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
