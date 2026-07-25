import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
}

/**
 * Cookie-bound Supabase client used ONLY for the admin login session
 * (Supabase Auth email/password). Talent auth does NOT use this — talents
 * are authenticated via their own custom LINE-session cookie, not
 * Supabase Auth. Use this in Server Actions / Server Components /
 * Route Handlers under app/admin/**.
 */
export async function createAdminAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseSecretKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component render — safe to ignore since
          // middleware.ts refreshes the session cookie on navigation.
        }
      },
    },
  });
}

// true ถ้า request นี้มาจากแอดมินที่ล็อกอินแล้ว (Supabase Auth) — ใช้ใน
// route ที่ปกติเช็คสิทธิ์เจ้าของ talent เพื่อให้แอดมินอัพ/บันทึกแทนได้เสมอ
// (เผื่อเบราว์เซอร์แอดมินมี talent session ค้างจากการทดสอบ)
export async function isAdminAuthed(): Promise<boolean> {
  try {
    const supabase = await createAdminAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}
