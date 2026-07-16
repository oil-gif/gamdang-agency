// Fixed ethnicity list (multi-select — เลือกได้มากกว่า 1)
// รายการตามที่พี่เจ้าของกำหนด 2026-07-14 (แทนชุดเดิม 10 ตัวเลือก —
// ข้อมูลเก่าถูก remap เข้าหมวดใหม่แล้ว)
export const ETHNICITIES = [
  { value: "asian", label: "Asian (เอเชีย)" },
  { value: "mixed_race", label: "Mixed Race (ลูกครึ่ง)" },
  { value: "caucasian", label: "Caucasian / White (ผิวขาว / ตะวันตก)" },
  {
    value: "south_asian_me",
    label: "South Asian / Indian / Middle Eastern (เอเชียใต้ / อินเดีย / ตะวันออกกลาง)",
  },
  { value: "african_black", label: "African / Black (ผิวสี / แอฟริกัน)" },
  { value: "hispanic_latino", label: "Hispanic / Latino (ลาตินอเมริกา)" },
] as const;

// Fixed influencer "Expertise" categories, carried over from the old system.
export const CATEGORIES = [
  "Beauty",
  "Food",
  "Travel",
  "Lifestyle",
  "Fashion",
  "Tech",
  "Fitness",
  "Parenting",
  "Pet",
  "Others",
] as const;

export const STATUS_LABEL_TH: Record<string, string> = {
  pending: "รออนุมัติ",
  active: "อนุมัติแล้ว",
  rejected: "ปฏิเสธ",
  inactive: "ไม่ใช้งาน",
};

export const TIER_LABEL: Record<string, string> = {
  nano: "NANO",
  micro: "MICRO",
  mid: "MID-TIER",
  macro: "MACRO",
  celeb: "MEGA",
};

// ข้อมูลติดต่อ agency — ใช้ทั้ง CTA ท้ายหน้าลิงก์ลูกค้าและ PDF report
export const CONTACT = {
  lineId: "@gamdangmodeling",
  // ลิงก์ add friend มาตรฐานของ LINE (@ ต้อง encode เป็น %40)
  lineUrl: "https://line.me/R/ti/p/%40gamdangmodeling",
  websites: [
    { label: "www.gamdang.com", url: "https://www.gamdang.com" },
    { label: "www.gamdangagency.com", url: "https://www.gamdangagency.com" },
  ],
} as const;

// จำนวนการ์ดต่อหน้าของ list หลังบ้าน (pagination)
export const TALENTS_PAGE_SIZE = 60;

// จำนวนแถวต่อหน้าของ list โปรเจกต์ (pagination)
export const PROJECTS_PAGE_SIZE = 50;

// ระบบจองถ่ายโปรไฟล์ (ดู supabase/migrations/007_booking.sql)
// หมายเหตุ: ตามเอกสารแนะนำให้ย้ายเป็น setting แก้ได้เองในอนาคต — ตอนนี้เก็บ
// รวมที่เดียวตรงนี้ แก้ที่เดียวจบ
export const BOOKING = {
  hours: [
    "09:00", "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00",
  ],
  photoCap: 15, // ห้องถ่ายภาพ ต่อชั่วโมง
  videoCap: 12, // ห้องวิดีโอ ต่อชั่วโมง
  packages: {
    A: {
      name: "Package A",
      subtitle: "Compcard + Photos + VDO",
      price: 1390,
      note: "จองห้องถ่ายภาพและห้องวิดีโอในรอบเดียวกันอัตโนมัติ",
    },
    B: {
      name: "Package B",
      subtitle: "Compcard + Photos",
      price: 990,
      note: "จองห้องถ่ายภาพเท่านั้น",
    },
  },
  bank: {
    bank: "ธนาคารกสิกรไทย (KASIKORNBANK) สาขา Central Bangna (0604)",
    accountNo: "037-3-98892-8",
    accountName: "GAMDANG CO.,LTD. (บริษัท แก้มแดง จำกัด)",
    swift: "KASITHBK",
  },
  infoUrl: "https://www.gamdang.com/profile-shooting-info/",
} as const;

// เวลาแบบ AM/PM ภาษาอังกฤษ เช่น "09:00" → "9:00 AM", "13:00" → "1:00 PM"
// (client-safe — ใช้ในหน้าจอง)
export function formatHourEN(hour: string): string {
  const [h] = hour.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}
