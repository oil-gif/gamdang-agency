"use server";

import { createTalentLinkToken } from "@/lib/auth/talent-session";

export async function getTalentLinkUrl(talentId: string) {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) throw new Error("Missing NEXT_PUBLIC_LIFF_ID");

  const token = await createTalentLinkToken(talentId);
  return `https://liff.line.me/${liffId}?link=${token}`;
}
