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
