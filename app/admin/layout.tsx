import type { Metadata } from "next";

// layout บางๆ ครอบ /admin ทั้งหมด (ทั้งหน้า login และหน้าที่ต้องล็อกอิน)
// มีไว้เพื่อตั้งชื่อ/ไอคอนตอนบันทึกลงหน้าจอโฮมโดยเฉพาะ
//
// ทำไมต้องแยก: ถ้าใช้ชื่อเดียวกับเว็บสาธารณะ พอพี่เจ้าของบันทึกทั้งสองหน้า
// ไว้บน iPad ไอคอนจะชื่อ "GAMDANG" เหมือนกันทั้งคู่ แยกไม่ออกว่าอันไหน
// หลังบ้าน (แจ้ง 2026-09-19)
//
// ⚠️ ไม่ใส่ robots noindex ตรงนี้ — /admin เด้งไป /admin/login อยู่แล้ว
// และหน้า login ไม่มีข้อมูลอะไรให้ค้นเจอ
export const metadata: Metadata = {
  title: "GAMDANG Admin",
  appleWebApp: { title: "GAMDANG Admin", capable: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
