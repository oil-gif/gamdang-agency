// URL หลักของเว็บ ใช้สร้างลิงก์แชร์ / OG / ลิงก์งาน (job, submit, proposal, casting)
// ปกติเป็นโดเมน Vercel — วันที่ย้ายมาโดเมนจริง (เช่น casting.gamdangagency.com)
// แค่ตั้ง NEXT_PUBLIC_SITE_URL ใน Vercel แล้ว redeploy ลิงก์ทั้งระบบเปลี่ยนตาม
// ไม่ต้องแก้โค้ด
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://gamdang-app.vercel.app";
