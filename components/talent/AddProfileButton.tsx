"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ปุ่ม "เพิ่มโปรไฟล์" ในหน้า /apply/profiles — ถ้าบัญชีนี้มีโปรไฟล์อยู่แล้ว
// จะเด้ง modal เตือนก่อน (กันเผลอสร้างซ้ำแทนที่จะกดแก้ของเดิม)
export function AddProfileButton({ existingNames }: { existingNames: string[] }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const hasProfiles = existingNames.length > 0;

  const cardClass =
    "flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#1D4ED8]/40 bg-white text-[#1D4ED8] transition hover:bg-[#1D4ED8]/5";

  return (
    <>
      <button
        type="button"
        onClick={() => (hasProfiles ? setConfirm(true) : router.push("/apply/edit"))}
        className={cardClass}
      >
        <span className="text-3xl">+</span>
        <span className="px-2 text-center text-sm font-medium">
          เพิ่มโปรไฟล์
          <span className="block text-xs font-normal text-neutral-400">
            (Add Profile)
          </span>
        </span>
      </button>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-neutral-800">
              คุณมีโปรไฟล์อยู่แล้วนะคะ 🙂
            </h3>
            <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-2.5 text-sm text-neutral-600">
              โปรไฟล์ที่สมัครไว้: <b>{existingNames.join(", ")}</b>
            </div>
            <ul className="mt-3 space-y-1.5 text-[13px] leading-5 text-neutral-600">
              <li>
                • ถ้าจะ<b>แก้ไขข้อมูล/เพิ่มรูป</b>ของคนเดิม → ปิดหน้านี้แล้ว
                <b>กดที่การ์ดโปรไฟล์เดิม</b>
              </li>
              <li>
                • เพิ่มโปรไฟล์ใหม่<b>เฉพาะเมื่อเป็นคนละคน</b> (เช่น ลูกอีกคน)
                ที่ยังไม่เคยสมัคร
              </li>
            </ul>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="flex-1 rounded-full border border-neutral-300 bg-white py-2.5 text-sm font-semibold text-neutral-600"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => router.push("/apply/edit")}
                className="flex-1 rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] py-2.5 text-sm font-bold text-white shadow-sm"
              >
                เพิ่มคนใหม่
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
