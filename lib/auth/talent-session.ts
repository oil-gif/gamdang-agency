import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "talent_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const secret = process.env.LINE_SESSION_SECRET;
if (!secret) {
  throw new Error("Missing LINE_SESSION_SECRET in .env.local");
}
const encodedSecret = new TextEncoder().encode(secret);

export async function createTalentSession(talentId: string) {
  const token = await new SignJWT({ talentId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(encodedSecret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

// Talent auth mirrors the pattern in lib/supabase/auth-server.ts, but reads
// our own signed cookie instead of a Supabase Auth session — talents never
// touch Supabase Auth.
export async function getTalentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return typeof payload.talentId === "string"
      ? { talentId: payload.talentId }
      : null;
  } catch {
    return null;
  }
}
