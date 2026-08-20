"use client";

// กล่องแจ้ง error ของการอัพรูป — ถ้าเป็นเคส "เซสชันหมดอายุ" จะมีปุ่มพากลับไป
// เข้าสู่ระบบให้เลย แล้วเด้งกลับมาหน้าเดิม
//
// ที่ต้องมี: ตั้งแต่ปิดช่องโหว่ (2026-08-20) API จะตอบ 401 เมื่อไม่มีเซสชัน
// ถ้าโชว์แค่ข้อความ น้องๆ จะไม่รู้ว่าต้องทำยังไงต่อ
export function UploadError({ message }: { message: string | null }) {
  if (!message) return null;
  // ข้อความนี้มาจาก lib/auth/upload-guard.ts (401 = ยังไม่ได้เข้าสู่ระบบ)
  const needsLogin = message.includes("เข้าสู่ระบบ");

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <p>{message}</p>
      {needsLogin && (
        <>
          <p className="mt-1 text-xs text-rose-600">
            เข้าสู่ระบบครั้งล่าสุดนานเกิน 30 วัน — กดปุ่มด้านล่างแล้วระบบจะพากลับมาหน้านี้ให้ค่ะ
            <span className="mt-0.5 block text-rose-500">
              (Your session expired — sign in again to continue)
            </span>
          </p>
          <a
            href={`/apply?next=${encodeURIComponent(
              typeof window === "undefined"
                ? "/apply/profiles"
                : window.location.pathname + window.location.search,
            )}`}
            className="mt-2 inline-block rounded-full bg-[#06C755] px-5 py-2 text-sm font-bold text-white"
          >
            เข้าสู่ระบบใหม่ (Sign in again)
          </a>
        </>
      )}
    </div>
  );
}
