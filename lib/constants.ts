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
