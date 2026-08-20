"use client";

import { UploadError } from "@/components/talent/UploadError";

import { useRef, useState } from "react";
import { saveLegacyCompcardCode } from "@/actions/talents";
import { SinglePhotoUpload } from "@/components/compcard/SinglePhotoUpload";

// Model ที่มี "คอมการ์ดแก้มแดงเดิม" (ทำภายใน 1 ปี) — กรอกรหัสแก้มแดงเก่า +
// อัพรูปหลัก 1 รูป (ใช้เป็นการ์ดโชว์หน้าบ้าน) + อัพรูปคอมการ์ดเดิม
// (เก็บไว้เสนอลูกค้า ไม่เอาไปโชว์ในแกลเลอรีสาธารณะ)
export function LegacyCompcard({
  talentId,
  initialCode,
  initialPath,
  initialSinglePath,
  onChange,
}: {
  talentId: string;
  initialCode?: string | null;
  initialPath?: string | null;
  initialSinglePath?: string | null;
  onChange?: (path: string) => void;
}) {
  const [code, setCode] = useState(initialCode ?? "");
  const [path, setPath] = useState<string | null>(initialPath ?? null);
  const [busy, setBusy] = useState(false);
  const [savedCode, setSavedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveCode() {
    setSavedCode(false);
    const res = await saveLegacyCompcardCode(talentId, code);
    if (res.ok) setSavedCode(true);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/compcard-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talent_id: talentId, data: dataUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "อัพโหลดไม่สำเร็จ");
      setPath(body.path as string);
      onChange?.(body.path as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัพโหลดไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-[#B82233]/25 bg-[#B82233]/[0.04] px-4 py-3 text-sm leading-5 text-neutral-700">
        ⚠️ <b>เฉพาะคอมการ์ดของแก้มแดงเท่านั้น</b> — ที่ทำไว้กับแก้มแดงภายใน 1 ปี
        (มีโลโก้/รหัสแก้มแดงบนการ์ด) · ถ้าเป็นคอมการ์ดจากที่อื่น หรือเกิน 1 ปี
        กรุณาเลือก &quot;สร้างคอมการ์ดใหม่&quot; แทนค่ะ
      </div>

      {/* รูปหลัก 1 รูป — ใช้เป็นการ์ดโชว์หน้าบ้าน (ไม่เอาคอมการ์ดไปโชว์) */}
      <SinglePhotoUpload
        talentId={talentId}
        initialPath={initialSinglePath}
        heading="🖼️ รูปหลักสำหรับการ์ด (Main Photo) *"
        subheading="รูปเดี่ยว 1 รูป — ใช้โชว์เป็นการ์ดหน้าเว็บ (แทนการโชว์คอมการ์ด)"
        note="เลือกรูปหน้าชัด สวย เป็นตัวคุณที่สุด — ระบบใช้รูปนี้เป็นการ์ดสาธารณะ"
      />

      <div className="space-y-1.5">
        <label htmlFor="legacy_code" className="text-sm font-semibold text-neutral-700">
          รหัสแก้มแดงเดิม (Gamdang Code) *
        </label>
        <input
          id="legacy_code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onBlur={saveCode}
          placeholder="เช่น FF979D"
          className="h-11 w-full rounded-xl border border-neutral-300 px-3 font-mono text-sm uppercase outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
        />
        <p className="text-xs text-neutral-400">
          กรอกรหัสที่อยู่บนคอมการ์ดเดิม — ทีมงานจะตรวจและโอนรหัสให้
          {savedCode && <span className="ml-1 font-medium text-emerald-600">✓ บันทึกรหัสแล้ว</span>}
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-neutral-700">
          อัพโหลดรูปคอมการ์ดเดิม (Upload Comp Card) *
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          style={{ aspectRatio: "1800/1272" }}
          className={`relative w-full overflow-hidden rounded-xl border-2 transition ${
            path
              ? "border-transparent ring-1 ring-neutral-200"
              : "border-dashed border-[#1D4ED8]/35 bg-[#1D4ED8]/[0.03] hover:bg-[#1D4ED8]/[0.07]"
          }`}
        >
          {path ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/photo/${path}?w=640`}
                alt="คอมการ์ดเดิม"
                className="size-full object-contain bg-neutral-50"
              />
              <span className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow">
                ✓
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1.5 text-center text-xs font-medium text-white">
                แตะเพื่อเปลี่ยนรูป
              </span>
            </>
          ) : (
            <span className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center">
              <svg viewBox="0 0 24 24" className="size-8 text-[#1D4ED8]/60" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 8a2 2 0 0 1 2-2h1.6l1.2-1.8A1 1 0 0 1 8.6 4h6.8a1 1 0 0 1 .8.4L17.4 6H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12.5" r="3.2" />
              </svg>
              <span className="text-xs leading-4 text-neutral-400">
                แตะเพื่อเลือกรูปคอมการ์ดแก้มแดงเดิม (ทั้งใบ)
              </span>
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold text-[#1D4ED8]">
              กำลังอัพโหลด...
            </span>
          )}
        </button>
      </div>

      <UploadError message={error} />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
      />
    </div>
  );
}
