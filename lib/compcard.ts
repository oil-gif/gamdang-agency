// Comp Card Studio — สเปคกลางของคอมการ์ด (client-safe: ใช้ทั้ง canvas ฝั่ง
// browser และหน้า admin) ตาม format ที่พี่เจ้าของกำหนด 2026-07-25:
// แนวนอน · รูปใหญ่ซ้าย (หน้าตรง) · กลาง 2 รูปซ้อน (ครึ่งตัว/ไลฟ์สไตล์) ·
// ขวา = กล่องข้อมูล + เต็มตัว · แถบ CTA ล่าง · ไม่มี QR / ไม่มีลิงก์

export const CARD_W = 1800;
export const CARD_H = 1272;
export const BOTTOM_BAR_H = 84;
// เส้นคั่นระหว่างรูปบาง (gap) — ให้เหมือน comp card ตัวอย่าง
const G = 12;

// กรอบรูปทั้ง 4 บนการ์ด (พิกัด canvas) — gap 12
export const FRAMES = {
  headshot: { x: G, y: G, w: 774, h: 1164 },
  half: { x: 798, y: G, w: 450, h: 576 },
  lifestyle: { x: 798, y: 600, w: 450, h: 576 },
  full: { x: 1260, y: 324, w: 528, h: 852 },
} as const;

export const INFO_BOX = { x: 1260, y: G, w: 528, h: 300 } as const;

// extra3/extra4 เลิกใช้แล้ว (ลดเหลือ 2 รูปเพิ่มเติม เพื่อประหยัดพื้นที่)
// — คงชนิดไว้เพื่ออ่านข้อมูลเก่าที่เคยอัพไว้ได้ แต่ไม่มีช่องให้อัพใหม่
export type SlotKey =
  | "headshot"
  | "half"
  | "lifestyle"
  | "full"
  | "extra1"
  | "extra2"
  | "extra3"
  | "extra4";

export type SlotDef = {
  key: SlotKey;
  labelTh: string;
  labelEn: string;
  required: boolean;
  // ขนาด export ตอน crop (อัตราส่วน = กรอบจริงบนการ์ด → WYSIWYG)
  outW: number;
  outH: number;
  hint: string;
};

export const SLOTS: SlotDef[] = [
  { key: "headshot", labelTh: "หน้าตรง", labelEn: "Headshot", required: true, outW: 1161, outH: 1746, hint: "เห็นใบหน้าชัด มองกล้อง" },
  { key: "half", labelTh: "ครึ่งตัว", labelEn: "Half Body", required: true, outW: 900, outH: 1152, hint: "เห็นตั้งแต่ศีรษะถึงเอว" },
  { key: "lifestyle", labelTh: "ไลฟ์สไตล์", labelEn: "Lifestyle", required: true, outW: 900, outH: 1152, hint: "ท่าธรรมชาติ สไตล์ของหนูเอง" },
  { key: "full", labelTh: "เต็มตัว", labelEn: "Full Body", required: true, outW: 792, outH: 1278, hint: "เห็นเต็มตัว ศีรษะถึงปลายเท้า" },
  { key: "extra1", labelTh: "เพิ่มเติม", labelEn: "Extra", required: false, outW: 900, outH: 1200, hint: "มุมอื่นๆ ที่อยากโชว์" },
  { key: "extra2", labelTh: "เพิ่มเติม", labelEn: "Extra", required: false, outW: 900, outH: 1200, hint: "มุมอื่นๆ ที่อยากโชว์" },
];

export const REQUIRED_SLOTS: SlotKey[] = ["headshot", "half", "lifestyle", "full"];

// สีกล่องข้อมูลตามเพศ (พี่เจ้าของเลือก): ชาย=ฟ้า หญิง=ชมพู อื่นๆ/ไม่ระบุ=CI
export function infoBoxColors(gender?: string | null): [string, string] {
  if (gender === "male") return ["#38BDF8", "#1D4ED8"];
  if (gender === "female") return ["#F472B6", "#DB2777"];
  return ["#1D4ED8", "#B82233"]; // gradient CI
}

// "Boy. 14 years." สไตล์การ์ดตัวอย่าง — เด็ก Boy/Girl, ผู้ใหญ่ Male/Female
export function genderAgeLabel(gender: string | null | undefined, age: number | null) {
  let g = "";
  if (gender === "male") g = age != null && age < 15 ? "Boy" : "Male";
  else if (gender === "female") g = age != null && age < 15 ? "Girl" : "Female";
  if (age == null) return g;
  return g ? `${g}. ${age} years.` : `${age} years.`;
}

// CTA ขอบล่าง (ร่างโดยผู้ช่วย — แก้ข้อความได้ที่นี่ที่เดียว)
export const COMPCARD_CTA = {
  brand: "GAMDANG AGENCY",
  tagline: "Modeling & Influencer Agency",
  contact: "Official LINE @gamdangmodeling · www.gamdangagency.com",
};

// โลโก้แก้มแดง (2 หน้าน้อง) — ต้องเป็น PNG พื้นหลังโปร่ง วางที่ public/
// ใช้เป็น icon หน้า CTA + ลายน้ำมุมขวาล่างของรูปหลัก/เต็มตัว
export const LOGO_SRC = "/gamdang-logo.png";
