// โพสต์ผลงานของ Influencer ในแคมเปญ — แยกตามช่องทาง + ยอด engagement
// (client-safe: ใช้ทั้งฟอร์มฝั่งผู้ใช้และหน้ารายงานฝั่ง server) ดู migration 024
//
// ⚠️ อย่าสับสน 2 อย่างนี้:
//   · talents.portfolio_links = ผลงานเก่าที่กรอกไว้ตอนสมัคร (โปรไฟล์)
//   · project_talents.submission_posts = โพสต์ที่ทำให้ "แคมเปญนี้" โดยเฉพาะ

export const PLATFORMS = [
  { key: "tiktok", label: "TikTok", color: "#111111", hint: "https://www.tiktok.com/@ชื่อ/video/..." },
  { key: "instagram", label: "Instagram", color: "#E1306C", hint: "https://www.instagram.com/p/..." },
  { key: "youtube", label: "YouTube", color: "#FF0000", hint: "https://youtu.be/..." },
  { key: "facebook", label: "Facebook", color: "#1877F2", hint: "https://www.facebook.com/..." },
  { key: "lemon8", label: "Lemon8", color: "#00D6C9", hint: "https://www.lemon8-app.com/..." },
  { key: "other", label: "อื่นๆ (Other)", color: "#6B7280", hint: "https://..." },
] as const;

export type PlatformKey = (typeof PLATFORMS)[number]["key"];

export type SubmissionPost = {
  platform: PlatformKey;
  url: string;
  posted_at?: string | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  source?: "manual" | "youtube";
  fetched_at?: string | null;
};

export function platformLabel(key: string) {
  return PLATFORMS.find((p) => p.key === key)?.label ?? key;
}
export function platformColor(key: string) {
  return PLATFORMS.find((p) => p.key === key)?.color ?? "#6B7280";
}

// เดาช่องทางจาก URL — ผู้ใช้จะได้ไม่ต้องเลือกเองทุกครั้ง
export function detectPlatform(url: string): PlatformKey {
  const u = url.toLowerCase();
  if (u.includes("tiktok.")) return "tiktok";
  if (u.includes("instagram.")) return "instagram";
  if (u.includes("youtube.") || u.includes("youtu.be")) return "youtube";
  if (u.includes("facebook.") || u.includes("fb.watch")) return "facebook";
  if (u.includes("lemon8")) return "lemon8";
  return "other";
}

// ดึง video id ของ YouTube จากลิงก์ทุกแบบ (youtu.be / watch?v= / shorts / embed)
export function youtubeVideoId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

// อ่านค่าจาก DB ให้ปลอดภัยเสมอ (แถวเก่า/ข้อมูลเพี้ยน)
export function parseSubmissionPosts(raw: unknown): SubmissionPost[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    if (!r || typeof r !== "object") return [];
    const o = r as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    if (!url) return [];
    const platform = PLATFORMS.some((p) => p.key === o.platform)
      ? (o.platform as PlatformKey)
      : detectPlatform(url);
    return [
      {
        platform,
        url,
        posted_at: typeof o.posted_at === "string" ? o.posted_at : null,
        views: num(o.views),
        likes: num(o.likes),
        comments: num(o.comments),
        shares: num(o.shares),
        saves: num(o.saves),
        source: o.source === "youtube" ? "youtube" : "manual",
        fetched_at: typeof o.fetched_at === "string" ? o.fetched_at : null,
      },
    ];
  });
}

// งานเก่าที่เก็บเป็น submission_links (URL ลอยๆ) — แปลงให้อ่านร่วมกันได้
export function postsFromLegacyLinks(links: unknown): SubmissionPost[] {
  if (!Array.isArray(links)) return [];
  return links
    .filter((l): l is string => typeof l === "string" && l.trim() !== "")
    .map((url) => ({ platform: detectPlatform(url), url: url.trim(), source: "manual" as const }));
}

// รวมยอดของหลายโพสต์ — ใช้ทั้ง Dashboard รายคนและรวมทุกคน
export type EngagementTotals = {
  posts: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement: number; // likes + comments + shares + saves
  rate: number | null; // engagement / views (%)
};

export function sumEngagement(posts: SubmissionPost[]): EngagementTotals {
  const t = { posts: posts.length, views: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
  for (const p of posts) {
    t.views += p.views ?? 0;
    t.likes += p.likes ?? 0;
    t.comments += p.comments ?? 0;
    t.shares += p.shares ?? 0;
    t.saves += p.saves ?? 0;
  }
  const engagement = t.likes + t.comments + t.shares + t.saves;
  return {
    ...t,
    engagement,
    rate: t.views > 0 ? (engagement / t.views) * 100 : null,
  };
}

export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
