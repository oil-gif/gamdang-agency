"use client";

import { deleteTalent } from "@/actions/talents";

// ปุ่มลบ talent จากหน้า list — ถามยืนยันก่อนเสมอ (ลบถาวร กู้คืนไม่ได้)
export function DeleteTalentButton({
  id,
  name,
  code,
}: {
  id: string;
  name: string;
  code?: string | null;
}) {
  return (
    <form
      action={deleteTalent}
      onSubmit={(e) => {
        const label = code ? `${name} (${code})` : name;
        if (
          !window.confirm(
            `ลบ "${label}" ออกจากระบบถาวร?\n\nรูปและข้อมูลทั้งหมดจะถูกลบ กู้คืนไม่ได้`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title="ลบ Talent"
        aria-label="ลบ Talent"
        className="flex size-8 items-center justify-center rounded-full text-neutral-300 transition hover:bg-rose-50 hover:text-rose-600"
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M8 6V4h8v2m-9 0v14a1 1 0 001 1h8a1 1 0 001-1V6M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}
