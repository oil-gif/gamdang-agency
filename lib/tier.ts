export type FollowerCounts = {
  ig: number;
  tiktok: number;
  youtube: number;
  facebook: number;
  lemon8: number;
};

/**
 * The ONE tier calculation used everywhere (admin form + LIFF apply form +
 * self-edit). The old PHP system had two divergent versions of this — we
 * deliberately only ever have one.
 */
export function computeTierAndFollowers(counts: FollowerCounts) {
  const max_followers = Math.max(
    counts.ig,
    counts.tiktok,
    counts.youtube,
    counts.facebook,
    counts.lemon8,
  );

  let tier: "nano" | "micro" | "mid" | "macro" | "celeb" = "nano";
  if (max_followers >= 1_000_000) tier = "celeb";
  else if (max_followers >= 500_000) tier = "macro";
  else if (max_followers >= 100_000) tier = "mid";
  else if (max_followers >= 10_000) tier = "micro";

  return { max_followers, tier };
}
