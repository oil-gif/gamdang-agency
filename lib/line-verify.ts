import "server-only";

// ตรวจ LINE ID token กับ LINE (channel เดียวกับ LIFF/Login) แล้วคืน
// โปรไฟล์ — ใช้ร่วมกันทั้ง /api/line/verify และ /api/booking
export async function verifyLineIdToken(idToken: string) {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) return null;
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  if (!res.ok) return null;
  const profile = (await res.json()) as {
    sub: string;
    name?: string;
    picture?: string;
  };
  return {
    lineUserId: profile.sub,
    name: profile.name ?? null,
    picture: profile.picture ?? null,
  };
}
