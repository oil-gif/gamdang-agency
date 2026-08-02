import Link from "next/link";

// ตัวเลื่อนหน้าแบบเลือกหน้าได้ — มีปุ่มหน้าแรก/หน้าสุดท้าย + เลขหน้า
// (เดิมมีแค่ ← ก่อนหน้า / ถัดไป → พอหน้าเยอะเลื่อนทีละหน้าเสียเวลา)
// ใช้ได้ทั้งหน้าสาธารณะและหลังบ้าน — ส่ง hrefFor เพื่อคงตัวกรองเดิมไว้
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  // โชว์เลขหน้ารอบๆ หน้าปัจจุบัน (สูงสุด 5 เลข) + หน้าแรก/สุดท้ายเสมอ
  const window = 2;
  const nums: number[] = [];
  for (
    let p = Math.max(1, page - window);
    p <= Math.min(totalPages, page + window);
    p++
  ) {
    nums.push(p);
  }
  const showFirst = nums[0] > 1;
  const showLast = nums[nums.length - 1] < totalPages;

  const box =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition";
  const idle =
    "border-neutral-300 bg-white text-neutral-600 hover:border-[#1D4ED8] hover:text-[#1D4ED8]";
  const current = "border-[#1D4ED8] bg-[#1D4ED8] text-white";
  const disabled = "border-neutral-200 bg-neutral-50 text-neutral-300";

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1.5 print:hidden"
      aria-label="เลื่อนหน้า"
    >
      {page > 1 ? (
        <>
          <Link href={hrefFor(1)} className={`${box} ${idle}`} title="หน้าแรก">
            «
          </Link>
          <Link
            href={hrefFor(page - 1)}
            className={`${box} ${idle}`}
            title="ก่อนหน้า"
          >
            ←
          </Link>
        </>
      ) : (
        <>
          <span className={`${box} ${disabled}`}>«</span>
          <span className={`${box} ${disabled}`}>←</span>
        </>
      )}

      {showFirst && (
        <>
          <Link href={hrefFor(1)} className={`${box} ${idle}`}>
            1
          </Link>
          {nums[0] > 2 && <span className="px-1 text-neutral-400">…</span>}
        </>
      )}

      {nums.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          aria-current={p === page ? "page" : undefined}
          className={`${box} ${p === page ? current : idle}`}
        >
          {p}
        </Link>
      ))}

      {showLast && (
        <>
          {nums[nums.length - 1] < totalPages - 1 && (
            <span className="px-1 text-neutral-400">…</span>
          )}
          <Link href={hrefFor(totalPages)} className={`${box} ${idle}`}>
            {totalPages}
          </Link>
        </>
      )}

      {page < totalPages ? (
        <>
          <Link
            href={hrefFor(page + 1)}
            className={`${box} ${idle}`}
            title="ถัดไป"
          >
            →
          </Link>
          <Link
            href={hrefFor(totalPages)}
            className={`${box} ${idle}`}
            title="หน้าสุดท้าย"
          >
            »
          </Link>
        </>
      ) : (
        <>
          <span className={`${box} ${disabled}`}>→</span>
          <span className={`${box} ${disabled}`}>»</span>
        </>
      )}

      <span className="ml-2 text-sm text-neutral-400">
        หน้า {page} / {totalPages}
      </span>
    </nav>
  );
}
