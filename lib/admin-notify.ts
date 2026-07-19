import "server-only";
import { pushLineMessage } from "@/lib/line-messaging";

// แจ้งเตือน admin ทาง LINE — เข้ากลุ่มผ่าน OA gamdangprofile (โควตาแยกจาก
// OA หลักที่คุยกับ talent) ถ้าตั้ง ADMIN_LINE_NOTIFY_ID + NOTIFY_LINE_ACCESS_TOKEN
// ไว้ · ไม่งั้น fallback เป็น LINE ส่วนตัว (ADMIN_LINE_USER_ID) / OA หลัก
// best-effort — พังก็ไม่ทำให้ flow หลักล้ม
export async function notifyAdmin(lines: string[]) {
  const to = process.env.ADMIN_LINE_NOTIFY_ID || process.env.ADMIN_LINE_USER_ID;
  if (!to) return;
  try {
    await pushLineMessage(
      to,
      [{ type: "text", text: lines.join("\n") }],
      process.env.NOTIFY_LINE_ACCESS_TOKEN,
    );
  } catch (e) {
    console.error("admin notify failed", e);
  }
}
