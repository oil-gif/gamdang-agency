"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { rescheduleBooking } from "@/actions/shoots";
import { Input } from "@/components/ui/input";
import { ageLabel } from "@/lib/age";

// แผง "📅 ลงรอบใหม่" ในรายชื่อคนขอเลื่อนรอบ (/admin/shoots) — ขอ 2026-09-21
//
// ย้าย "ใบจองเดิม" ไปวันใหม่ (สลิป/LINE/โปรไฟล์ตามไปด้วย) ไม่สร้างใบใหม่
// เวลาเป็นปุ่มใหญ่แทน dropdown — พี่เจ้าของใช้ iPad เป็นหลัก
// ระบบเลือก "เวลาเดิม" ไว้ให้ก่อนถ้ายังว่าง (ลูกค้ามักเลือกเวลานั้นด้วยเหตุผล)

type Target = {
  id: string;
  label: string;
  location: string | null;
  published: boolean;
  hours: {
    hour: string;
    photoLeft: number;
    videoLeft: number;
    publicClosed: boolean;
  }[];
};

type Booking = {
  id: string;
  full_name: string;
  nickname: string | null;
  nickname_th: string | null;
  phone: string;
  line_id: string | null;
  line_user_id: string | null;
  hour: string;
  package: string;
  talent_id: string | null;
  height: string | null;
  weight: string | null;
  dob: string | null;
  /** วันเกิด/สัดส่วนจากโปรไฟล์ (ถ้าผูกแล้ว) — ใช้โชว์อย่างเดียว */
  profile: {
    dob: string | null;
    height: number | null;
    weight: number | null;
  } | null;
};

function fits(h: Target["hours"][number], pkg: string) {
  return h.photoLeft > 0 && (pkg !== "A" || h.videoLeft > 0);
}

