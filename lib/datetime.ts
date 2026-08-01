// การแสดงวัน/เวลาทั้งระบบ — ต้องล็อกเป็นเวลาไทยเสมอ
//
// ⚠️ GOTCHA (เจอจริง 2026-07-31): หน้าเว็บ render บน Vercel ซึ่งรันเป็น **UTC**
// ถ้าเรียก toLocaleString("th-TH") เฉยๆ จะได้เวลา UTC (ช้ากว่าไทย 7 ชม.) เช่น
// คนจองตอน 17:29 แต่หลังบ้านโชว์ 10:29 — ต้องใส่ timeZone: "Asia/Bangkok" เสมอ
// ใช้ helper ในไฟล์นี้แทนการเรียก toLocale* ตรงๆ ทุกที่

export const TH_TZ = "Asia/Bangkok";

type Input = string | number | Date | null | undefined;

function toDate(v: Input): Date | null {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** วันที่แบบไทย เช่น "1 ส.ค. 2569" (locale th-TH ใช้ปี พ.ศ.) */
export function formatThaiDate(v: Input, opts?: Intl.DateTimeFormatOptions) {
  const d = toDate(v);
  if (!d) return "-";
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TH_TZ,
    ...opts,
  });
}

/** วันที่+เวลาไทย เช่น "1 ส.ค. 2569 17:29" */
export function formatThaiDateTime(v: Input, opts?: Intl.DateTimeFormatOptions) {
  const d = toDate(v);
  if (!d) return "-";
  return d.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TH_TZ,
    ...opts,
  });
}

/** เวลาไทยอย่างเดียว เช่น "17:29" */
export function formatThaiTime(v: Input, opts?: Intl.DateTimeFormatOptions) {
  const d = toDate(v);
  if (!d) return "-";
  return d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TH_TZ,
    ...opts,
  });
}

/** วันที่ภาษาอังกฤษสำหรับเอกสารลูกค้า เช่น "14 August 2026" (ปี ค.ศ.) */
export function formatEnDate(v: Input, opts?: Intl.DateTimeFormatOptions) {
  const d = toDate(v);
  if (!d) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TH_TZ,
    ...opts,
  });
}
