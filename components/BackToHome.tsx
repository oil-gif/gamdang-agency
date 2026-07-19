import { MAIN_SITE_URL } from "@/lib/site";

// ปุ่ม "← กลับหน้าหลัก" ลิงก์ไปเว็บหลัก WordPress — ใช้ทุกหน้าของแอป
// tone: "light" = พื้นสว่าง (ตัวอักษรเข้ม) · "onDark" = พื้นเข้ม (ตัวอักษรขาว)
export function BackToHome({
  tone = "light",
  className = "",
  label = "กลับหน้าหลัก",
}: {
  tone?: "light" | "onDark";
  className?: string;
  label?: string;
}) {
  const styles =
    tone === "onDark"
      ? "text-white/80 hover:text-white hover:bg-white/10"
      : "border border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800";
  return (
    <a
      href={MAIN_SITE_URL}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${styles} ${className}`}
    >
      <span aria-hidden>←</span> {label}
    </a>
  );
}
