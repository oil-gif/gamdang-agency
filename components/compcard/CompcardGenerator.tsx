"use client";

import { useCallback, useEffect, useState } from "react";
import { calculateAge } from "@/lib/age";
import {
  BOTTOM_BAR_H,
  CARD_H,
  CARD_W,
  COMPCARD_CTA,
  FRAMES,
  INFO_BOX,
  LOGO_SRC,
  genderAgeLabel,
  infoBoxColors,
} from "@/lib/compcard";

export type CompcardTalent = {
  id: string;
  code?: string | null;
  nickname_en?: string | null;
  nickname_th?: string | null;
  gender?: string | null;
  dob?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  nationality?: string | null;
};

// Comp Card Studio — วาดการ์ดจริงบน canvas ฝั่ง browser (ฟอนต์ชัวร์กว่า
// server) จากรูป 4 ช่องที่ crop แล้ว → preview → บันทึกเข้าระบบ/ดาวน์โหลด
export function CompcardGenerator({
  talent,
  slots,
}: {
  talent: CompcardTalent;
  slots: Record<string, string>;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = ["headshot", "half", "lifestyle", "full"].every((k) => slots[k]);

  const build = useCallback(async () => {
    if (!ready || building) return;
    setBuilding(true);
    setError(null);
    setSavedPath(null);
    try {
      // โหลดรูป 4 ช่อง (ผ่าน /photo proxy = same-origin, canvas ไม่ taint)
      const load = (path: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("โหลดรูปไม่สำเร็จ"));
          img.src = `/photo/${path}`;
        });
      const [headshot, half, lifestyle, full] = await Promise.all([
        load(slots.headshot),
        load(slots.half),
        load(slots.lifestyle),
        load(slots.full),
      ]);
      // โลโก้แก้มแดง (ถ้ายังไม่มีไฟล์ → ข้าม ไม่ให้การ์ดพัง)
      const logo = await new Promise<HTMLImageElement | null>((resolve) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => resolve(null);
        im.src = LOGO_SRC;
      });
      // รอฟอนต์ Kanit โหลดก่อนวาดตัวหนังสือ
      try {
        await Promise.all([
          document.fonts.load("bold 64px Kanit"),
          document.fonts.load("600 34px Kanit"),
          document.fonts.ready,
        ]);
      } catch {
        /* ฟอนต์ไม่มา ใช้ fallback */
      }

      const canvas = document.createElement("canvas");
      canvas.width = CARD_W;
      canvas.height = CARD_H;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      // วาดรูปแบบ cover ลงกรอบ (รูป crop มาตามอัตราส่วนแล้ว — พอดีเป๊ะ)
      const cover = (
        img: HTMLImageElement,
        f: { x: number; y: number; w: number; h: number },
      ) => {
        const s = Math.max(f.w / img.naturalWidth, f.h / img.naturalHeight);
        const dw = img.naturalWidth * s;
        const dh = img.naturalHeight * s;
        ctx.save();
        ctx.beginPath();
        ctx.rect(f.x, f.y, f.w, f.h);
        ctx.clip();
        ctx.drawImage(img, f.x + (f.w - dw) / 2, f.y + (f.h - dh) / 2, dw, dh);
        ctx.restore();
      };
      cover(headshot, FRAMES.headshot);
      cover(half, FRAMES.half);
      cover(lifestyle, FRAMES.lifestyle);
      cover(full, FRAMES.full);

      // ลายน้ำโลโก้ (กลมๆ โปร่งแสง) มุมขวาล่างของรูปหลัก + เต็มตัว
      const watermark = (f: { x: number; y: number; w: number; h: number }) => {
        if (!logo) return;
        const size = Math.min(f.w, f.h) * 0.16;
        const pad = size * 0.35;
        const cx = f.x + f.w - size / 2 - pad;
        const cy = f.y + f.h - size / 2 - pad;
        const s = Math.min(size / logo.naturalWidth, size / logo.naturalHeight);
        const dw = logo.naturalWidth * s;
        const dh = logo.naturalHeight * s;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.drawImage(logo, cx - dw / 2, cy - dh / 2, dw, dh);
        ctx.restore();
      };
      watermark(FRAMES.headshot);
      watermark(FRAMES.full);

      // ===== กล่องข้อมูล (สีตามเพศ) =====
      const [c1, c2] = infoBoxColors(talent.gender);
      const g = ctx.createLinearGradient(
        INFO_BOX.x,
        INFO_BOX.y,
        INFO_BOX.x + INFO_BOX.w,
        INFO_BOX.y + INFO_BOX.h,
      );
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.fillRect(INFO_BOX.x, INFO_BOX.y, INFO_BOX.w, INFO_BOX.h);

      const F = "Kanit, 'Helvetica Neue', Arial, sans-serif";
      // จัดชิดขวา ให้ดูพรีเมียม (ลำดับตามการ์ดตัวอย่าง: รหัสใหญ่ → ชื่อ → รายละเอียด)
      const rx = INFO_BOX.x + INFO_BOX.w - 34; // ขอบขวา (เว้น padding)
      const maxW = INFO_BOX.w - 68;
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "right";
      // รหัส — ใหญ่ชัด แต่ไม่หนาจัด
      ctx.font = `600 86px ${F}`;
      ctx.fillText(talent.code ?? "", rx, INFO_BOX.y + 96, maxW);
      // ชื่อ EN
      ctx.font = `600 42px ${F}`;
      const name = talent.nickname_en || talent.nickname_th || "";
      ctx.fillText(name, rx, INFO_BOX.y + 152, maxW);
      // เพศ/อายุ · สูง/หนัก · สัญชาติ (สามบรรทัด เว้นระยะสม่ำเสมอ)
      const age = talent.dob ? calculateAge(talent.dob) : null;
      const lines = [
        genderAgeLabel(talent.gender, age),
        [
          talent.height_cm ? `${talent.height_cm} cm` : null,
          talent.weight_kg ? `${talent.weight_kg} kg` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        talent.nationality ?? "",
      ].filter((l) => l && l.length > 0);
      ctx.font = `400 32px ${F}`;
      lines.forEach((line, i) => {
        ctx.fillText(line, rx, INFO_BOX.y + 208 + i * 44, maxW);
      });
      ctx.textAlign = "left";

      // ===== แถบ CTA ล่าง =====
      const barY = CARD_H - BOTTOM_BAR_H;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, barY, CARD_W, BOTTOM_BAR_H);
      ctx.strokeStyle = "#e5e5e5";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(24, barY);
      ctx.lineTo(CARD_W - 24, barY);
      ctx.stroke();

      // ไอคอนโลโก้แก้มแดง หน้าชื่อแบรนด์ (ถ้ามีไฟล์)
      let brandX = 28;
      if (logo) {
        const ih = 56;
        const iw = logo.naturalWidth * (ih / logo.naturalHeight);
        ctx.drawImage(logo, 28, barY + (BOTTOM_BAR_H - ih) / 2, iw, ih);
        brandX = 28 + iw + 16;
      }
      // แบรนด์ gradient
      const bg = ctx.createLinearGradient(brandX, 0, brandX + 320, 0);
      bg.addColorStop(0, "#1D4ED8");
      bg.addColorStop(1, "#B82233");
      ctx.fillStyle = bg;
      ctx.font = `bold 34px ${F}`;
      ctx.fillText(COMPCARD_CTA.brand, brandX, barY + 53);
      const brandW = ctx.measureText(COMPCARD_CTA.brand).width;
      // tagline + ช่องทางติดต่อ (วางต่อจากชื่อแบรนด์ กัน overlap)
      ctx.fillStyle = "#525252";
      ctx.font = `400 26px ${F}`;
      ctx.fillText(
        `${COMPCARD_CTA.tagline} · ${COMPCARD_CTA.contact}`,
        brandX + brandW + 28,
        barY + 53,
      );
      // เดือน/ปี ขวาสุด
      const stamp = new Date().toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      });
      ctx.fillStyle = "#a3a3a3";
      ctx.font = `400 22px ${F}`;
      ctx.textAlign = "right";
      ctx.fillText(stamp, CARD_W - 28, barY + 52);
      ctx.textAlign = "left";

      const url = canvas.toDataURL("image/jpeg", 0.9);
      setDataUrl(url);
      setPreviewUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างการ์ดไม่สำเร็จ");
    } finally {
      setBuilding(false);
    }
  }, [ready, building, slots, talent]);

  // สร้าง preview อัตโนมัติเมื่อรูปครบ (หน่วงเป็น task ใหม่ — เลี่ยง setState
  // ตรงๆ ใน effect ตามกติกา react-hooks)
  useEffect(() => {
    if (!ready || previewUrl || building) return;
    const t = setTimeout(build, 0);
    return () => clearTimeout(t);
  }, [ready, previewUrl, building, build]);

  async function save() {
    if (!dataUrl || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/compcard-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talent_id: talent.id, data: dataUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "บันทึกไม่สำเร็จ");
      setSavedPath(body.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-400">
        อัพโหลดรูปบังคับให้ครบ 4 ช่องก่อน แล้วระบบจะสร้าง Comp Card ให้อัตโนมัติ
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Comp Card Preview"
            className="w-full rounded-xl border border-neutral-200 shadow-sm"
          />
          <p className="text-center text-[11px] text-neutral-400">
            มือถือ: กดค้างที่รูปเพื่อบันทึกลงเครื่องได้เลย
          </p>
        </>
      ) : (
        <p className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-400">
          {building ? "กำลังสร้าง Comp Card..." : "กำลังเตรียมรูป..."}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!dataUrl || saving}
          className="flex-1 rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
        >
          {saving
            ? "กำลังบันทึก..."
            : savedPath
              ? "บันทึกแล้ว ✓ (กดบันทึกซ้ำได้)"
              : "💾 บันทึกเป็น Comp Card ของโปรไฟล์นี้"}
        </button>
        <button
          type="button"
          onClick={build}
          disabled={building}
          className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
        >
          🔄 สร้างใหม่
        </button>
        {dataUrl && (
          <a
            href={dataUrl}
            download={`Gamdang-CompCard-${talent.code ?? talent.id}.jpg`}
            className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
          >
            ⬇️ ดาวน์โหลด
          </a>
        )}
      </div>

      {savedPath && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ ตั้งเป็น Comp Card ของโปรไฟล์เรียบร้อย — ใช้ตอนเสนอลูกค้าอัตโนมัติ
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
