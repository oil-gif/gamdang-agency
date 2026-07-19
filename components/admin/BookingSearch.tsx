"use client";

import { useState } from "react";

// ค้นหาการจองแบบกรองทันที (client-side) สำหรับเช็คอินหน้างาน — พิมพ์ชื่อ/
// ชื่อเล่น/เบอร์ แล้วซ่อนการ์ดที่ไม่ตรงทันที ไม่ต้องโหลดหน้าใหม่
// (การ์ดการจองแต่ละใบมี data-b-search = ข้อความค้นหา lowercase)
export function BookingSearch({ total }: { total: number }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(total);

  function handle(value: string) {
    setQ(value);
    const needle = value.trim().toLowerCase();
    const cards = document.querySelectorAll<HTMLElement>("[data-b-search]");
    let count = 0;
    let firstMatch: HTMLElement | null = null;
    cards.forEach((c) => {
      const match = !needle || (c.dataset.bSearch ?? "").includes(needle);
      c.style.display = match ? "" : "none";
      if (match) {
        count++;
        if (!firstMatch) firstMatch = c;
      }
    });
    setShown(count);
    // ช่องค้นหาอยู่บนสุด — เลื่อนให้เห็นการ์ดคนที่หาเจอ เช็คอินได้เลย
    if (needle && firstMatch) {
      (firstMatch as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-64 flex-1">
        <input
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
      {q && (
        <span className="text-sm font-medium text-neutral-500">
          พบ {shown}/{total} รายการ
        </span>
      )}
    </div>
  );
}
