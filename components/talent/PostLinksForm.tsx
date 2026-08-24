"use client";

import { useState } from "react";
import {
  PLATFORMS,
  detectPlatform,
  type PlatformKey,
  type SubmissionPost,
} from "@/lib/social-posts";

type Row = {
  platform: PlatformKey;
  url: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  saves: string;
};

const emptyRow = (): Row => ({
  platform: "tiktok",
  url: "",
  views: "",
  likes: "",
  comments: "",
  shares: "",
  saves: "",
});

const s = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

// ฟอร์มส่งงานของ Influencer — 1 แถว = 1 โพสต์ (ช่องทาง + ลิงก์ + ยอด)
//
// ⚠️ นี่คือ "งานที่โพสต์ให้แคมเปญนี้" ไม่ใช่ผลงานเก่าในโปรไฟล์
// ของเดิมเป็นช่องลิงก์ลอยๆ 5 ช่อง แล้วเผลอเอา portfolio_links มาเติมให้
// ทำให้ปนกันจนแยกไม่ออกว่าอันไหนคืองานจริง (พี่เจ้าของแจ้ง 2026-08-24)
export function PostLinksForm({ initial }: { initial: SubmissionPost[] }) {
  const [rows, setRows] = useState<Row[]>(
    initial.length > 0
      ? initial.map((p) => ({
          platform: p.platform,
          url: p.url,
          views: s(p.views),
          likes: s(p.likes),
          comments: s(p.comments),
          shares: s(p.shares),
          saves: s(p.saves),
        }))
      : [emptyRow()],
  );

  const set = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {rows.map((r, i) => {
        const meta = PLATFORMS.find((p) => p.key === r.platform)!;
        const isYoutube = r.platform === "youtube";
        return (
          <div
            key={i}
            className="space-y-2 rounded-xl border-2 p-3"
            style={{ borderColor: meta.color + "40" }}
          >
            <div className="flex items-center gap-2">
              <select
                name={`post_platform_${i}`}
                value={r.platform}
                onChange={(e) => set(i, { platform: e.target.value as PlatformKey })}
                className="h-10 rounded-lg border border-neutral-300 bg-white px-2 text-sm font-semibold"
                style={{ color: meta.color }}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <span className="flex-1" />
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                  className="px-2 text-sm text-neutral-400 hover:text-[#B82233]"
                  title="ลบโพสต์นี้"
                >
                  ✕
                </button>
              )}
            </div>

            <input
              name={`post_url_${i}`}
              type="url"
              inputMode="url"
              required={i === 0}
              value={r.url}
              // วางลิงก์แล้วเดาช่องทางให้เลย ไม่ต้องเลือกเอง
              onChange={(e) => {
                const url = e.target.value;
                set(i, url.trim() ? { url, platform: detectPlatform(url) } : { url });
              }}
              placeholder={meta.hint}
              className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm"
            />

            <div>
              <p className="text-[11px] font-medium text-neutral-500">
                ยอด ณ วันที่ส่งงาน (ไม่บังคับ — ใส่เท่าที่มี)
                {isYoutube && (
                  <span className="ml-1 text-emerald-600">
                    · YouTube ระบบดึงให้อัตโนมัติ
                  </span>
                )}
              </p>
              <div className="mt-1 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                {(
                  [
                    ["views", "วิว"],
                    ["likes", "ไลก์"],
                    ["comments", "คอมเมนต์"],
                    ["shares", "แชร์"],
                    ["saves", "เซฟ"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label className="text-[10px] text-neutral-400">{label}</label>
                    <input
                      name={`post_${field}_${i}`}
                      type="text"
                      inputMode="numeric"
                      value={r[field]}
                      onChange={(e) => set(i, { [field]: e.target.value } as Partial<Row>)}
                      placeholder="—"
                      className="h-9 w-full rounded-md border border-neutral-300 px-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, emptyRow()])}
        className="w-full rounded-xl border-2 border-dashed border-neutral-300 py-2.5 text-sm font-medium text-neutral-500 hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
      >
        + เพิ่มโพสต์อีกช่องทาง
      </button>
    </div>
  );
}
