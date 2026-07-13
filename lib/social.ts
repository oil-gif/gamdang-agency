// Shared helpers for rendering talent social channels on client-facing
// pages (the /p/[token] portfolio and later the public site).

export const SOCIAL_PLATFORMS = [
  { key: "ig", label: "Instagram", short: "IG", color: "#E1306C", base: "https://www.instagram.com/" },
  { key: "tiktok", label: "TikTok", short: "TT", color: "#111111", base: "https://www.tiktok.com/@" },
  { key: "youtube", label: "YouTube", short: "YT", color: "#FF0000", base: "https://www.youtube.com/@" },
  { key: "facebook", label: "Facebook", short: "fb", color: "#1877F2", base: "https://www.facebook.com/" },
  { key: "lemon8", label: "Lemon8", short: "L8", color: "#EBB80A", base: "https://www.lemon8-app.com/@" },
] as const;

export type SocialTalent = {
  ig_handle?: string | null;
  ig_followers?: number;
  tiktok_handle?: string | null;
  tiktok_followers?: number;
  youtube_handle?: string | null;
  youtube_followers?: number;
  facebook_handle?: string | null;
  facebook_followers?: number;
  lemon8_handle?: string | null;
  lemon8_followers?: number;
};

export function socialUrl(base: string, handle: string) {
  const trimmed = handle.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return base + trimmed.replace(/^@/, "");
}

// All channels the talent actually filled in, with resolved URL + followers.
export function talentSocials(t: SocialTalent) {
  return SOCIAL_PLATFORMS.flatMap((p) => {
    const handle = t[`${p.key}_handle` as keyof SocialTalent] as string | null;
    if (!handle) return [];
    const followers =
      (t[`${p.key}_followers` as keyof SocialTalent] as number) ?? 0;
    return [{ ...p, handle, followers, url: socialUrl(p.base, handle) }];
  });
}

// The channel with the biggest audience — shown as the headline number.
export function topSocial(t: SocialTalent) {
  const all = talentSocials(t).filter((s) => s.followers > 0);
  if (all.length === 0) return null;
  return all.reduce((max, s) => (s.followers > max.followers ? s : max));
}

export function formatFollowers(n: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
