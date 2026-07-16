"use client";

import { useEffect, useState } from "react";
import { applyToCasting } from "@/actions/casting-apply";

type Role = { id: string; title: string };

// ฟอร์มสมัคร + ปุ่มแชร์ FB/LINE — เชื่อม LINE อัตโนมัติถ้าเปิดในแอป LINE
export function CastingApply({
  projectId,
  roles,
  closed,
  shareUrl,
  shareTitle,
}: {
  projectId: string;
  roles: Role[];
  closed: boolean;
  shareUrl: string;
  shareTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [lineIdToken, setLineIdToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const liffId =
          process.env.NEXT_PUBLIC_BOOKING_LIFF_ID ||
          process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) return;
        const { default: liff } = await import("@line/liff");
        await liff.init({ liffId });
        if (liff.isInClient() && liff.isLoggedIn()) {
          const token = liff.getIDToken();
          if (token) setLineIdToken(token);
        }
      } catch {
        /* ไม่ได้อยู่ใน LINE — ข้าม */
      }
    })();
  }, []);

  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const lineShare = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="space-y-4">
      {/* ปุ่มแชร์ */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-neutral-500">แชร์งานนี้:</span>
        <a
          href={lineShare}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-white"
        >
          LINE
        </a>
        <a
          href={fbShare}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white"
        >
          Facebook
        </a>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600"
        >
          {copied ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}
        </button>
      </div>

      {closed ? (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-100 py-4 text-center font-semibold text-neutral-500">
          ปิดรับสมัครแล้ว (Casting Closed)
        </div>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95"
        >
          สมัครเข้าร่วมงานนี้ (Apply) ✦
        </button>
      ) : (
        <form
          action={applyToCasting}
          className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5"
        >
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="line_id_token" value={lineIdToken ?? ""} />
          <p className="text-sm font-semibold text-neutral-700">
            กรอกข้อมูลเพื่อสมัคร — ทีมงานจะติดต่อกลับ
          </p>

          {roles.length > 0 && (
            <div className="space-y-1">
              <label htmlFor="role_id" className="text-xs font-medium text-neutral-500">
                สมัคร Role
              </label>
              <select
                id="role_id"
                name="role_id"
                defaultValue=""
                className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm"
              >
                <option value="">— เลือก Role (ถ้ามี) —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(
            [
              ["nickname", "ชื่อเล่น (Nickname) *", "text", true, "เช่น Som"],
              ["phone", "เบอร์โทร (Phone) *", "tel", true, "08x-xxx-xxxx"],
              ["email", "อีเมล (Email)", "email", false, "example@email.com"],
              ["nationality", "สัญชาติ (Nationality)", "text", false, "เช่น Thai"],
            ] as const
          ).map(([name, label, type, required, ph]) => (
            <div key={name} className="space-y-1">
              <label htmlFor={name} className="text-xs font-medium text-neutral-500">
                {label}
              </label>
              <input
                id={name}
                name={name}
                type={type}
                required={required}
                placeholder={ph}
                className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="gender" className="text-xs font-medium text-neutral-500">
                เพศ (Gender)
              </label>
              <select
                id="gender"
                name="gender"
                defaultValue=""
                className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm"
              >
                <option value="">—</option>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="dob" className="text-xs font-medium text-neutral-500">
                วันเกิด (DOB)
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="note" className="text-xs font-medium text-neutral-500">
              ข้อความถึงทีมงาน (ถ้ามี)
            </label>
            <textarea
              id="note"
              name="note"
              rows={2}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          {lineIdToken && (
            <p className="rounded-lg bg-[#06C755]/10 px-3 py-2 text-xs font-medium text-[#06C755]">
              ✓ เชื่อมบัญชี LINE แล้ว — จัดการโปรไฟล์เองได้ภายหลัง
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] py-3 font-bold text-white shadow-sm transition hover:opacity-95"
          >
            ส่งใบสมัคร (Submit) ✦
          </button>
          <p className="text-center text-xs text-neutral-400">
            งานนี้: {shareTitle}
          </p>
        </form>
      )}
    </div>
  );
}
