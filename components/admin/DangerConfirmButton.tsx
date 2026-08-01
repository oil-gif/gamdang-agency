"use client";

import { useState } from "react";

// ปุ่มสำหรับการกระทำที่กู้คืนไม่ได้ — กดแล้วเปิด modal ให้กรอกรหัสยืนยัน
// (ชั้นที่ 2) ก่อนส่งฟอร์มจริง · กันแอดมินเผลอกดลบ
export function DangerConfirmButton({
  action,
  hiddenFields,
  label,
  title,
  description,
  confirmLabel = "ยืนยันลบถาวร",
  needsCode,
  fallbackPhrase,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (formData: FormData) => any;
  hiddenFields: Record<string, string>;
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  /** true = ตั้ง ADMIN_DANGER_CODE แล้ว (ขอรหัสลับ) · false = ขอพิมพ์คำยืนยัน */
  needsCode: boolean;
  fallbackPhrase: string;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const ok = needsCode ? code.trim().length > 0 : code.trim() === fallbackPhrase;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xl">
                ⚠️
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-neutral-800">{title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-neutral-600">
                  {description}
                </p>
              </div>
            </div>

            <form action={action} className="mt-4 space-y-3">
              {Object.entries(hiddenFields).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <div className="space-y-1.5">
                <label
                  htmlFor="danger_code"
                  className="text-sm font-semibold text-neutral-700"
                >
                  {needsCode ? (
                    <>รหัสยืนยันการลบ (ถามเจ้าของระบบ)</>
                  ) : (
                    <>
                      พิมพ์คำว่า{" "}
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-rose-600">
                        {fallbackPhrase}
                      </span>{" "}
                      เพื่อยืนยัน
                    </>
                  )}
                </label>
                <input
                  id="danger_code"
                  name="danger_code"
                  type={needsCode ? "password" : "text"}
                  autoComplete="off"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={needsCode ? "••••••" : fallbackPhrase}
                  className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setCode("");
                  }}
                  className="flex-1 rounded-full border border-neutral-300 bg-white py-2.5 text-sm font-semibold text-neutral-600"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!ok}
                  className="flex-1 rounded-full bg-rose-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-40"
                >
                  {confirmLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
