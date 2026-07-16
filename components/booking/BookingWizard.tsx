"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BOOKING, CONTACT, formatHourEN } from "@/lib/constants";

// Wizard จองถ่ายโปรไฟล์ 4 step (ตามดีไซน์หน้าบ้าน WP เดิมเป๊ะ):
// เลือกวัน → แพกเกจ → รอบเวลา → ข้อมูล+สลิป
// availability เป็น boolean ต่อ (วัน, ชั่วโมง, แพกเกจ) จาก server — ไม่มีจำนวน

export type WizardDate = {
  id: string;
  label: string; // อังกฤษ "26 July 2026"
  labelTh: string; // ไทย "26 กรกฎาคม 2569"
  location: string | null;
  details: string | null;
  avail: { A: Record<string, boolean>; B: Record<string, boolean> };
};

type PkgKey = "A" | "B";

export function BookingWizard({ dates }: { dates: WizardDate[] }) {
  const [dayId, setDayId] = useState<string | null>(null);
  const [pkg, setPkg] = useState<PkgKey | null>(null);
  const [hour, setHour] = useState<string | null>(null);
  const [slipName, setSlipName] = useState<string | null>(null);
  const [copiedAcct, setCopiedAcct] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | string | null>(null);
  const [lineIdToken, setLineIdToken] = useState<string | null>(null);
  const [lineLinked, setLineLinked] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const day = useMemo(() => dates.find((d) => d.id === dayId) ?? null, [dates, dayId]);

  // เชื่อม LINE อัตโนมัติ "เฉพาะตอนเปิดในแอป LINE" (เงียบๆ ไม่บังคับ) — ได้ id
  // token ไว้ส่งไปผูกโปรไฟล์. เปิดจาก browser ปกติ = ข้าม จองได้ตามปกติ
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // ใช้ LIFF app ของหน้าจองโดยเฉพาะ (endpoint ชี้ /booking) ถ้ามี —
        // ไม่งั้น fallback ตัวเดิม (endpoint /apply)
        const liffId =
          process.env.NEXT_PUBLIC_BOOKING_LIFF_ID ||
          process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) return;
        const { default: liff } = await import("@line/liff");
        await liff.init({ liffId });
        if (!liff.isInClient() || !liff.isLoggedIn()) return;
        const token = liff.getIDToken();
        if (token && !cancelled) {
          setLineIdToken(token);
          setLineLinked(true);
        }
      } catch {
        // ไม่ได้อยู่ใน LINE / init ไม่ได้ — เงียบไว้ จองแบบไม่เชื่อมได้ปกติ
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function pickDay(id: string) {
    setDayId(id);
    setPkg(null);
    setHour(null);
  }
  function pickPkg(k: PkgKey) {
    setPkg(k);
    setHour(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!day || !pkg || !hour || submitting) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setResult("upload");
      return;
    }
    setSubmitting(true);
    setResult(null);

    // ===== เตรียมไฟล์สลิป (แยก try — ถ้าพังให้ฟ้องเรื่อง "ไฟล์" ตรงๆ
    // ไม่ใช่ "ข้อมูลไม่ครบ") =====
    let dataUrl: string;
    try {
      let payloadFile: File | Blob = file;
      if (file.type.startsWith("image/")) {
        try {
          const { default: imageCompression } = await import("browser-image-compression");
          // fileType บังคับผลลัพธ์เป็น JPEG — รูป HEIC จาก iPhone จะถูกแปลง
          // ให้เมื่อ browser อ่านได้ (Safari อ่าน HEIC ได้)
          payloadFile = await imageCompression(file, {
            maxWidthOrHeight: 2000,
            maxSizeMB: 2,
            useWebWorker: true,
            fileType: "image/jpeg",
          });
        } catch {
          // browser บีบไม่ได้ (เช่น HEIC บน Chrome) — ส่งไฟล์เดิมถ้าเป็น
          // ชนิดที่ server รับและไม่ใหญ่เกิน ไม่งั้นฟ้องเรื่องไฟล์
          const okTypes = ["image/jpeg", "image/png", "image/webp"];
          if (!okTypes.includes(file.type) || file.size > 3.5 * 1024 * 1024) {
            setResult("upload");
            setSubmitting(false);
            return;
          }
          payloadFile = file;
        }
      } else if (file.size > 3.5 * 1024 * 1024) {
        setResult("upload");
        setSubmitting(false);
        return;
      }
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(payloadFile);
      });
    } catch {
      setResult("upload");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day_id: day.id,
          package: pkg,
          hour,
          full_name: fd.get("full_name"),
          nickname: fd.get("nickname"),
          phone: fd.get("phone"),
          line_id: fd.get("line_id"),
          email: fd.get("email"),
          height: fd.get("height"),
          weight: fd.get("weight"),
          talents: fd.get("talents"),
          gender: fd.get("gender"),
          dob: fd.get("dob"),
          nationality: fd.get("nationality"),
          line_id_token: lineIdToken, // เชื่อม LINE อัตโนมัติ (ถ้าเปิดใน LINE)
          website: fd.get("website"), // honeypot
          slip: dataUrl,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        setResult("success");
        form.reset();
        setSlipName(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setResult(body.code ?? "invalid");
      }
    } catch {
      // มาถึงตรงนี้ = ส่งไม่ถึง server (เน็ตหลุด/timeout) — ไม่ใช่ข้อมูลไม่ครบ
      setResult("network");
    } finally {
      setSubmitting(false);
    }
  }

  const ERROR_TEXT: Record<string, string> = {
    invalid: "ข้อมูลไม่ครบถ้วน กรุณากรอกชื่อ เบอร์โทร และแนบสลิปค่ะ",
    full: "ขออภัยค่ะ รอบที่เลือกเพิ่งเต็ม/ปิดรับ กรุณาเลือกรอบอื่น",
    upload:
      "ไฟล์สลิปใช้ไม่ได้ค่ะ — กรุณาใช้รูป JPG/PNG หรือ PDF ขนาดไม่เกิน 5 MB (ถ้าเป็นรูปจาก iPhone ลองแคปหน้าจอสลิปแล้วแนบใหม่)",
    network: "ส่งข้อมูลไม่สำเร็จ กรุณาเช็คอินเทอร์เน็ตแล้วลองใหม่อีกครั้งค่ะ",
  };

  if (result === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-xl font-bold text-emerald-700">
          🎉 ส่งข้อมูลการจองเรียบร้อยแล้ว! (Booking Submitted)
        </p>
        <p className="mt-3 text-sm leading-6 text-emerald-800">
          ทีมงานจะตรวจสอบสลิป และยืนยันทาง LINE / Email ภายใน 24 ชั่วโมง (within 24
          hrs)
        </p>
        <p className="mt-2 text-sm leading-6 text-emerald-800">
          หากมีข้อสงสัย ติดต่อ Official LINE:{" "}
          <a href={CONTACT.lineUrl} className="font-semibold underline">
            {CONTACT.lineId}
          </a>
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="mt-4 rounded-full border border-emerald-300 px-5 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
        >
          จองเพิ่มอีกคิว (Book Again)
        </button>
      </div>
    );
  }

  const stepLabel = (n: number, label: string) => (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 items-center justify-center rounded-full bg-[#1D4ED8] text-sm font-bold text-white">
        {n}
      </span>
      <h2 className="text-xl font-bold text-neutral-800">{label}</h2>
    </div>
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {result && result !== "success" && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {ERROR_TEXT[result] ?? ERROR_TEXT.invalid}
        </p>
      )}

      {/* Step 1: เลือกวัน */}
      <section className="space-y-3">
        {stepLabel(1, "เลือกวันที่ถ่าย (Select Date)")}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dates.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => pickDay(d.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                dayId === d.id
                  ? "border-[#1D4ED8] bg-[#1D4ED8]/5 ring-2 ring-[#1D4ED8]/30"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <p className="font-bold text-neutral-800">
                {d.label}{" "}
                <span className="text-sm font-normal text-neutral-400">
                  ({d.labelTh})
                </span>
              </p>
              {d.location && (
                <p className="mt-0.5 text-sm text-neutral-500">📍 {d.location}</p>
              )}
              {d.details && (
                <p className="mt-0.5 text-xs text-neutral-400">{d.details}</p>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: เลือกแพกเกจ */}
      {day && (
        <section className="space-y-3">
          {stepLabel(2, "เลือกแพกเกจ (Select Package)")}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Object.keys(BOOKING.packages) as PkgKey[]).map((k) => {
              const p = BOOKING.packages[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => pickPkg(k)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    pkg === k
                      ? "border-[#1D4ED8] bg-[#1D4ED8]/5 ring-2 ring-[#1D4ED8]/30"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <p className="text-lg font-bold text-neutral-800">{p.name}</p>
                  <p className="text-sm text-neutral-500">{p.subtitle}</p>
                  <p className="mt-2 text-2xl font-bold text-[#1D4ED8]">
                    ฿{p.price.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">{p.note}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Step 3: เลือกรอบเวลา (ว่าง/เต็มขึ้นกับแพกเกจ) */}
      {day && pkg && (
        <section className="space-y-3">
          {stepLabel(3, "เลือกรอบเวลา (Select Time)")}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
            {BOOKING.hours.map((h) => {
              const open = day.avail[pkg][h] === true;
              return (
                <button
                  key={h}
                  type="button"
                  disabled={!open}
                  onClick={() => setHour(h)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    hour === h
                      ? "border-[#1D4ED8] bg-[#1D4ED8] text-white"
                      : open
                        ? "border-neutral-200 bg-white text-neutral-700 hover:border-[#1D4ED8]/50"
                        : "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300 line-through"
                  }`}
                >
                  {formatHourEN(h)}
                </button>
              );
            })}
          </div>
          <p className="flex items-center gap-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-[#1D4ED8]" /> ว่าง (Available)
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-neutral-300" /> เต็ม/ปิดรับ (Full)
            </span>
          </p>
        </section>
      )}

      {/* Step 4: ข้อมูล + ชำระเงิน */}
      {day && pkg && hour && (
        <section className="space-y-4">
          {stepLabel(4, "กรอกข้อมูล & แนบสลิป (Your Info & Payment)")}

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-200 bg-white p-5 sm:grid-cols-2">
            {/* honeypot กันสแปม — ซ่อนจากคนจริง */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />
            {(
              [
                ["nickname", "ชื่อเล่น (Nickname — English) *", "text", true, "ชื่อเล่นภาษาอังกฤษ เช่น Som, Tammy"],
                ["full_name", "ชื่อ-นามสกุลจริง (Full Name)", "text", false, "เช่น สมชาย ใจดี"],
                ["phone", "เบอร์โทร (Phone) *", "tel", true, "08x-xxx-xxxx"],
                ["line_id", "LINE ID", "text", false, "เช่น @tammy หรือเบอร์ที่ผูก LINE"],
                ["email", "อีเมล (Email) *", "email", true, "example@email.com"],
                ["nationality", "สัญชาติ (Nationality) *", "text", true, "เช่น Thai, Thai/American"],
              ] as const
            ).map(([name, label, type, required, placeholder]) => (
              <div key={name} className="space-y-1">
                <label htmlFor={name} className="text-xs font-medium text-neutral-500">
                  {label}
                </label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  required={required}
                  placeholder={placeholder}
                  className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none transition placeholder:text-neutral-300 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>
            ))}

            <div className="space-y-1">
              <label htmlFor="gender" className="text-xs font-medium text-neutral-500">
                เพศ (Gender) *
              </label>
              <select
                id="gender"
                name="gender"
                required
                defaultValue=""
                className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
              >
                <option value="" disabled>
                  เลือกเพศ...
                </option>
                <option value="male">ชาย (Male)</option>
                <option value="female">หญิง (Female)</option>
                <option value="other">อื่นๆ / LGBTQ+ (Other)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="dob" className="text-xs font-medium text-neutral-500">
                วัน/เดือน/ปีเกิด (Date of Birth) * — ระบบคำนวณอายุให้อัตโนมัติ
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>

            {(
              [
                ["height", "ส่วนสูง (Height, ซม.)", "เช่น 120"],
                ["weight", "น้ำหนัก (Weight, กก.)", "เช่น 25"],
              ] as const
            ).map(([name, label, placeholder]) => (
              <div key={name} className="space-y-1">
                <label htmlFor={name} className="text-xs font-medium text-neutral-500">
                  {label}
                </label>
                <input
                  id={name}
                  name={name}
                  type="text"
                  inputMode="numeric"
                  placeholder={placeholder}
                  className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none transition placeholder:text-neutral-300 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="talents" className="text-xs font-medium text-neutral-500">
                ความสามารถพิเศษ (Special Talents — ถ้ามี)
              </label>
              <textarea
                id="talents"
                name="talents"
                rows={2}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>
          </div>

          {/* ชำระเงิน + แนบสลิป */}
          <div className="rounded-2xl border border-[#1D4ED8]/20 bg-[#1D4ED8]/5 p-5">
            <p className="font-semibold text-neutral-800">
              💳 ชำระเงิน (Payment) ฿
              {BOOKING.packages[pkg].price.toLocaleString()} โดยโอนเข้าบัญชี
            </p>
            <dl className="mt-3 space-y-2 text-sm text-neutral-600">
              <div>
                <dt className="text-xs font-medium text-neutral-400">Bank Name</dt>
                <dd className="text-neutral-700">{BOOKING.bank.bank}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-400">
                  Bank Account No.
                </dt>
                <dd className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-neutral-800">
                    {BOOKING.bank.accountNo}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      // copy เฉพาะตัวเลข (ไม่มีขีด) → วางโอนได้เลย ไม่ผิด
                      await navigator.clipboard.writeText(
                        BOOKING.bank.accountNo.replace(/\D/g, ""),
                      );
                      setCopiedAcct(true);
                      setTimeout(() => setCopiedAcct(false), 2000);
                    }}
                    className="rounded-full border border-[#1D4ED8]/40 bg-white px-3 py-1 text-xs font-semibold text-[#1D4ED8] transition hover:bg-[#1D4ED8]/10"
                  >
                    {copiedAcct ? "คัดลอกแล้ว ✓" : "📋 คัดลอกเลขบัญชี"}
                  </button>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-400">Account Name</dt>
                <dd className="text-neutral-700">{BOOKING.bank.accountName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-400">SWIFT</dt>
                <dd className="text-neutral-500">{BOOKING.bank.swift}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setSlipName(e.target.files?.[0]?.name ?? null)}
                className="hidden"
                id="slip"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-[#1D4ED8]/40 bg-white px-4 py-4 text-sm font-medium text-[#1D4ED8] transition hover:bg-[#1D4ED8]/5"
              >
                {slipName ? `🧾 ${slipName} — กดเพื่อเปลี่ยน` : "📎 แนบสลิปโอนเงิน * (JPG/PNG/PDF ≤ 5MB)"}
              </button>
            </div>
          </div>

          {lineLinked && (
            <p className="flex items-center justify-center gap-1.5 rounded-xl bg-[#06C755]/10 px-4 py-2 text-sm font-medium text-[#06C755]">
              <span className="flex size-4 items-center justify-center rounded-full bg-[#06C755] text-[8px] font-extrabold text-white">
                L
              </span>
              เชื่อมบัญชี LINE แล้ว — จัดการโปรไฟล์เองได้หลังทีมงานยืนยัน
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="h-13 w-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? "กำลังส่งข้อมูล..." : "ยืนยันการจอง (Confirm Booking) ✦"}
          </button>
        </section>
      )}
    </form>
  );
}
