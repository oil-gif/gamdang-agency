"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ช่องเล็กๆ ในตาราง Photoshoot Overview (1 ช่อง = 1 คิวจอง)
//
// เดิมใช้ `title` โชว์ชื่อตอนเอาเมาส์ชี้ — ซึ่ง **จอสัมผัสไม่มีทางแสดงได้เลย**
// พี่เจ้าของใช้ iPad เป็นหลัก เลยไม่เคยเห็นชื่อ (แจ้ง 2026-09-20)
// แตะ/คลิก → ป้ายชื่อเด้งขึ้น พร้อมปุ่มเปิดดูคิว · แตะที่อื่น/Esc → ปิด
//
// ⚠️ ป้ายต้องวาดนอก DOM ของตาราง (createPortal → body)
// กล่องตารางเป็น `overflow-x-auto` สำหรับเลื่อนแนวนอน ซึ่ง CSS บังคับให้แกนตั้ง
// ถูกตัดตามไปด้วย → ป้ายของแถวบนสุดโดนตัดหัวหายไปครึ่งหนึ่ง (พี่เจ้าของเจอ
// 2026-09-20) · ใช้ position: fixed คำนวณตำแหน่งจากช่องที่กด จึงไม่โดนตัด
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    below: boolean;
  } | null>(null);

  function toggle() {
    if (pos) {
      setPos(null);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    // ที่ว่างเหนือช่องไม่พอ (แถวบนสุด / เลื่อนมาชิดหัวจอ) → พลิกไปแสดงด้านล่าง
    const below = r.top < 150;
    // กันป้ายล้นขอบซ้าย/ขวาจอ
    const left = Math.min(Math.max(r.left + r.width / 2, 110), window.innerWidth - 110);
    setPos({ top: below ? r.bottom + 8 : r.top - 8, left, below });
  }

  useEffect(() => {
    if (!pos) return;
    const away = (e: Event) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || tipRef.current?.contains(t)) return;
      setPos(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPos(null);
    };
    // ป้ายเป็น fixed — ถ้าเลื่อนหน้าแล้วไม่ปิด มันจะลอยค้างผิดที่
    const close = () => setPos(null);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={`${label} · ${sub}`}
        aria-label={`${label} · ${sub}`}
        aria-expanded={!!pos}
        onClick={toggle}
        className={`size-6 rounded-sm transition ${color} ${
          pos ? "ring-2 ring-[#1D4ED8] ring-offset-1" : ""
        }`}
      />
      {pos &&
        createPortal(
          <div
            ref={tipRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform: pos.below
                ? "translate(-50%, 0)"
                : "translate(-50%, -100%)",
            }}
            className="z-50 w-max max-w-[min(18rem,90vw)] rounded-lg bg-neutral-900 px-3 py-2 text-left text-xs text-white shadow-xl"
          >
            <span className="block font-semibold">{label}</span>
            <span className="block text-[11px] text-white/70">{sub}</span>
            <Link
              href={href}
              className="mt-1.5 block rounded-md bg-white/15 px-2 py-1 text-center text-[11px] font-semibold text-white hover:bg-white/25"
            >
              เปิดดูคิวนี้ →
            </Link>
          </div>,
          document.body,
        )}
    </>
  );
}
