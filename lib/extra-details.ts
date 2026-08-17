// ข้อมูลเพิ่มเติมที่ลูกค้าถามบ่อย (English Level, Swim ฯลฯ) — เก็บที่ตัวคน
// (talents.extra_details) กรอกครั้งเดียวใช้ได้ทุกงาน · ดู migration 022
//
// client-safe: ใช้ทั้งฝั่ง server (report) และ client component (ฟอร์มแก้ไข)

export type ExtraDetail = {
  label: string; // เช่น "English Level"
  value: string; // เช่น "Intermediate"
  show: boolean; // ติ๊กแล้วถึงจะขึ้นในรายงานที่ส่งลูกค้า
};

// หัวข้อที่ลูกค้าถามบ่อย — กดปุ่มเติมได้เลย ไม่ต้องพิมพ์เอง
export const DETAIL_PRESETS: { label: string; values: string[] }[] = [
  { label: "English Level", values: ["Beginner", "Intermediate", "Advanced", "Native"] },
  { label: "Passport", values: ["Yes", "No", "Expired"] },
  { label: "Swim", values: ["Can", "Cannot"] },
  { label: "Bicycle", values: ["Can", "Cannot"] },
  { label: "Driving", values: ["Can", "Cannot"] },
  { label: "Dance", values: ["Can", "Cannot"] },
  { label: "Acting Experience", values: ["Yes", "No"] },
];

// อ่านค่าจาก DB ที่อาจเป็นอะไรก็ได้ (แถวเก่า/ข้อมูลเพี้ยน) ให้ปลอดภัยเสมอ
export function parseExtraDetails(raw: unknown): ExtraDetail[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    if (!r || typeof r !== "object") return [];
    const o = r as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const value = typeof o.value === "string" ? o.value.trim() : "";
    if (!label && !value) return [];
    return [{ label, value, show: o.show === true }];
  });
}

// เฉพาะรายการที่ติ๊กโชว์ + กรอกครบ — ใช้ตอน render รายงานให้ลูกค้า
export function visibleExtraDetails(raw: unknown): ExtraDetail[] {
  return parseExtraDetails(raw).filter((d) => d.show && d.label && d.value);
}
