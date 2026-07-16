// URL หลักของเว็บ ใช้สร้างลิงก์แชร์ / OG / ลิงก์งาน (job, submit, proposal, casting)
// ปกติเป็นโดเมน Vercel — วันที่ย้ายมาโดเมนจริง (เช่น casting.gamdangagency.com)
// แค่ตั้ง NEXT_PUBLIC_SITE_URL ใน Vercel แล้ว redeploy ลิงก์ทั้งระบบเปลี่ยนตาม
// ไม่ต้องแก้โค้ด
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://gamdang-app.vercel.app";

// เว็บหลักของบริษัท (WordPress) — ปุ่ม "กลับหน้าหลัก" ในแอปจะลิงก์มาที่นี่
// ตอน WP ขึ้นจริงแค่ตั้ง NEXT_PUBLIC_MAIN_SITE_URL ใน Vercel ก็เปลี่ยนทั้งระบบ
export const MAIN_SITE_URL =
  process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.gamdangagency.com";
