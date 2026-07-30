"use client";

import { useRef, useState } from "react";
import { CropperModal } from "@/components/compcard/CropperModal";
import { REQUIRED_SLOTS, SLOTS, type SlotDef } from "@/lib/compcard";

// Comp Card Studio — ขั้นอัพโหลดรูป: กติการูป (ฉบับแก้มแดง) → ติ๊กยอมรับ →
// อัพ 8 ช่อง (บังคับ 4: หน้าตรง/ครึ่งตัว/ไลฟ์สไตล์/เต็มตัว) พร้อมปรับรูปในกรอบ
export function CompcardSlots({
  talentId,
  initialSlots,
  onChange,
}: {
  talentId: string;
  initialSlots: Record<string, string>;
  onChange?: (slots: Record<string, string>) => void;
}) {
  // เคยอัพรูปไว้แล้ว = เคยยอมรับกติกาแล้ว ไม่ต้องติ๊กใหม่
  const [accepted, setAccepted] = useState(
    Object.keys(initialSlots ?? {}).length > 0,
  );
  const [slots, setSlots] = useState<Record<string, string>>(initialSlots ?? {});
  const [cropping, setCropping] = useState<{ def: SlotDef; file: File } | null>(null);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef<SlotDef | null>(null);

  const requiredDone = REQUIRED_SLOTS.filter((k) => slots[k]).length;

  function pickFile(def: SlotDef) {
    pendingSlot.current = def;
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const def = pendingSlot.current;
    if (file && def) setCropping({ def, file });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onCropped(blob: Blob) {
    const def = cropping!.def;
    setCropping(null);
    setBusySlot(def.key);
    setError(null);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(blob);
      });
      const res = await fetch("/api/slot-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talent_id: talentId, slot: def.key, data: dataUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "อัพโหลดไม่สำเร็จ");
      const next = { ...slots, [def.key]: body.path as string };
      setSlots(next);
      onChange?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัพโหลดไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusySlot(null);
    }
  }

  function SlotBox({ def, big }: { def: SlotDef; big?: boolean }) {
    const path = slots[def.key];
    const aspect = `${def.outW}/${def.outH}`;
    return (
      <div className={big ? "" : "w-full"}>
        <p className="mb-1 text-xs font-semibold text-neutral-600">
          {def.labelTh} ({def.labelEn}){def.required && <span className="text-[#B82233]"> *</span>}
        </p>
        <button
          type="button"
          disabled={!accepted || busySlot !== null}
          onClick={() => pickFile(def)}
          style={{ aspectRatio: aspect }}
          className={`relative w-full overflow-hidden rounded-xl border-2 transition ${
            path
              ? "border-transparent ring-1 ring-neutral-200"
              : "border-dashed border-[#1D4ED8]/35 bg-[#1D4ED8]/[0.03] hover:bg-[#1D4ED8]/[0.07]"
          } ${!accepted ? "cursor-not-allowed opacity-50" : ""}`}
        >
          {path ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/photo/${path}?w=320`}
                alt={def.labelTh}
                className="size-full object-cover"
              />
              <span className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow">
                ✓
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1 text-center text-[11px] font-medium text-white">
                แตะเพื่อเปลี่ยน / ปรับใหม่
              </span>
            </>
          ) : (
            <span className="flex size-full flex-col items-center justify-center gap-1.5 p-2 text-center">
              <svg viewBox="0 0 24 24" className="size-7 text-[#1D4ED8]/60" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 8a2 2 0 0 1 2-2h1.6l1.2-1.8A1 1 0 0 1 8.6 4h6.8a1 1 0 0 1 .8.4L17.4 6H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12.5" r="3.2" />
              </svg>
              <span className="text-[11px] leading-4 text-neutral-400">{def.hint}</span>
            </span>
          )}
          {busySlot === def.key && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold text-[#1D4ED8]">
              กำลังอัพโหลด...
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ===== กติการูปถ่าย ฉบับแก้มแดง ===== */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-5 py-4 text-white">
          <p className="text-base font-bold">📸 กติการูปถ่าย ฉบับแก้มแดง</p>
          <p className="mt-0.5 text-xs text-white/80">
            รูปดีมีชัยไปกว่าครึ่ง — ลูกค้าเลือกงานจาก &quot;รูป&quot; เป็นอย่างแรก
          </p>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-gradient-to-r from-[#1D4ED8]/10 to-[#B82233]/10 px-4 py-3 text-sm font-semibold text-neutral-800">
            ใช้รูปจริง ถ่ายล่าสุด — หน้าตา ทรงผม ต้องตรงกับตัวจริงวันนี้
            เพราะถ้าไปหน้างานแล้วไม่เหมือนรูป งานอาจถูกยกเลิกทันที
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#1D4ED8]/20 bg-[#1D4ED8]/[0.04] p-4">
              <p className="text-sm font-bold text-[#1D4ED8]">✓ รูปแบบนี้ = ผ่าน</p>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-5 text-neutral-600">
                <li>• ถ่ายใหม่ไม่เกิน 6 เดือน (ฉากหลังไม่รก)</li>
                <li>• แสงสว่าง หน้าชัด มองกล้อง</li>
                <li>• เห็นหน้าเต็มๆ ไม่มีผม/มือ/หมวกบัง</li>
                <li>• เสื้อผ้าเรียบง่าย ดูสุภาพ</li>
                <li>• ในรูปมีคนเดียว</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#B82233]/20 bg-[#B82233]/[0.04] p-4">
              <p className="text-sm font-bold text-[#B82233]">✕ แบบนี้ = ไม่รับ</p>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-5 text-neutral-600">
                <li>• รูป AI / ตัดต่อ / ฟิลเตอร์ปรับหน้า</li>
                <li>• รีทัชหนักจนผิวไม่เหมือนจริง</li>
                <li>• แว่นกันแดด หมวก ผ้าคลุมผม</li>
                <li>• รูปมืด เบลอ เซลฟี่มุมแปลก</li>
                <li>• รูปเก่าที่หน้าตาไม่ตรงปัจจุบัน</li>
              </ul>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-medium transition has-[:checked]:border-[#1D4ED8] has-[:checked]:bg-[#1D4ED8]/5 border-neutral-200">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 size-4 accent-[#1D4ED8]"
            />
            <span>
              อ่านกติกาแล้ว และยืนยันว่ารูปที่จะอัพโหลดเป็น
              <b>รูปจริงล่าสุด ไม่ผ่านการตกแต่งเกินจริง</b>
            </span>
          </label>
        </div>
      </div>

      {/* ===== ช่องรูป ===== */}
      <div className={accepted ? "" : "pointer-events-none select-none opacity-60"}>
        <p className="text-sm font-semibold text-neutral-700">
          รูปทำ Comp Card — บังคับ 4 รูป{" "}
          <span
            className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
              requiredDone === 4
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {requiredDone}/4
          </span>
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {SLOTS.filter((s) => s.required).map((def) => (
            <SlotBox key={def.key} def={def} />
          ))}
        </div>

        <p className="mt-5 text-sm font-semibold text-neutral-700">
          รูปเพิ่มเติม (ไม่บังคับ สูงสุด 2 รูป)
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {SLOTS.filter((s) => !s.required).map((def) => (
            <SlotBox key={def.key} def={def} />
          ))}
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

      {cropping && (
        <CropperModal
          file={cropping.file}
          title={`${cropping.def.labelTh} (${cropping.def.labelEn})`}
          outW={cropping.def.outW}
          outH={cropping.def.outH}
          onDone={onCropped}
          onCancel={() => setCropping(null)}
        />
      )}
    </div>
  );
}
