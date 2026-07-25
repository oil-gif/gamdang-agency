"use client";

import { useState } from "react";
import { CompcardSlots } from "@/components/compcard/CompcardSlots";
import { LegacyCompcard } from "@/components/compcard/LegacyCompcard";

// ขั้นรูปของ Model — เลือก 2 ทาง: สร้างคอมการ์ดใหม่ (8 ช่อง) หรือ
// อัพคอมการ์ดแก้มแดงเดิม (ช่วงเปลี่ยนถ่ายจากระบบเก่า)
export function ModelPhotoStep({
  talentId,
  initialSlots,
  initialMode,
  legacyCode,
  legacyPath,
  legacySinglePath,
}: {
  talentId: string;
  initialSlots: Record<string, string>;
  initialMode: "new" | "legacy";
  legacyCode?: string | null;
  legacyPath?: string | null;
  legacySinglePath?: string | null;
}) {
  const [mode, setMode] = useState<"new" | "legacy">(initialMode);

  return (
    <div className="space-y-5">
      {/* ตัวเลือก 2 ทาง */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(
          [
            {
              key: "new",
              emoji: "✨",
              title: "สร้างคอมการ์ดใหม่",
              desc: "อัพรูป 4 มุม ระบบสร้างคอมการ์ดให้อัตโนมัติ",
            },
            {
              key: "legacy",
              emoji: "🪪",
              title: "มีคอมการ์ดแก้มแดงแล้ว",
              desc: "อัพคอมการ์ดเดิมของแก้มแดง (ทำภายใน 1 ปี)",
            },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setMode(opt.key)}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              mode === opt.key
                ? "border-[#1D4ED8] bg-[#1D4ED8]/5 shadow-sm"
                : "border-neutral-200 bg-white hover:border-neutral-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{opt.emoji}</span>
              <span className="font-bold text-neutral-800">{opt.title}</span>
              <span
                className={`ml-auto flex size-5 items-center justify-center rounded-full border-2 ${
                  mode === opt.key
                    ? "border-[#1D4ED8] bg-[#1D4ED8] text-white"
                    : "border-neutral-300"
                }`}
              >
                {mode === opt.key && (
                  <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3.5">
                    <path d="M5 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </div>
            <p className="mt-1 text-xs leading-4 text-neutral-500">{opt.desc}</p>
          </button>
        ))}
      </div>

      {mode === "new" ? (
        <CompcardSlots talentId={talentId} initialSlots={initialSlots} />
      ) : (
        <LegacyCompcard
          talentId={talentId}
          initialCode={legacyCode}
          initialPath={legacyPath}
          initialSinglePath={legacySinglePath}
        />
      )}
    </div>
  );
}
