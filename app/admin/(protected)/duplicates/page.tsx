import Link from "next/link";
import {
  deleteDuplicateTalent,
  getDuplicateTalents,
  getUnlinkedCount,
} from "@/actions/talents";
import { DangerConfirmButton } from "@/components/admin/DangerConfirmButton";
import { FALLBACK_PHRASE, hasDangerCode } from "@/lib/danger";
import { formatThaiDate } from "@/lib/datetime";

// ตรวจข้อมูลซ้ำซ้อน — คนเดิมสมัครหลายรอบ (มักเพราะไม่ได้เชื่อม LINE
// เลยไม่รู้ว่ามีโปรไฟล์อยู่แล้ว) · เกณฑ์: ชื่อเล่น + วันเกิด ตรงกัน
export default async function DuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [groups, unlinked] = await Promise.all([
    getDuplicateTalents(),
    getUnlinkedCount(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">
          🧭 ตรวจข้อมูลซ้ำซ้อน ({groups.length} กลุ่ม)
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          คนที่<b> ชื่อเล่นและวันเกิดตรงกัน</b> — มักเกิดจากคนเดิมสมัครซ้ำเพราะไม่ได้เชื่อม
          LINE เลยไม่รู้ว่ามีโปรไฟล์อยู่แล้ว · เลือกเก็บใบที่ข้อมูลครบที่สุด แล้วลบใบที่ซ้ำ
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* แจ้งเตือนคนที่ยังไม่เชื่อม LINE — ต้นเหตุของการสมัครซ้ำ */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <h2 className="text-lg font-semibold text-amber-800">
          🔗 ยังไม่ได้เชื่อม LINE ({unlinked} คน)
        </h2>
        <p className="mt-1 text-sm text-amber-900/80">
          คนกลุ่มนี้จัดการโปรไฟล์เองไม่ได้และไม่ได้รับแจ้งงานทาง LINE —
          ถ้าสมัครใหม่จะกลายเป็นโปรไฟล์ซ้ำ · เปิดโปรไฟล์แล้วกด{" "}
          <b>&quot;สร้างลิงก์เชื่อม LINE&quot;</b> ส่งให้เขาเปิดในแอป LINE
          (ผูกเข้าโปรไฟล์เดิม ไม่สร้างใหม่)
        </p>
        <Link
          href="/admin/talents?line=unlinked"
          className="mt-3 inline-block rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
        >
          ดูรายชื่อที่ยังไม่เชื่อม LINE →
        </Link>
      </section>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-400">
          ไม่พบโปรไฟล์ซ้ำ 🎉
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section
              key={`${g.name}-${g.dob}`}
              className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="text-lg font-bold text-neutral-800">{g.name}</h3>
                <span className="text-sm text-neutral-500">
                  เกิด {formatThaiDate(g.dob)}
                </span>
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                  ซ้ำ {g.members.length} โปรไฟล์
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {g.members.map((m) => {
                  // คะแนน "ควรเก็บ" — ผูก LINE + มีรูป + มีงาน = ใบที่สมบูรณ์กว่า
                  const score =
                    (m.line_user_id ? 4 : 0) +
                    (m.projects > 0 ? 3 : 0) +
                    (m.hasCompcard ? 2 : 0) +
                    (m.photos > 0 ? 1 : 0);
                  const best = Math.max(
                    ...g.members.map(
                      (x) =>
                        (x.line_user_id ? 4 : 0) +
                        (x.projects > 0 ? 3 : 0) +
                        (x.hasCompcard ? 2 : 0) +
                        (x.photos > 0 ? 1 : 0),
                    ),
                  );
                  const keep = score === best;
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-3.5 ${
                        keep
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "border-neutral-200"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/talents/${m.id}?from=/admin/duplicates`}
                          className="font-semibold text-neutral-800 hover:text-[#1D4ED8] hover:underline"
                        >
                          {m.nickname_en || m.nickname_th}
                        </Link>
                        <span className="font-mono text-[11px] text-neutral-400">
                          {m.code}
                        </span>
                        {keep && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            ✓ แนะนำให้เก็บใบนี้
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        <span
                          className={`rounded px-1.5 py-0.5 font-medium ${
                            m.line_user_id
                              ? "bg-[#06C755]/10 text-[#04863b]"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {m.line_user_id ? "LINE ✓" : "ไม่ผูก LINE"}
                        </span>
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600">
                          🖼 {m.photos} รูป
                        </span>
                        {m.hasCompcard && (
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600">
                            🪪 มีคอมการ์ด
                          </span>
                        )}
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600">
                          🎬 {m.projects} งาน
                        </span>
                        {m.rating > 0 && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">
                            ★ {m.rating}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] text-neutral-400">
                        {m.phone ?? "—"} · สมัคร {formatThaiDate(m.created_at)}
                      </p>

                      <div className="mt-2.5">
                        <DangerConfirmButton
                          action={deleteDuplicateTalent}
                          hiddenFields={{ id: m.id }}
                          label="🗑 ลบใบนี้"
                          title={`ลบโปรไฟล์ "${m.nickname_en || m.nickname_th}" (${m.code}) ถาวร?`}
                          description={`มีรูป ${m.photos} รูป · อยู่ในงาน ${m.projects} งาน${m.line_user_id ? " · ผูก LINE แล้ว" : ""} — ลบแล้วกู้คืนไม่ได้`}
                          confirmLabel="ลบโปรไฟล์ถาวร"
                          needsCode={hasDangerCode()}
                          fallbackPhrase={FALLBACK_PHRASE}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
