"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ช่องเล็กๆ ในตาราง Photoshoot Overview (1 ช่อง = 1 คิวจอง)
//
// เดิมใช้ `title` โชว์ชื่อตอนเอาเมาส์ชี้ — ซึ่ง **จอสัมผัสไม่มีทางแสดงได้เลย**
// พี่เจ้าของใช้ iPad เป็นหลัก เลยไม่เคยเห็นชื่อ (แจ้ง 2026-09-20)
//
// ตอนนี้: แตะ/คลิกครั้งแรก → ป้ายชื่อเด้งขึ้นตรงช่องนั้น พร้อมปุ่มเปิดดูคิว
// แตะที่อื่นหรือกด Esc → ปิด · บนคอมยังเอาเมาส์ชี้เห็นชื่อได้เหมือนเดิม (title)
export function SlotSquare({
  href,
  label,
  sub,
  color,
}: {
  /** ลิงก์ไปเปิดคิวนี้ */
  href: string;
  /** ชื่อคนจอง */
  label: string;
  /** บรรทัดรอง เช่น "Package A · 09:00 น. · มาถึงแล้ว" */
  sub: string;
  /** สีช่องตามสถานะ */
  color: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLSpanElement>(null);

  // ปิดเมื่อแตะที่อื่น / กด Esc — ไม่งั้นป้ายค้างเต็มจอเวลาแตะหลายช่อง
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <span ref={boxRef} className="relative inline-flex">
      <button
        type="button"
        title={`${label} · ${sub}`}
        aria-label={`${label} · ${sub}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`size-6 rounded-sm transition ${color} ${
          open ? "ring-2 ring-[#1D4ED8] ring-offset-1" : ""
        }`}
      />
      {open && (
        // z สูงกว่าช่องอื่น + whitespace-nowrap กันชื่อยาวตกบรรทัดจนอ่านยาก
        <span className="absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-2 text-left text-xs text-white shadow-lg">
          <span className="block font-semibold">{label}</span>
          <span className="block text-[11px] text-white/70">{sub}</span>
          <Link
            href={href}
            className="mt-1.5 block rounded-md bg-white/15 px-2 py-1 text-center text-[11px] font-semibold text-white hover:bg-white/25"
          >
            เปิดดูคิวนี้ →
          </Link>
        </span>
      )}
    </span>
  );
}
