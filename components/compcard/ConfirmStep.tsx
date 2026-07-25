"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CompcardGenerator,
  type CompcardTalent,
} from "@/components/compcard/CompcardGenerator";
import { calculateAge } from "@/lib/age";

// Step 3 ของการสมัคร: สรุปข้อมูล → ติ๊กยินยอม (ฉบับแก้มแดง) → ยืนยันส่ง →
// สร้าง/บันทึก Comp Card ได้เลย
export function ConfirmStep({
  talent,
  slots,
  backHref,
  doneHref,
  isInfluencer,
  topSocialText,
  expertise,
  variant = "compcard",
  compcardPath,
  singlePhotoPath,
}: {
  talent: CompcardTalent & { phone?: string | null };
  slots: Record<string, string>;
  backHref: string;
  doneHref: string;
  isInfluencer: boolean;
  topSocialText: string | null;
  expertise: string[];
  // compcard = สร้างใหม่ด้วยระบบ · legacy = อัพคอมการ์ดแก้มแดงเดิม ·
  // influencer = รูปเดียว (Influencer ล้วน ไม่ทำคอมการ์ด)
  variant?: "compcard" | "legacy" | "influencer";
  compcardPath?: string | null;
  singlePhotoPath?: string | null;
}) {
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const allChecked = c1 && c2 && c3;

  const age = talent.dob ? calculateAge(talent.dob) : null;
  const rows: [string, string][] = [
    ["ชื่อเล่น (EN)", talent.nickname_en ?? "-"],
    ["ชื่อเล่น (ไทย)", talent.nickname_th ?? "-"],
    [
      "เพศ / อายุ",
      `${talent.gender === "male" ? "ชาย" : talent.gender === "female" ? "หญิง" : "อื่นๆ"}${age != null ? ` · ${age} ปี` : ""}`,
    ],
  ];
  // สูง/หนัก/สัญชาติ — โชว์เมื่อมีข้อมูล (Influencer ล้วนอาจไม่ได้กรอก)
  if (talent.height_cm || talent.weight_kg) {
    rows.push([
      "ส่วนสูง / น้ำหนัก",
      `${talent.height_cm ?? "-"} cm / ${talent.weight_kg ?? "-"} kg`,
    ]);
  }
  if (talent.nationality) rows.push(["สัญชาติ", talent.nationality]);
  rows.push(["เบอร์โทร", talent.phone ?? "-"]);
  if (isInfluencer) {
    if (expertise.length > 0) rows.push(["ความเชี่ยวชาญ", expertise.join(", ")]);
    if (topSocialText) rows.push(["ช่องทางเด่น", topSocialText]);
  }

  // ข้อยินยอมข้อ 2 ปรับตามชนิดการสมัคร
  const c2Text =
    variant === "legacy"
      ? "ข้าพเจ้ายืนยันว่าคอมการ์ดที่อัพโหลดเป็นคอมการ์ดของแก้มแดง (GAMDANG AGENCY) ที่จัดทำไว้เดิม และยินยอมให้บริษัทนำไปใช้และเผยแพร่ในฐานข้อมูลนักแสดง เพื่อการนำเสนองานภายใต้เครือแก้มแดงเท่านั้น"
      : variant === "influencer"
        ? "ข้าพเจ้ายินยอมให้บริษัทนำรูปถ่ายและข้อมูลไปใช้และเผยแพร่ในฐานข้อมูลนักแสดง เพื่อการนำเสนองานภายใต้เครือแก้มแดง (GAMDANG AGENCY) เท่านั้น"
        : "ข้าพเจ้ายินยอมให้บริษัทนำรูปถ่ายไปจัดทำ Comp Card โดยระบบของแก้มแดง และเผยแพร่ในฐานข้อมูลนักแสดงของบริษัท ทั้งนี้ Comp Card ที่ระบบสร้างขึ้นจะใช้เพื่อการนำเสนองานภายใต้เครือแก้มแดง (GAMDANG AGENCY) เท่านั้น";

  if (confirmed) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-1 font-bold text-emerald-800">ส่งข้อมูลเรียบร้อยแล้ว!</p>
          <p className="mt-1 text-sm text-emerald-700">
            ทีมงานแก้มแดงจะตรวจสอบและอนุมัติโปรไฟล์โดยเร็ว —
            ระหว่างนี้บันทึก Comp Card เก็บไว้ได้เลยค่ะ
          </p>
        </div>

        {variant === "compcard" ? (
          <div>
            <h3 className="mb-2 text-base font-bold text-neutral-800">🪪 My Compcard</h3>
            <CompcardGenerator talent={talent} slots={slots} />
          </div>
        ) : variant === "influencer" ? (
          <div>
            <h3 className="mb-2 text-base font-bold text-neutral-800">
              🖼️ รูปโปรไฟล์ของฉัน
            </h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/photo/${singlePhotoPath}`}
              alt="รูปโปรไฟล์"
              className="max-h-[520px] w-full rounded-xl border border-neutral-200 bg-neutral-50 object-contain"
            />
          </div>
        ) : (
          // legacy — รูปหลัก = การ์ดหน้าบ้าน · คอมการ์ดแก้มแดง = แนบให้ลูกค้า
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-base font-bold text-neutral-800">
                🖼️ รูปการ์ด (หน้าบ้าน)
              </h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/photo/${singlePhotoPath}`}
                alt="รูปการ์ด"
                className="max-h-[520px] w-full rounded-xl border border-neutral-200 bg-neutral-50 object-contain"
              />
            </div>
            {compcardPath && (
              <div>
                <h3 className="mb-2 text-base font-bold text-neutral-800">
                  🪪 คอมการ์ดแก้มแดง{" "}
                  <span className="text-xs font-normal text-neutral-400">
                    (แนบให้ลูกค้า)
                  </span>
                </h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/photo/${compcardPath}`}
                  alt="คอมการ์ดแก้มแดงเดิม"
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 object-contain"
                />
              </div>
            )}
          </div>
        )}

        <Link
          href={doneHref}
          className="block rounded-full border border-neutral-300 bg-white py-3 text-center text-sm font-semibold text-neutral-700"
        >
          กลับหน้าโปรไฟล์ทั้งหมด
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* สรุปข้อมูล */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="font-bold text-neutral-800">สรุปข้อมูลของหนู</p>
        <dl className="mt-3 space-y-1.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-32 shrink-0 text-neutral-400">{k}</dt>
              <dd className="font-medium text-neutral-800">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex gap-2">
          {(["headshot", "half", "lifestyle", "full"] as const).map(
            (k) =>
              slots[k] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={k}
                  src={`/photo/${slots[k]}?w=320`}
                  alt={k}
                  className="h-20 w-14 rounded-md border border-neutral-200 object-cover"
                />
              ),
          )}
        </div>
      </div>

      {/* ข้อยินยอม (ฉบับแก้มแดง) */}
      <div className="space-y-2.5">
        <p className="text-sm font-bold text-neutral-700">ข้อยินยอม *</p>
        {(
          [
            [
              c1,
              setC1,
              "ข้าพเจ้ายินยอมให้ บริษัท แก้มแดง จำกัด (GAMDANG AGENCY) จัดเก็บ ใช้ และประมวลผลข้อมูลส่วนบุคคลและรูปถ่ายตามใบสมัครนี้ เพื่อการจัดทำฐานข้อมูลนักแสดง การพิจารณาจับคู่งาน และการนำเสนอต่อลูกค้าของบริษัท ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)",
            ],
            [c2, setC2, c2Text],
            [
              c3,
              setC3,
              "ข้าพเจ้าขอรับรองว่าข้อมูลทั้งหมดเป็นความจริง รูปถ่ายเป็นรูปจริงล่าสุดของผู้สมัคร (มิใช่ภาพที่สร้างหรือดัดแปลงด้วย AI) และรับทราบว่าการลงทะเบียนนี้เป็นเพียงการเข้าร่วมฐานข้อมูลนักแสดง มิใช่สัญญาจ้างงานแต่อย่างใด",
            ],
          ] as [boolean, (v: boolean) => void, string][]
        ).map(([val, set, text], i) => (
          <label
            key={i}
            className="flex cursor-pointer items-start gap-2.5 rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[13px] leading-5 text-neutral-600 transition has-[:checked]:border-[#1D4ED8] has-[:checked]:bg-[#1D4ED8]/5"
          >
            <input
              type="checkbox"
              checked={val}
              onChange={(e) => set(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[#1D4ED8]"
            />
            <span>{text}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <Link
          href={backHref}
          className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-600"
        >
          ← ย้อนกลับ
        </Link>
        <button
          type="button"
          disabled={!allChecked}
          onClick={() => setConfirmed(true)}
          className="flex-1 rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] py-3 text-sm font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-40"
        >
          ยืนยันและส่งข้อมูล ✦
        </button>
      </div>
      {!allChecked && (
        <p className="text-center text-xs text-neutral-400">
          ติ๊กยอมรับครบทั้ง 3 ข้อ เพื่อส่งข้อมูลค่ะ
        </p>
      )}
    </div>
  );
}
