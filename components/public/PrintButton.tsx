"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      บันทึกเป็น PDF / พิมพ์
    </button>
  );
}
