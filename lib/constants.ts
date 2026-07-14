// Fixed ethnicity list (multi-select — mixed heritage is common in this
// industry, so a talent can select more than one).
export const ETHNICITIES = [
  { value: "central_asian", label: "Central Asian" },
  { value: "east_asian", label: "East Asian", hint: "China, Japan, Korea, Taiwan" },
  {
    value: "south_asian",
    label: "South Asian",
    hint: "India, Pakistan, Bangladesh, Nepal, Sri Lanka, Bhutan, Maldives",
  },
  {
    value: "southeast_asian",
    label: "Southeast Asian",
    hint: "Thailand, Malaysia, Indonesia, Philippines, Singapore",
  },
  { value: "black_african", label: "Black African" },
  { value: "black_caribbean", label: "Black Caribbean" },
  { value: "hispanic_latino", label: "Hispanic / Latino" },
  { value: "indigenous", label: "Indigenous" },
  { value: "middle_eastern", label: "Middle Eastern" },
  { value: "white", label: "White" },
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
