"use client";

import { useRef, useState } from "react";
import { CropperModal } from "@/components/compcard/CropperModal";

// อัพรูปหลักรูปเดียว (crop แนวตั้ง 3:4) — ใช้เป็นรูปการ์ดโชว์หน้าบ้าน
// ทั้งกรณี Influencer ล้วน และกรณี Model ที่มีคอมการ์ดแก้มแดงเดิม
export function SinglePhotoUpload({
  talentId,
  initialPath,
  onChange,
  heading = "📸 รูปโปรไฟล์ Influencer",
  subheading = "อัพแค่รูปเดียวพอ — เลือกรูปที่หน้าชัด สวย เป็นตัวคุณที่สุด",
  note = "รูปจริงล่าสุด หน้าชัด ไม่ผ่านฟิลเตอร์ปรับหน้า — ทีมงานใช้เสนอลูกค้า",
}: {
  talentId: string;
  initialPath?: string | null;
  onChange?: (path: string) => void;
  heading?: string;
  subheading?: string;
  note?: string;
}) {
  const [path, setPath] = useState<string | null>(initialPath ?? null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCropFile(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onCropped(blob: Blob) {
    setCropFile(null);
    setBusy(true);
    setError(null);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(blob);
      });
      const res = await fetch("/api/single-photo", {
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
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-5 py-4 text-white">
          <p className="text-base font-bold">{heading}</p>
          <p className="mt-0.5 text-xs text-white/80">{subheading}</p>
        </div>
        <div className="p-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            style={{ aspectRatio: "3/4" }}
            className={`relative mx-auto block w-full max-w-64 overflow-hidden rounded-xl border-2 transition ${
              path
                ? "border-transparent ring-1 ring-neutral-200"
                : "border-dashed border-[#1D4ED8]/35 bg-[#1D4ED8]/[0.03] hover:bg-[#1D4ED8]/[0.07]"
            }`}
          >
            {path ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/photo/${path}?w=320`}
                  alt="รูปโปรไฟล์"
                  className="size-full object-cover"
                />
                <span className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow">
                  ✓
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1.5 text-center text-xs font-medium text-white">
                  แตะเพื่อเปลี่ยน / ปรับใหม่
                </span>
              </>
            ) : (
              <span className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center">
                <svg viewBox="0 0 24 24" className="size-9 text-[#1D4ED8]/60" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 8a2 2 0 0 1 2-2h1.6l1.2-1.8A1 1 0 0 1 8.6 4h6.8a1 1 0 0 1 .8.4L17.4 6H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12.5" r="3.2" />
                </svg>
                <span className="text-xs leading-4 text-neutral-400">
                  แตะเพื่อเลือกรูป แล้วปรับให้อยู่ในกรอบ
                </span>
              </span>
            )}
            {busy && (
              <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold text-[#1D4ED8]">
                กำลังอัพโหลด...
              </span>
            )}
          </button>
          <p className="mt-3 text-center text-xs text-neutral-400">{note}</p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
      />

      {cropFile && (
        <CropperModal
          file={cropFile}
          title="รูปโปรไฟล์ (Profile Photo)"
          outW={1200}
          outH={1600}
          onDone={onCropped}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
