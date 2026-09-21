// ปุ่ม "รับทราบค่ะ" ใต้ข้อความยืนยันรอบถ่ายใน LINE (Quick Reply) — ขอ 2026-09-21
//
// กดแล้ว LINE ส่งข้อความนี้กลับมา "ในนามลูกค้า" → แชทขึ้นใน LINE OA ของแอดมิน
// พร้อมชื่อน้อง + รอบถ่าย (รู้ทันทีว่าไลน์นี้ของใคร — ส่วนใหญ่เป็นไลน์พ่อแม่)
// และ webhook (/api/line/webhook) อ่าน #ref ท้ายข้อความไปติ๊กที่คิวนั้น
//
// ⚠️ ต้องมีคำนำหน้าเฉพาะ — ห้ามจับแค่คำว่า "รับทราบ" เพราะข้อความแจ้งงาน
// casting ก็ขอให้ talent ตอบ "รับทราบ" เหมือนกัน แยกไม่ออกว่าตอบเรื่องไหน
// #ref = 8 ตัวแรกของ booking id · ผู้ปกครองคนเดียวจองให้ลูกหลายคนได้
// (migration 011) เลยต้องรู้ว่ากดของใบไหน · webhook เทียบเฉพาะคิวของ
// LINE user ที่กดเท่านั้น คนอื่นพิมพ์ ref มั่วๆ ก็ติ๊กของคนอื่นไม่ได้

export const ACK_PREFIX = "✅ รับทราบรอบถ่าย";
export const ACK_LABEL = "✅ รับทราบค่ะ"; // ป้ายบนปุ่ม — LINE จำกัด 20 ตัวอักษร

export function ackRef(bookingId: string) {
  return bookingId.replace(/-/g, "").slice(0, 8).toLowerCase();
}

export function buildAckText(opts: {
  bookingId: string;
  name: string;
  when: string;
}) {
  // LINE จำกัดข้อความของปุ่มที่ 300 ตัวอักษร — ตัดชื่อก่อน #ref หายเด็ดขาด
  const tail = ` · ${opts.when} #${ackRef(opts.bookingId)}`;
  const head = `${ACK_PREFIX} · ${opts.name}`.slice(0, 300 - tail.length);
  return head + tail;
}

/** คืน ref ถ้าเป็นข้อความจากปุ่มรับทราบ · ไม่ใช่ → null */
export function parseAckRef(text: string) {
  if (!text.trim().startsWith(ACK_PREFIX)) return null;
  return text.match(/#([0-9a-f]{8})\s*$/i)?.[1].toLowerCase() ?? null;
}
