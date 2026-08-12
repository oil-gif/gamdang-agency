"use client";

import { useState } from "react";
import { setAwaitingCompcard } from "@/actions/talents";
import { AwaitingCompcard } from "@/components/compcard/AwaitingCompcard";
import { CompcardSlots } from "@/components/compcard/CompcardSlots";
import { LegacyCompcard } from "@/components/compcard/LegacyCompcard";

export type ModelPhotoMode = "new" | "legacy" | "awaiting";

// ขั้นรูปของ Model — เลือก 3 ทาง: สร้างคอมการ์ดใหม่ (8 ช่อง) ·
// อัพคอมการ์ดแก้มแดงเดิม (ช่วงเปลี่ยนถ่าย) · รอคอมการ์ดจากแก้มแดง (เพิ่งจองถ่าย)
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
  initialMode: ModelPhotoMode;
  legacyCode?: string | null;
  legacyPath?: string | null;
  legacySinglePath?: string | null;
}) {
  const [mode, setMode] = useState<ModelPhotoMode>(initialMode);

  function pick(next: ModelPhotoMode) {
    setMode(next);
    // ออกจากโหมด "รอคอมการ์ด" → เอาออกจากคิวหลังบ้าน (best-effort)
    if (mode === "awaiting" && next !== "awaiting") {
      void setAwaitingCompcard(talentId, false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ตัวเลือก 3 ทาง */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            {
              key: "new",
              emoji: "✨",
              title: "สร้างคอมการ์ดใหม่ (New comp card)",
              desc: "อัพรูป 4 มุม ระบบสร้างคอมการ์ดให้อัตโนมัติ (Upload 4 photos)",
            },
            {
              key: "legacy",
              emoji: "🪪",
              title: "มีคอมการ์ดแก้มแดงแล้ว (I have one)",
              desc: "อัพคอมการ์ดเดิมของแก้มแดง ทำภายใน 1 ปี (Gamdang card only)",
            },
            {
              key: "awaiting",
              emoji: "⏳",
              title: "รอคอมการ์ดจากแก้มแดง (Waiting for mine)",
              desc: "เพิ่งจองถ่ายโปรไฟล์ — อัพรูปหลัก 1 รูปพอ (1 photo only)",
            },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => pick(opt.key)}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              mode === opt.key
                ? "border-[#1D4ED8] bg-[#1D4ED8]/5 shadow-sm"
                : "border-neutral-200 bg-white hover:border-neutral-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{opt.emoji}</span>
              <span className="text-sm font-bold text-neutral-800">{opt.title}</span>
              <span
                className={`ml-auto flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
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

      {mode === "new" && (
        <CompcardSlots talentId={talentId} initialSlots={initialSlots} />
      )}
      {mode === "legacy" && (
        <LegacyCompcard
          talentId={talentId}
          initialCode={legacyCode}
          initialPath={legacyPath}
          initialSinglePath={legacySinglePath}
        />
      )}
      {mode === "awaiting" && (
        <AwaitingCompcard talentId={talentId} initialSinglePath={legacySinglePath} />
      )}
    </div>
  );
}