export function RescheduleBooking({
  booking: b,
  targets,
  packages,
  startOpen,
  error,
  saved,
  children,
}: {
  booking: Booking;
  targets: Target[];
  packages: string[];
  startOpen: boolean;
  error?: string;
  saved?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(startOpen);
  const firstDay = targets.find((t) => t.published) ?? targets[0];
  const [dayId, setDayId] = useState(firstDay?.id ?? "");
  const [pkg, setPkg] = useState(b.package);
  const day = targets.find((t) => t.id === dayId);
  const pickDefault = (d: Target | undefined, p: string) => {
    const same = d?.hours.find((h) => h.hour === b.hour);
    return same && fits(same, p) ? b.hour : "";
  };
  const [hour, setHour] = useState(() => pickDefault(firstDay, b.package));

  function changeDay(id: string) {
    setDayId(id);
    setHour(
      pickDefault(
        targets.find((t) => t.id === id),
        pkg,
      ),
    );
  }
  function changePkg(p: string) {
    setPkg(p);
    const cur = day?.hours.find((h) => h.hour === hour);
    if (cur && !fits(cur, p)) setHour("");
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {children}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            open
              ? "bg-violet-100 text-violet-800"
              : "bg-violet-600 text-white hover:bg-violet-700"
          }`}
        >
          📅 ลงรอบใหม่ {open ? "▴" : "▾"}
        </button>
      </div>

      {open && (
        <form
          action={rescheduleBooking}
          className="mt-3 space-y-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4"
        >
          <input type="hidden" name="id" value={b.id} />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {saved && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              บันทึกข้อมูลแล้วค่ะ
            </p>
          )}

          {/* ① ข้อมูล */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-violet-900">
              ① ข้อมูล{" "}
              <span className="font-normal text-neutral-500">
                (กรอกไว้ให้แล้ว แก้ได้)
              </span>
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="ชื่อ-สกุล *"
                name="full_name"
                value={b.full_name}
                required
              />
              <Field
                label="ชื่อเล่น (อังกฤษ)"
                name="nickname"
                value={b.nickname}
              />
              <Field
                label="ชื่อเล่น (ไทย)"
                name="nickname_th"
                value={b.nickname_th}
              />
              <Field
                label="เบอร์โทร *"
                name="phone"
                value={b.phone}
                required
                inputMode="tel"
              />
              <Field label="LINE ID" name="line_id" value={b.line_id} />
              {!b.talent_id && (
                <>
                  <Field
                    label="ส่วนสูง (ซม.)"
                    name="height"
                    value={b.height}
                    inputMode="decimal"
                  />
                  <Field
                    label="น้ำหนัก (กก.)"
                    name="weight"
                    value={b.weight}
                    inputMode="decimal"
                  />
                  <Field label="วันเกิด" name="dob" value={b.dob} type="date" />
                </>
              )}
            </div>
            {b.talent_id && (
              // ผูกโปรไฟล์แล้ว → วันเกิด/สัดส่วนต้องแก้ที่โปรไฟล์ที่เดียว
              // (เคยมีสองสำเนาแล้วการ์ดโชว์อายุผิด — แก้ไป 2026-09-20)
              <p className="text-xs text-neutral-500">
                วันเกิด / ส่วนสูง / น้ำหนัก ใช้จากโปรไฟล์
                {b.profile?.dob ? ` · อายุ ${ageLabel(b.profile.dob)}` : ""}
                {b.profile?.height ? ` · ${b.profile.height} ซม.` : ""}
                {b.profile?.weight ? ` · ${b.profile.weight} กก.` : ""}
                {" — "}
                <a
                  href={`/admin/talents/${b.talent_id}`}
                  className="font-semibold text-[#1D4ED8] hover:underline"
                >
                  แก้ที่โปรไฟล์ →
                </a>
              </p>
            )}
          </section>

          {/* ② รอบใหม่ */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-violet-900">② รอบใหม่</h4>
            {targets.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-white px-3 py-3 text-sm text-neutral-500">
                ยังไม่มีรอบถ่ายถัดไป — เปิดรอบใหม่ในช่อง &quot;วันที่ถ่าย&quot;
                ด้านล่างก่อน (ยังไม่ต้องเปิดจองหน้าเว็บก็ใส่คนได้)
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="space-y-1.5">
                    <span className="block text-xs text-neutral-500">
                      วันที่
                    </span>
                    <select
                      name="to_day"
                      value={dayId}
                      onChange={(e) => changeDay(e.target.value)}
                      className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm"
                    >
                      {targets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label} ·{" "}
                          {t.published
                            ? "เปิดจองแล้ว"
                            : "ยังไม่เปิดจองหน้าเว็บ"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-xs text-neutral-500">
                      แพ็กเกจ
                    </span>
                    <select
                      name="to_package"
                      value={pkg}
                      onChange={(e) => changePkg(e.target.value)}
                      className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm"
                    >
                      {packages.map((k) => (
                        <option key={k} value={k}>
                          Package {k}
                          {k === b.package ? " (เดิม)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {pkg !== b.package && (
                  <p className="text-xs font-medium text-amber-700">
                    ⚠️ เปลี่ยนแพ็กเกจจาก {b.package} เป็น {pkg} —
                    เช็คส่วนต่างราคากับลูกค้าด้วยนะคะ
                  </p>
                )}

                <div>
                  <span className="mb-1.5 block text-xs text-neutral-500">
                    เวลา
                  </span>
                  <input type="hidden" name="to_hour" value={hour} />
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {day?.hours.map((h) => {
                      const ok = fits(h, pkg);
                      const left =
                        pkg === "A"
                          ? Math.min(h.photoLeft, h.videoLeft)
                          : h.photoLeft;
                      const chosen = hour === h.hour;
                      return (
                        <button
                          key={h.hour}
                          type="button"
                          disabled={!ok}
                          onClick={() => setHour(h.hour)}
                          aria-pressed={chosen}
                          className={`rounded-lg border px-2 py-2 text-center transition ${
                            chosen
                              ? "border-[#1D4ED8] bg-[#1D4ED8] text-white"
                              : !ok
                                ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400"
                                : h.publicClosed
                                  ? "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-500"
                                  : "border-neutral-300 bg-white text-neutral-800 hover:border-[#1D4ED8]"
                          }`}
                        >
                          <span className="block text-sm font-bold">
                            {h.hour}
                          </span>
                          <span className="block text-[11px]">
                            {!ok ? "เต็ม" : `ว่าง ${left}`}
                            {ok && h.publicClosed ? " · ปิดหน้าเว็บ" : ""}
                          </span>
                          {h.hour === b.hour && (
                            <span
                              className={`block text-[10px] ${chosen ? "text-white/80" : "text-violet-600"}`}
                            >
                              เวลาเดิม
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="send_line"
                    defaultChecked={!!b.line_user_id}
                    disabled={!b.line_user_id}
                    className="size-4"
                  />
                  {b.line_user_id ? (
                    "ส่ง LINE แจ้งรอบใหม่ให้ลูกค้า"
                  ) : (
                    <span className="text-neutral-500">
                      คนนี้ไม่ได้ผูก LINE — หลังย้ายแล้วโทร/ทักแจ้งรอบใหม่เองนะคะ
                    </span>
                  )}
                </label>
              </>
            )}
          </section>

          <div className="flex flex-wrap justify-end gap-2 border-t border-violet-100 pt-3">
            <Submit intent="save" variant="ghost">
              บันทึกข้อมูลอย่างเดียว
            </Submit>
            {targets.length > 0 && (
              <Submit intent="move" disabled={!hour}>
                {hour && day
                  ? `✅ ย้ายไป ${day.label} · ${hour} น. · ${pkg}`
                  : "เลือกเวลาก่อน"}
              </Submit>
            )}
          </div>
        </form>
      )}
    </>
  );
}

function Field({
  label,
  name,
  value,
  ...rest
}: {
  label: string;
  name: string;
  value: string | null;
} & Omit<
  React.ComponentProps<typeof Input>,
  "name" | "value" | "defaultValue"
>) {
  return (
    // label ครอบ input — ไม่ใช้ id เพราะเปิดหลายแผงพร้อมกันได้ (id จะซ้ำ)
    <label className="block space-y-1">
      <span className="block text-xs text-neutral-500">{label}</span>
      <Input
        name={name}
        defaultValue={value ?? ""}
        className="bg-white"
        {...rest}
      />
    </label>
  );
}

function Submit({
  intent,
  variant = "primary",
  disabled,
  children,
}: {
  intent: "save" | "move";
  variant?: "primary" | "ghost";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={disabled || pending}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        variant === "primary"
          ? "bg-[#1D4ED8] text-white hover:opacity-90"
          : "text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      {pending ? "กำลังบันทึก…" : children}
    </button>
  );
}
