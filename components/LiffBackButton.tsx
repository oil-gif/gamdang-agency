"use client";

import { MAIN_SITE_URL } from "@/lib/site";

// ปุ่ม "← กลับ" สำหรับหน้า LIFF — ปิดหน้าต่าง LIFF กลับไปแชท LINE (native)
// ถ้าไม่ได้เปิดในแอป LINE (เช่นทดสอบใน browser) fallback ไปเว็บหลัก
export function LiffBackButton({
  liffId,
  tone = "light",
  className = "",
}: {
  liffId?: string;
  tone?: "light" | "onDark";
  className?: string;
}) {
  async function handleBack() {
    try {
      const { default: liff } = await import("@line/liff");
      if (liffId) await liff.init({ liffId });
      if (liff.isInClient()) {
        liff.closeWindow();
        return;
      }
    } catch {
      /* ยังไม่ได้เปิดใน LINE — ตกไป fallback */
    }
    window.location.href = MAIN_SITE_URL;
  }

  const styles =
    tone === "onDark"
      ? "text-white/80 hover:text-white hover:bg-white/10"
      : "border border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800";

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${styles} ${className}`}
    >
      <span aria-hidden>←</span> กลับ
    </button>
  );
}
