import "server-only";
import { timingSafeEqual } from "crypto";

// ชั้นที่ 2 สำหรับ "การกระทำที่กู้คืนไม่ได้" (ลบรอบถ่าย ฯลฯ)
// — ล็อกอินแอดมินอย่างเดียวไม่พอ ต้องกรอกรหัสยืนยันอีกครั้ง กันเผลอกด
// ตั้งรหัสที่ env `ADMIN_DANGER_CODE` (ตั้งใน Vercel + .env.local)
// ถ้ายังไม่ตั้ง → ใช้วิธีสำรอง: ต้องพิมพ์คำยืนยันให้ตรง (ยังมี 2 ชั้นเสมอ
// ไม่ล็อกตัวเองออกจากระบบ)

export const FALLBACK_PHRASE = "ลบเลย";

/** ตั้งรหัสไว้หรือยัง — ใช้บอก UI ว่าจะขอ "รหัส" หรือ "คำยืนยัน" */
export function hasDangerCode() {
  return Boolean(process.env.ADMIN_DANGER_CODE);
}

/** ตรวจรหัสยืนยัน (เทียบแบบ timing-safe) */
export function verifyDangerCode(input: string | null | undefined) {
  const given = (input ?? "").trim();
  if (!given) return false;
  const expected = (process.env.ADMIN_DANGER_CODE ?? "").trim() || FALLBACK_PHRASE;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
