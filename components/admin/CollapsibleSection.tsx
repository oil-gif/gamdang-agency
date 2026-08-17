import type { ReactNode } from "react";

// กล่องพับได้สำหรับหน้าโปรเจกต์ — ของที่ตั้งค่าครั้งเดียว (Roles, ข้อมูลงาน,
// ประกาศ, ค้นหาคน, ส่งลูกค้า) ถูกพับไว้ ให้ "ทีมในงาน" ซึ่งเป็นงานประจำวัน
// อยู่ใกล้บนสุด · เป็น <details> ล้วนๆ ไม่ใช้ JS ทำงานได้แม้ hydration ยังไม่เสร็จ
//
// defaultOpen: ใช้กางอัตโนมัติตามบริบท เช่น มีใบสมัครรอตรวจ / บันทึกไม่ผ่าน /
// เพิ่งกด pagination ของ picker — ไม่งั้นผู้ใช้กดแล้วเหมือนไม่มีอะไรเกิดขึ้น
export function CollapsibleSection({
  id,
  icon,
  title,
  badge,
  hint,
  defaultOpen = false,
  children,
}: {
  id?: string;
  icon: string;
  title: string;
  badge?: string | number | null;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="group max-w-3xl scroll-mt-20 overflow-hidden rounded-xl border border-neutral-200 bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 hover:bg-neutral-50">
        <span className="text-base">{icon}</span>
        <span className="font-semibold text-[#1D4ED8]">{title}</span>
        {badge != null && badge !== "" && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-600">
            {badge}
          </span>
        )}
        <span className="flex-1" />
        {hint && (
          <span className="hidden text-xs text-neutral-400 sm:inline">{hint}</span>
        )}
        {/* ลูกศรหมุนตามสถานะเปิด/ปิด */}
        <span className="text-xs text-neutral-400 transition group-open:rotate-90">
          ▶
        </span>
      </summary>
      <div className="border-t border-neutral-100 p-4">{children}</div>
    </details>
  );
}
