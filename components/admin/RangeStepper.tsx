"use client";

import { useState } from "react";

// ชุดช่วงตัวเลข [ต่ำสุด] ถึง [สูงสุด] + หน่วย — เลื่อนตัวเลขได้ 2 แบบ
// ตามตัวอย่างระบบเดิม: กดลูกศร ▲▼ หรือชี้ที่ช่องแล้วหมุน scroll เมาส์
function StepperField({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  const step = (delta: number) =>
    setValue((s) => {
      const n = (parseInt(s || "0", 10) || 0) + delta;
      return String(Math.min(Math.max(n, 0), 999));
    });

  return (
    <div className="flex h-full min-w-0 flex-1 items-center">
      <input
        name={name}
        value={value}
        placeholder={placeholder}
        inputMode="numeric"
        onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
        onWheel={(e) => {
          // หมุน scroll บนช่องเพื่อเลื่อนตัวเลข (เฉพาะตอน focus อยู่ —
          // จะได้ไม่ไปแย่ง scroll ของหน้า)
          if (document.activeElement === e.currentTarget) {
            step(e.deltaY < 0 ? 1 : -1);
          }
        }}
        className="h-full w-full min-w-0 flex-1 bg-transparent px-1 text-center text-sm outline-none"
      />
      <div className="flex shrink-0 flex-col gap-px pr-1">
        <button
          type="button"
          tabIndex={-1}
          aria-label="เพิ่ม"
          onClick={() => step(1)}
          className="flex h-3.5 w-5 items-center justify-center rounded-sm bg-neutral-100 text-[8px] leading-none text-neutral-500 hover:bg-[#1D4ED8]/10 hover:text-[#1D4ED8]"
        >
          ▲
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="ลด"
          onClick={() => step(-1)}
          className="flex h-3.5 w-5 items-center justify-center rounded-sm bg-neutral-100 text-[8px] leading-none text-neutral-500 hover:bg-[#1D4ED8]/10 hover:text-[#1D4ED8]"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

export function RangeStepper({
  minName,
  maxName,
  minDefault,
  maxDefault,
  unit,
}: {
  minName: string;
  maxName: string;
  minDefault?: string;
  maxDefault?: string;
  unit: string;
}) {
  return (
    <div className="flex h-9 items-center overflow-hidden rounded-md border border-input bg-white shadow-xs focus-within:border-[#1D4ED8] focus-within:ring-2 focus-within:ring-[#1D4ED8]/20">
      <StepperField name={minName} defaultValue={minDefault} placeholder="ต่ำสุด" />
      <span className="shrink-0 select-none px-1 text-xs text-neutral-400">ถึง</span>
      <StepperField name={maxName} defaultValue={maxDefault} placeholder="สูงสุด" />
      <span className="shrink-0 select-none self-stretch border-l border-input bg-neutral-50 px-2.5 text-xs font-medium leading-9 text-neutral-500">
        {unit}
      </span>
    </div>
  );
}
