// ตรวจว่า error จาก Supabase คือ "ยังไม่มีคอลัมน์นี้" (ยังไม่ได้รัน migration)
//
// ใช้ให้ฟีเจอร์ใหม่ถอยไปทำงานแบบเดิมได้ แทนที่จะพังทั้งหน้าเมื่อ migration
// ยังไม่ถูกรัน — ทั้งโปรเจกต์ใช้แพตเทิร์นนี้ร่วมกัน
export function isMissingColumn(
  error: { code?: string; message?: string } | null,
) {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column|schema cache|could not find/i.test(error.message ?? "")
  );
}
