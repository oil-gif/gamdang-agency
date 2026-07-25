"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelProfileDeletion,
  requestProfileDeletion,
} from "@/actions/talents";

// การ์ดโปรไฟล์ในหน้า /apply/profiles — คลิกการ์ดเพื่อแก้ไข +
// ปุ่มขอลบประวัติ (มี modal ยืนยัน) · ถ้าขอลบแล้วโชว์สถานะรอแอดมินอนุมัติ
export function ProfileCard({
  id,
  name,
  code,
  statusLabel,
  statusClassName,
  photoUrl,
  deletionRequested,
}: {
  id: string;
  name: string;
  code: string | null;
  statusLabel: string;
  statusClassName: string;
  photoUrl: string | null;
  deletionRequested: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doRequest() {
    setBusy(true);
    setError(null);
    const res = await requestProfileDeletion(id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    setConfirm(false);
    router.refresh();
  }

  async function doCancel() {
    setBusy(true);
    await cancelProfileDeletion(id);
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <div
        className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
          deletionRequested
            ? "border-rose-200"
            : "border-neutral-200 hover:-translate-y-0.5 hover:border-[#1D4ED8]/40 hover:shadow-md"
        }`}
      >
        {/* คลิกที่รูป/ชื่อ = ไปหน้าแก้ไข */}
        <button
          type="button"
          onClick={() => router.push(`/apply/edit?id=${id}`)}
          className="block w-full text-left"
        >
          <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className={`size-full object-cover object-top ${deletionRequested ? "opacity-50 grayscale" : ""}`}
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-neutral-400">
                ยังไม่มีรูป
              </div>
            )}
            <span
              className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClassName}`}
            >
              {statusLabel}
            </span>
            {deletionRequested && (
              <span className="absolute inset-x-0 bottom-0 bg-rose-600/85 py-1 text-center text-[11px] font-semibold text-white">
                ⏳ รอแอดมินลบ
              </span>
            )}
          </div>
          <div className="p-2.5">
            <p className="truncate text-sm font-semibold text-neutral-800">{name}</p>
            <p className="font-mono text-[10px] text-neutral-400">{code}</p>
          </div>
        </button>

        {/* มุมขวาบน: ขอลบ / ยกเลิกคำขอ */}
        {deletionRequested ? (
          <button
            type="button"
            disabled={busy}
            onClick={doCancel}
            className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 shadow ring-1 ring-neutral-200 hover:text-[#1D4ED8]"
          >
            ยกเลิกคำขอ
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            title="ขอลบประวัติ"
            className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-white/90 text-neutral-400 shadow ring-1 ring-neutral-200 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Modal ยืนยันขอลบ */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-rose-100 text-lg">
                🗑️
              </span>
              <h3 className="text-base font-bold text-neutral-800">
                ขอลบประวัติ &quot;{name}&quot;?
              </h3>
            </div>
            <div className="mt-3 space-y-2 text-sm leading-5 text-neutral-600">
              <p>
                คำขอจะถูกส่งให้ทีมงานแก้มแดงตรวจสอบและลบให้{" "}
                <b>โปรไฟล์จะถูกซ่อนจากหน้าสาธารณะทันที</b>
              </p>
              <p className="text-xs text-neutral-400">
                ยังยกเลิกคำขอได้จนกว่าแอดมินจะลบถาวร · เมื่อลบแล้วข้อมูลจะถูกลบออกจากระบบ
                กู้คืนไม่ได้
              </p>
            </div>
            {error && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirm(false);
                  setError(null);
                }}
                className="flex-1 rounded-full border border-neutral-300 bg-white py-2.5 text-sm font-semibold text-neutral-600"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={doRequest}
                className="flex-1 rounded-full bg-rose-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                {busy ? "กำลังส่ง..." : "ยืนยันขอลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
