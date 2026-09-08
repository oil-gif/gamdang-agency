"use client";

import { useRef, useState, useTransition } from "react";

// lib/storage.ts เป็น server-only (มันดึง supabase client มาด้วย) — import
// จากฝั่ง client ไม่ได้ · URL รูปเป็นแค่ path คงที่ เขียนตรงนี้เองสั้นกว่า
const photoUrl = (path: string) => `/photo/${path}?w=480`;

type Draft = {
  id: string;
  code: string;
  photo_path: string;
  fileName: string;
};

// "⚡ เพิ่มด่วนจากคอมการ์ด"
//
// ปัญหาเดิม: บาง talent เรามีแค่คอมการ์ด ไม่รู้วันเกิด/ส่วนสูง → เอาเข้าโปรเจกต์
// ไปเสนอลูกค้าไม่ได้ เพราะต้องกรอกฟอร์มเต็มทีละคน (พี่เจ้าของแจ้ง 2026-09-08)
//
// ที่นี่: เลือกรูปทีเดียวหลายใบ → ระบบสร้าง "ใบร่าง" ให้ทันทีใบละคน พร้อมรูป
// → แอดมินพิมพ์แค่ชื่อ (บังคับ) เลือก Role แล้วกดบันทึกเข้าโปรเจกต์รวดเดียว
// อายุ/สูง/หนัก/เพศ มีก็ใส่ ไม่มีก็ปล่อยว่าง
export function QuickTalentUpload({
  projectId,
  roles,
  saveAction,
  discardAction,
}: {
  projectId: string;
  roles: { id: string; title: string }[];
  saveAction: (formData: FormData) => Promise<void>;
  discardAction: (formData: FormData) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(0); // จำนวนรูปที่ยังอัพไม่เสร็จ
  const [err, setErr] = useState<string | null>(null);
  const [, startDiscard] = useTransition();

  // ทิ้งใบร่างทีละใบ (อัพผิดรูป/ซ้ำ) — ปุ่มนี้อยู่ในแถวซึ่งอยู่ใน <form> อยู่แล้ว
  // ซ้อน <form> ซ้อนกันไม่ได้ตามสเปค HTML เลยเรียก action ตรงๆ จาก JS แทน
  function discard(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    const fd = new FormData();
    fd.set("id", id);
    fd.set("project_id", projectId);
    startDiscard(() => {
      void discardAction(fd);
    });
  }

  // ⚠️ ย่อรูปตั้งแต่ในเครื่องก่อนส่ง — ห้ามส่งไฟล์เต็มขนาด
  //
  // เซิร์ฟเวอร์ย่อให้อยู่แล้ว (sharp 1800px/q84 → เหลือไม่ถึง 1 MB) แต่ "ขาส่ง"
  // ต้องแบกไฟล์เต็มไปก่อน · คอมการ์ดจากดีไซเนอร์ 4000x3000 = 22 MB พอแปลงเป็น
  // base64 บวมอีก 33% เป็น ~30 MB → **เกินลิมิต body ของ Vercel (4.5 MB)
  // อัพไม่ผ่านบน production** ทั้งที่รันในเครื่องผ่าน (วัดจริง 2026-09-08)
  //
  // ย่อในเบราว์เซอร์ก่อนเหลือหลักร้อย KB → ส่งไว ประหยัดเน็ตมือถือ และไม่ชนลิมิต
  // เซิร์ฟเวอร์ยังย่อซ้ำอีกชั้นเหมือนเดิม (กันไฟล์แปลกๆ + ได้ผลลัพธ์คงที่)
  const MAX_EDGE = 2000; // ใหญ่กว่า 1800 ที่เซิร์ฟเวอร์ใช้เล็กน้อย ไม่ให้เสียความคม
  async function shrink(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("เบราว์เซอร์นี้ย่อรูปไม่ได้");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);
    const list = Array.from(files);
    setBusy(list.length);

    // อัพทีละใบ (ไม่ยิงพร้อมกันทั้งหมด) — รูปคอมการ์ดไฟล์ใหญ่ ยิง 20 ใบพร้อมกัน
    // มีสิทธิ์โดน limit ของ Vercel และแรมฝั่ง sharp
    for (const file of list) {
      try {
        const data = await shrink(file);
        const res = await fetch("/api/quick-talent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "อัพโหลดไม่สำเร็จ");
        setDrafts((prev) => [
          ...prev,
          { ...json, fileName: file.name.replace(/\.[^.]+$/, "") },
        ]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "อัพโหลดไม่สำเร็จ");
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-[#1D4ED8]/40 bg-[#1D4ED8]/5 p-4 text-center">
        <p className="text-sm font-semibold text-[#1D4ED8]">
          เลือกคอมการ์ดได้ทีละหลายรูป
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">
          ระบบจะสร้างใบร่างให้รูปละ 1 คน · กรอกแค่ <b>ชื่อ</b> ก็เข้าโปรเจกต์ได้เลย
          · อายุ/ส่วนสูง/น้ำหนัก มีค่อยใส่ทีหลังได้
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <button
          type="button"
          disabled={busy > 0}
          onClick={() => fileRef.current?.click()}
          className="mt-3 rounded-full bg-[#1D4ED8] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy > 0 ? `กำลังอัพโหลด... เหลือ ${busy} รูป` : "📤 เลือกรูปคอมการ์ด"}
        </button>
        {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
      </div>

      {drafts.length > 0 && (
        <form action={saveAction} className="space-y-3">
          <p className="text-sm font-semibold text-neutral-700">
            อัพแล้ว {drafts.length} คน — กรอกชื่อแล้วกดบันทึก
          </p>
          {drafts.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-start gap-3 rounded-xl border bg-white p-3 shadow-sm"
            >
              <input type="hidden" name="qt_id" value={d.id} />
              <div className="h-24 w-36 shrink-0 overflow-hidden rounded-lg border bg-neutral-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(d.photo_path)}
                  alt=""
                  className="size-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-neutral-400">
                    {d.code}
                  </span>
                  <input
                    name="qt_name"
                    required
                    defaultValue={d.fileName}
                    placeholder="ชื่อ (Name) *"
                    className="h-9 min-w-40 flex-1 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
                  />
                  {roles.length > 0 && (
                    <select
                      name="qt_role"
                      defaultValue={roles[0].id}
                      className="h-9 min-w-0 max-w-56 flex-1 rounded-lg border border-neutral-300 bg-white px-2 text-xs"
                      aria-label="เลือก Role"
                    >
                      <option value="">— ไม่ระบุ Role —</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    name="qt_gender"
                    defaultValue=""
                    className="h-8 rounded-lg border border-neutral-300 bg-white px-2 text-xs text-neutral-600"
                    aria-label="เพศ"
                  >
                    <option value="">เพศ (ไม่ระบุ)</option>
                    <option value="female">หญิง (Female)</option>
                    <option value="male">ชาย (Male)</option>
                    <option value="other">อื่นๆ (Other)</option>
                  </select>
                  <input
                    name="qt_age"
                    type="number"
                    min={1}
                    max={99}
                    placeholder="อายุ"
                    className="h-8 w-20 rounded-lg border border-neutral-300 px-2 text-xs"
                  />
                  <input
                    name="qt_height"
                    type="number"
                    min={30}
                    max={230}
                    placeholder="สูง cm."
                    className="h-8 w-24 rounded-lg border border-neutral-300 px-2 text-xs"
                  />
                  <input
                    name="qt_weight"
                    type="number"
                    min={5}
                    max={200}
                    placeholder="หนัก kg."
                    className="h-8 w-24 rounded-lg border border-neutral-300 px-2 text-xs"
                  />
                  <span className="text-[11px] text-neutral-400">
                    (ไม่บังคับ)
                  </span>
                  <button
                    type="button"
                    onClick={() => discard(d.id)}
                    className="ml-auto rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-400 hover:border-rose-300 hover:text-rose-600"
                    title="ทิ้งใบร่างนี้ (ลบรูปด้วย)"
                  >
                    🗑 ทิ้งใบนี้
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy > 0}
              className="rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
            >
              ✓ บันทึกและเพิ่มเข้าโปรเจกต์ ({drafts.length} คน)
            </button>
            <span className="text-xs text-neutral-400">
              คนที่ไม่ใส่ชื่อจะถูกข้ามไว้ก่อน (ใบร่างยังอยู่ในรายการ Talent)
            </span>
          </div>
        </form>
      )}

    </div>
  );
}
