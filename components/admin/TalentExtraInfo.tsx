"use client";

import { useState } from "react";
import { saveTalentExtraInfo } from "@/actions/projects";
import {
  DETAIL_PRESETS,
  type ExtraDetail,
} from "@/lib/extra-details";

// กล่อง "ข้อมูลเพิ่มเติมสำหรับลูกค้า" ในแถว talent ของหน้าโปรเจกต์ —
// แก้ได้ตรงจุดที่แอดมินทำงานอยู่ตอนคุยกับลูกค้า (ดู migration 022)
//  · ทักษะ → เก็บที่ตัวคน ใช้ได้ทุกงาน
//  · โน้ต + สวิตช์โชว์ social → เฉพาะงานนี้
// ทุกอย่างต้องติ๊ก "โชว์" เองถึงจะขึ้นในรายงานที่ส่งลูกค้า
export function TalentExtraInfo({
  ptId,
  projectId,
  talentId,
  talentName,
  details,
  note,
  noteShow,
  showSocials,
  socialCount,
}: {
  ptId: string;
  projectId: string;
  talentId: string;
  talentName: string;
  details: ExtraDetail[];
  note: string;
  noteShow: boolean;
  showSocials: boolean;
  socialCount: number;
}) {
  const [rows, setRows] = useState<ExtraDetail[]>(
    details.length > 0 ? details : [{ label: "", value: "", show: true }],
  );

  const shownCount = rows.filter((r) => r.show && r.label && r.value).length;
  const update = (i: number, patch: Partial<ExtraDetail>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <details className="rounded-lg border border-neutral-200 bg-neutral-50/60">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100">
        📋 ข้อมูลเพิ่มเติมสำหรับลูกค้า
        {shownCount > 0 && (
          <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            โชว์ {shownCount} รายการ
          </span>
        )}
        {noteShow && note && (
          <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            + โน้ต
          </span>
        )}
        {showSocials && (
          <span className="ml-1 rounded-full bg-[#1D4ED8]/10 px-2 py-0.5 text-[10px] font-bold text-[#1D4ED8]">
            + Social
          </span>
        )}
      </summary>

      <form action={saveTalentExtraInfo} className="space-y-3 border-t border-neutral-200 p-3">
        <input type="hidden" name="pt_id" value={ptId} />
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="talent_id" value={talentId} />

        {/* ===== ทักษะ (ติดกับคน) ===== */}
        <div>
          <p className="text-[11px] font-semibold text-neutral-500">
            ทักษะ/ข้อมูลของ {talentName}
            <span className="ml-1 font-normal text-neutral-400">
              — ติดกับคนนี้ ใช้ได้ทุกงาน
            </span>
          </p>
          <div className="mt-1.5 space-y-1.5">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  name="d_label"
                  value={r.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="หัวข้อ เช่น English Level"
                  className="h-8 w-40 rounded-md border border-neutral-300 px-2 text-xs"
                />
                <input
                  name="d_value"
                  value={r.value}
                  onChange={(e) => update(i, { value: e.target.value })}
                  placeholder="คำตอบ เช่น Advanced"
                  className="h-8 flex-1 rounded-md border border-neutral-300 px-2 text-xs"
                />
                <label
                  title="ติ๊กแล้วจะขึ้นในรายงานที่ส่งลูกค้า"
                  className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${
                    r.show
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-neutral-300 text-neutral-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="d_show"
                    value={String(i)}
                    checked={r.show}
                    onChange={(e) => update(i, { show: e.target.checked })}
                    className="size-3 accent-emerald-600"
                  />
                  โชว์
                </label>
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                  title="ลบแถวนี้"
                  className="shrink-0 px-1 text-sm text-neutral-400 hover:text-[#B82233]"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, { label: "", value: "", show: true }])}
              className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-white"
            >
              + เพิ่มแถว
            </button>
            <span className="text-[10px] text-neutral-400">หรือกดหัวข้อที่ใช้บ่อย:</span>
            {DETAIL_PRESETS.filter(
              (p) => !rows.some((r) => r.label === p.label),
            ).map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() =>
                  setRows((rs) => [
                    ...rs.filter((r) => r.label || r.value),
                    { label: p.label, value: p.values[0], show: true },
                  ])
                }
                className="rounded-full bg-[#1D4ED8]/10 px-2.5 py-1 text-[11px] font-medium text-[#1D4ED8] hover:bg-[#1D4ED8]/20"
              >
                + {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== โน้ตเฉพาะงานนี้ ===== */}
        <div className="border-t border-neutral-200 pt-2.5">
          <label
            htmlFor={`note-${ptId}`}
            className="text-[11px] font-semibold text-neutral-500"
          >
            โน้ตเฉพาะงานนี้
            <span className="ml-1 font-normal text-neutral-400">
              — เรื่องที่ลูกค้าถามเจาะจงงานนี้
            </span>
          </label>
          <textarea
            id={`note-${ptId}`}
            name="notes"
            rows={2}
            defaultValue={note}
            placeholder="เช่น ว่างวันที่ 13-15 ส.ค. · ตัดผมสั้นได้ · แพ้แมว"
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
          />
          <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-neutral-600">
            <input
              type="checkbox"
              name="notes_show"
              defaultChecked={noteShow}
              className="size-3.5 accent-emerald-600"
            />
            โชว์โน้ตนี้ในรายงานที่ส่งลูกค้า
          </label>
        </div>

        {/* ===== สวิตช์โชว์ social เฉพาะงานนี้ ===== */}
        <div className="border-t border-neutral-200 pt-2.5">
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-neutral-600">
            <input
              type="checkbox"
              name="show_socials"
              defaultChecked={showSocials}
              disabled={socialCount === 0}
              className="size-3.5 accent-[#1D4ED8]"
            />
            โชว์ช่องทาง Social + ผู้ติดตามในรายงาน (3 อันดับแรก)
            {socialCount === 0 ? (
              <span className="text-neutral-400">— คนนี้ยังไม่ได้กรอก social</span>
            ) : (
              <span className="text-neutral-400">— มี {socialCount} ช่องทาง</span>
            )}
          </label>
        </div>

        <button
          type="submit"
          className="rounded-full bg-[#1D4ED8] px-4 py-1.5 text-xs font-bold text-white hover:opacity-90"
        >
          บันทึกข้อมูลเพิ่มเติม
        </button>
      </form>
    </details>
  );
}
