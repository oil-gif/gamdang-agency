"use client";

import { useEffect, useRef, useState } from "react";
import { searchTalents } from "@/actions/talents";

type Option = {
  id: string;
  code: string;
  nickname_th: string | null;
  nickname_en: string | null;
};

// ช่องค้นหา talent (แทน dropdown) — พิมพ์ชื่อ/code แล้วเลือกจากผลลัพธ์
// ค้นจาก server ครั้งละ 20 คน รองรับข้อมูลหลักหมื่นโดยไม่หน่วง
export function TalentCombobox({ inputName }: { inputName: string }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Option | null>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        setOptions(await searchTalents(query));
      } catch {
        setOptions([]);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, open]);

  const label = (o: Option) =>
    `${o.code} — ${o.nickname_en ?? o.nickname_th ?? "(ไม่มีชื่อ)"}`;

  if (selected) {
    return (
      <div className="flex h-9 items-center justify-between gap-2 rounded-md border border-[#1D4ED8]/40 bg-[#1D4ED8]/5 px-2 text-sm">
        <input type="hidden" name={inputName} value={selected.id} />
        <span className="truncate font-medium text-[#1D4ED8]">
          {label(selected)}
        </span>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setQuery("");
          }}
          className="shrink-0 text-neutral-400 hover:text-neutral-700"
          aria-label="เปลี่ยนคน"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        placeholder="พิมพ์ชื่อ / code เพื่อค้นหา..."
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm outline-none focus:border-[#1D4ED8]"
      />
      {open && options.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSelected(o);
                  setOpen(false);
                }}
                className="w-full truncate px-2.5 py-1.5 text-left text-sm hover:bg-[#1D4ED8]/5"
              >
                {label(o)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
