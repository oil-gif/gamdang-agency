import type { NextConfig } from "next";

const supabaseHost = process.env.SUPABASE_URL
  ? new URL(process.env.SUPABASE_URL).hostname
  : "";

const nextConfig: NextConfig = {
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
