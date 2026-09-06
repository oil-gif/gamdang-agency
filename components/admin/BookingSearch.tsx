"use client";

import { useState } from "react";

// ค้นหาการจองแบบกรองทันที (client-side) สำหรับเช็คอินหน้างาน — พิมพ์ชื่อ/
// ชื่อเล่น/เบอร์ แล้วซ่อนการ์ดที่ไม่ตรงทันที ไม่ต้องโหลดหน้าใหม่
// (การ์ดการจองแต่ละใบมี data-b-search = ข้อความค้นหา lowercase)
//
// ⚠️ ตั้งแต่คิวจองถูกแบ่งหน้า (รอบละ 20 คิว) การกรองทันทีเห็นแค่ "หน้าที่เปิดอยู่"
// เท่านั้น · คนที่ยืนรออยู่หน้างานอาจอยู่หน้า 3 → เลยทำเป็นฟอร์ม GET ด้วย
// กด Enter = ให้เซิร์ฟเวอร์ค้นทั้งรอบแล้วโชว์ครบทุกคนที่ตรง ไม่ว่าอยู่หน้าไหน
// พิมพ์เฉยๆ ยังกรองทันทีเหมือนเดิม (เร็วกว่า ถ้าคนที่หาอยู่ในหน้านี้)
export function BookingSearch({
  total,
  shownTotal,
  action,
  defaultValue = "",
}: {
  /** จำนวนคิวทั้งรอบ */
  total: number;
  /** จำนวนคิวที่แสดงอยู่ในหน้านี้ — ฐานของการกรองทันที */
  shownTotal?: number;
  /** URL ของหน้ารอบนี้ (ฟอร์ม GET ยิงกลับมาที่เดิมพร้อม ?bq=) */
  action?: string;
  defaultValue?: string;
}) {
  const base = shownTotal ?? total;
  const [q, setQ] = useState(defaultValue);
  const [shown, setShown] = useState(base);

  // ⚠️ ห้ามเรียก scrollIntoView ตอนพิมพ์
  // ของเดิมเลื่อนจอไปหาการ์ดใบแรกทุกครั้งที่กดคีย์ · พอการ์ดถูกซ่อน หน้าก็สั้นลง
  // เบราว์เซอร์เลื่อนตามอีกที → ช่องพิมพ์ "เด้ง" หนีนิ้วจนพิมพ์ยาก
  // (พี่เจ้าของแจ้ง 2026-09-06) · ตอนนี้แค่ซ่อน/โชว์การ์ด ไม่แตะตำแหน่งจอเลย
  // และช่องค้นหาถูกทำเป็น sticky ไว้ด้านบน เลื่อนดูผลได้โดยช่องไม่หายไปไหน
  function handle(value: string) {
    setQ(value);
    const needle = value.trim().toLowerCase();
    const cards = document.querySelectorAll<HTMLElement>("[data-b-search]");
    let count = 0;
    cards.forEach((c) => {
      const match = !needle || (c.dataset.bSearch ?? "").includes(needle);
      c.style.display = match ? "" : "none";
      if (match) count++;
    });
    setShown(count);
  }

  const paged = base < total;

  return (
    <form
      action={action}
      method="get"
      className="flex flex-wrap items-center gap-2"
    >
      <div className="relative min-w-64 flex-1">
        <input
          name="bq"
          value={q}
          onChange={(e) => handle(e.target.value)}
          placeholder="🔍 พิมพ์ชื่อ / ชื่อเล่น / เบอร์ เพื่อหาเร็วๆ ตอนเช็คอิน"
          className="h-11 w-full rounded-xl border border-neutral-300 pl-3 pr-9 text-sm outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
        />
        {q && (
          <button
            type="button"
            onClick={() => handle("")}
            aria-label="ล้าง"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
          >
            ✕
          </button>
        )}
      </div>
      {/* ปุ่มนี้โผล่เฉพาะตอนคิวถูกแบ่งหน้า — ไม่งั้นกรองทันทีก็ครบอยู่แล้ว */}
      {paged && (
        <button
          type="submit"
          className="h-11 shrink-0 rounded-xl bg-[#1D4ED8] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]/90"
        >
          ค้นทั้งรอบ ({total} คิว)
        </button>
      )}
      {q && (
        <span className="text-sm font-medium text-neutral-500">
          พบ {shown}/{base} รายการ{paged ? " ในหน้านี้" : ""}
        </span>
      )}
    </form>
  );
}
