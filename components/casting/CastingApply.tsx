"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { applyAsMembers, applyToCasting, type CastingProfile } from "@/actions/casting-apply";

type Role = { id: string; title: string };

// ฟอร์มสมัคร casting — 3 โหมด:
//  1) สมาชิก (login แล้ว) → เลือกโปรไฟล์ลูกที่จะสมัคร กดสมัครเลย
//  2) ยังไม่ login → ปุ่มเข้าสู่ระบบ/ลงทะเบียนด้วย LINE (+ auto ในแอป LINE)
//  3) กรอกเอง (ไม่ผูก LINE) → บังคับแนบรูป Compcard
export function CastingApply({
  projectId,
  roles,
  closed,
  shareUrl,
  shareTitle,
  loggedIn,
  profiles,
}: {
  projectId: string;
  roles: Role[];
  closed: boolean;
  shareUrl: string;
  shareTitle: string;
  loggedIn: boolean;
  profiles: CastingProfile[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // เปิดในแอป LINE + ยังไม่ login → ผูก session ให้อัตโนมัติ แล้ว refresh
  useEffect(() => {
    if (loggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) return;
        const { default: liff } = await import("@line/liff");
        await liff.init({ liffId });
        if (liff.isInClient() && liff.isLoggedIn()) {
          const idToken = liff.getIDToken();
          if (!idToken) return;
          await fetch("/api/line/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          if (!cancelled) router.refresh();
        }
      } catch {
        /* ไม่ได้อยู่ใน LINE — ข้าม */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, router]);

  // ล็อกอินผ่านหน้า /apply (เป็น LIFF endpoint ที่ลงทะเบียนไว้ — login ได้
  // ทั้งในแอป LINE และ browser/Facebook) แล้ว ?next เด้งกลับมาหน้านี้
  const loginHref = `/apply?next=${encodeURIComponent(`/casting/${projectId}`)}`;

  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const lineShare = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="space-y-5">
      {/* ===== ปุ่มแชร์ ===== */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-neutral-500">แชร์งานนี้:</span>
        <a
          href={lineShare}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-white"
        >
          LINE
        </a>
        <a
          href={fbShare}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white"
        >
          Facebook
        </a>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600"
        >
          {copied ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}
        </button>
      </div>

      {closed ? (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-100 py-4 text-center font-semibold text-neutral-500">
          ปิดรับสมัครแล้ว (Casting Closed)
        </div>
      ) : loggedIn && profiles.length > 0 ? (
        <MemberApply
          projectId={projectId}
          roles={roles}
          profiles={profiles}
          shareTitle={shareTitle}
        />
      ) : loggedIn ? (
        // login แล้วแต่ยังไม่มีโปรไฟล์
        <div className="space-y-3 rounded-2xl border border-[#1D4ED8]/20 bg-[#1D4ED8]/5 p-5 text-center">
          <p className="text-sm font-semibold text-neutral-700">
            คุณยังไม่มีโปรไฟล์ในระบบ — กรอกประวัติก่อนเพื่อสมัครค่ะ
          </p>
          <a
            href="/apply/profiles"
            className="inline-block rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-6 py-3 font-bold text-white shadow-sm"
          >
            กรอกประวัติเพื่อสมัคร
          </a>
        </div>
      ) : (
        // ยังไม่ login
        <div className="space-y-3">
          <a
            href={loginHref}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#06C755] py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95"
          >
            เข้าสู่ระบบด้วย LINE เพื่อสมัคร
          </a>
          <p className="text-center text-xs text-neutral-400">
            เป็นสมาชิกอยู่แล้ว? เข้าสู่ระบบแล้วกดสมัครได้เลย ไม่ต้องกรอกใหม่
          </p>

          {!manualOpen ? (
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="w-full text-center text-sm font-medium text-[#1D4ED8] underline underline-offset-4"
            >
              หรือกรอกข้อมูลใหม่ (ต้องแนบรูป Compcard)
            </button>
          ) : (
            <ManualApply
              projectId={projectId}
              roles={roles}
              shareTitle={shareTitle}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ===== โหมดสมาชิก: เลือกโปรไฟล์ลูกที่จะสมัคร =====
function MemberApply({
  projectId,
  roles,
  profiles,
  shareTitle,
}: {
  projectId: string;
  roles: Role[];
  profiles: CastingProfile[];
  shareTitle: string;
}) {
  const selectable = profiles.filter((p) => !p.alreadyApplied);
  const [selected, setSelected] = useState<string[]>(
    selectable.length === 1 ? [selectable[0].id] : [],
  );

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <form
      action={applyAsMembers}
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <p className="text-sm font-semibold text-neutral-700">
        สมัครในนามของ (เลือกได้หลายคน) ✦
      </p>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {profiles.map((p) => {
          const checked = selected.includes(p.id);
          return (
            <button
              type="button"
              key={p.id}
              disabled={p.alreadyApplied}
              onClick={() => toggle(p.id)}
              className={`relative overflow-hidden rounded-xl border-2 text-left transition ${
                p.alreadyApplied
                  ? "cursor-not-allowed border-neutral-200 opacity-60"
                  : checked
                    ? "border-[#1D4ED8] ring-2 ring-[#1D4ED8]/20"
                    : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className="aspect-[3/4] bg-neutral-100">
                {p.photo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/photo/${p.photo_path}?w=320`}
                    alt=""
                    className="size-full object-cover object-top"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-[10px] text-neutral-400">
                    ยังไม่มีรูป
                  </div>
                )}
              </div>
              <div className="p-1.5">
                <p className="truncate text-xs font-semibold text-neutral-800">
                  {p.name}
                </p>
                {p.alreadyApplied ? (
                  <p className="text-[10px] font-medium text-emerald-600">สมัครแล้ว ✓</p>
                ) : (
                  <p className="text-[10px] text-neutral-400">
                    {checked ? "เลือกแล้ว" : "แตะเพื่อเลือก"}
                  </p>
                )}
              </div>
              {checked && (
                <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-[#1D4ED8] text-[11px] font-bold text-white">
                  ✓
                </span>
              )}
              {selected.includes(p.id) && (
                <input type="hidden" name="talent_ids" value={p.id} />
              )}
            </button>
          );
        })}

        {/* เพิ่มลูกอีกคน */}
        <a
          href="/apply/profiles"
          className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#1D4ED8]/40 text-[#1D4ED8]"
        >
          <span className="text-2xl">+</span>
          <span className="px-1 text-center text-[10px] font-medium">เพิ่มโปรไฟล์</span>
        </a>
      </div>

      {roles.length > 0 && (
        <div className="space-y-1">
          <label htmlFor="role_id" className="text-xs font-medium text-neutral-500">
            สมัคร Role
          </label>
          <select
            id="role_id"
            name="role_id"
            defaultValue=""
            className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm"
          >
            <option value="">— เลือก Role (ถ้ามี) —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="note" className="text-xs font-medium text-neutral-500">
          ข้อความถึงทีมงาน (ถ้ามี)
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={selected.length === 0}
        className="w-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] py-3 font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
      >
        สมัครเลย{selected.length > 0 ? ` (${selected.length} คน)` : ""} ✦
      </button>
      <p className="text-center text-xs text-neutral-400">งานนี้: {shareTitle}</p>
    </form>
  );
}

// ===== โหมดกรอกเอง: บังคับแนบรูป Compcard =====
function ManualApply({
  projectId,
  roles,
  shareTitle,
}: {
  projectId: string;
  roles: Role[];
  shareTitle: string;
}) {
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const { default: imageCompression } = await import("browser-image-compression");
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1600,
        maxSizeMB: 2,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(compressed);
      });
      const res = await fetch("/api/inbox-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "อัพโหลดไม่สำเร็จ");
      setPhotoPath(body.path);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "อัพโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form
      action={applyToCasting}
      className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="photo_path" value={photoPath ?? ""} />
      <p className="text-sm font-semibold text-neutral-700">
        กรอกข้อมูลเพื่อสมัคร — ทีมงานจะติดต่อกลับ
      </p>

      {/* รูป Compcard (บังคับ) — กรอบแนวนอน */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500">
          รูป Compcard *{" "}
          <span className="text-neutral-400">(ต้องแนบ — เอาไปเสนอลูกค้า)</span>
        </label>
        <div className="aspect-[3/2] w-full overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
          {photoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/photo/${photoPath}`} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-center text-xs text-neutral-400">
              รูป Compcard (แนวนอน)
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handlePhoto}
          className="hidden"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
          >
            {busy ? "กำลังอัพโหลด..." : photoPath ? "เปลี่ยนรูป" : "อัพโหลดรูป Compcard"}
          </button>
          {err && <p className="text-xs text-rose-600">{err}</p>}
        </div>
      </div>

      {roles.length > 0 && (
        <div className="space-y-1">
          <label htmlFor="m_role_id" className="text-xs font-medium text-neutral-500">
            สมัคร Role
          </label>
          <select
            id="m_role_id"
            name="role_id"
            defaultValue=""
            className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm"
          >
            <option value="">— เลือก Role (ถ้ามี) —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {(
        [
          ["nickname", "ชื่อเล่น (Nickname) *", "text", true, "เช่น Som"],
          ["phone", "เบอร์โทร (Phone) *", "tel", true, "08x-xxx-xxxx"],
          ["email", "อีเมล (Email)", "email", false, "example@email.com"],
          ["nationality", "สัญชาติ (Nationality)", "text", false, "เช่น Thai"],
        ] as const
      ).map(([name, label, type, required, ph]) => (
        <div key={name} className="space-y-1">
          <label htmlFor={name} className="text-xs font-medium text-neutral-500">
            {label}
          </label>
          <input
            id={name}
            name={name}
            type={type}
            required={required}
            placeholder={ph}
            className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
          />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="gender" className="text-xs font-medium text-neutral-500">
            เพศ (Gender) *
          </label>
          <select
            id="gender"
            name="gender"
            required
            defaultValue=""
            className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm"
          >
            <option value="" disabled>
              — เลือกเพศ —
            </option>
            <option value="male">ชาย</option>
            <option value="female">หญิง</option>
            <option value="other">อื่นๆ</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="dob" className="text-xs font-medium text-neutral-500">
            วันเกิด (DOB) — ปี ค.ศ.
          </label>
          <input
            id="dob"
            name="dob"
            type="date"
            lang="en-GB"
            max={new Date().toISOString().slice(0, 10)}
            className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="height_cm" className="text-xs font-medium text-neutral-500">
            ส่วนสูง (cm) *
          </label>
          <input
            id="height_cm"
            name="height_cm"
            type="number"
            required
            min={30}
            max={230}
            placeholder="เช่น 165"
            className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="weight_kg" className="text-xs font-medium text-neutral-500">
            น้ำหนัก (kg) *
          </label>
          <input
            id="weight_kg"
            name="weight_kg"
            type="number"
            required
            min={5}
            max={200}
            placeholder="เช่น 50"
            className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="m_note" className="text-xs font-medium text-neutral-500">
          ข้อความถึงทีมงาน (ถ้ามี)
        </label>
        <textarea
          id="m_note"
          name="note"
          rows={2}
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={!photoPath || busy}
        className="w-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] py-3 font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
      >
        ส่งใบสมัคร (Submit) ✦
      </button>
      {!photoPath && (
        <p className="text-center text-xs text-rose-500">* กรุณาแนบรูป Compcard ก่อนส่ง</p>
      )}
      <p className="text-center text-xs text-neutral-400">งานนี้: {shareTitle}</p>
    </form>
  );
}
