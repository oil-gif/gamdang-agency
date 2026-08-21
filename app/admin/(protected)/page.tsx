import Link from "next/link";
import {
  approveDeletion,
  deleteStaleTalent,
  getAwaitingCompcardCount,
  getDuplicateCount,
  getUnlinkedCount,
  getDeletionRequests,
  getPendingCount,
  getStaleTalents,
  getTalentCounts,
  keepTalent,
  rejectDeletionRequest,
} from "@/actions/talents";
import { getProjectCounts } from "@/actions/projects";
import { getBookingPendingCount } from "@/actions/shoots";
import { Button } from "@/components/ui/button";
import { formatThaiDate } from "@/lib/datetime";
import { DangerConfirmButton } from "@/components/admin/DangerConfirmButton";
import { FALLBACK_PHRASE, hasDangerCode } from "@/lib/danger";
import { getLineQuotas, QUOTA_WARN_AT } from "@/lib/line-quota";

export default async function AdminDashboardPage() {
  const [
    talentCounts,
    pendingCount,
    projectCounts,
    bookingPending,
    stale,
    deletionRequests,
    awaitingCompcards,
    duplicates,
    unlinked,
    lineQuotas,
  ] = await Promise.all([
    getTalentCounts(),
    getPendingCount(),
    getProjectCounts(),
    getBookingPendingCount(),
    getStaleTalents(),
    getDeletionRequests(),
    getAwaitingCompcardCount(),
    getDuplicateCount(),
    getUnlinkedCount(),
    getLineQuotas(),
  ]);

  const stats = [
    {
      label: "Talent ทั้งหมด",
      value: talentCounts.total,
      href: "/admin/talents",
      accent: "text-[#1D4ED8]",
    },
    {
      label: "อนุมัติแล้ว (Active)",
      value: talentCounts.active,
      href: "/admin/talents?status=active",
      accent: "text-emerald-600",
    },
    {
      label: "รออนุมัติ",
      value: pendingCount,
      href: "/admin/approvals",
      accent: "text-amber-500",
    },
    {
      label: "โปรเจกต์ทั้งหมด",
      value: projectCounts.total,
      href: "/admin/projects",
      accent: "text-neutral-800",
    },
    {
      label: "งาน Model",
      value: projectCounts.model,
      href: "/admin/projects?type=model",
      accent: "text-[#1D4ED8]",
    },
    {
      label: "งาน Influencer",
      value: projectCounts.influencer,
      href: "/admin/projects?type=influencer",
      accent: "text-[#B82233]",
    },
    {
      label: "จองถ่าย — สลิปรอตรวจ",
      value: bookingPending,
      href: "/admin/shoots",
      accent: "text-amber-500",
    },
    {
      label: "รอคอมการ์ดจากแก้มแดง",
      value: awaitingCompcards,
      href: "/admin/compcards",
      accent: "text-amber-500",
    },
    {
      label: "โปรไฟล์ซ้ำซ้อน",
      value: duplicates,
      href: "/admin/duplicates",
      accent: "text-rose-600",
    },
    {
      label: "ยังไม่เชื่อม LINE",
      value: unlinked,
      href: "/admin/talents?line=unlinked",
      accent: "text-amber-500",
    },
    {
      label: "คำขอลบประวัติ",
      value: deletionRequests.length,
      href: "#deletion-requests",
      accent: "text-rose-600",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-800">Dashboard</h1>

      {/* โควตาข้อความ LINE — แพ็กเกจฟรี 300 ข้อความ/เดือน/บัญชี พอเต็มแล้ว
          ข้อความยืนยันการจอง/แจ้งงานจะเงียบหายไปเฉยๆ โดยไม่มีอะไรฟ้อง
          (เคยเต็มทั้ง 3 บัญชีพร้อมกัน 2026-08-21 กว่าจะรู้ตัวก็หลายวัน) */}
      {lineQuotas.some((q) => q.ok && q.remaining !== null && q.remaining <= QUOTA_WARN_AT) && (
        <section
          className={`rounded-2xl border-2 p-4 ${
            lineQuotas.some((q) => q.remaining === 0)
              ? "border-rose-300 bg-rose-50"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <p className="text-sm font-bold text-neutral-800">
            {lineQuotas.some((q) => q.remaining === 0)
              ? "🔴 โควตาข้อความ LINE เต็มแล้ว — ข้อความแจ้งเตือนส่งไม่ออก"
              : "⚠️ โควตาข้อความ LINE ใกล้เต็ม"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lineQuotas.map((q) => (
              <span
                key={q.label}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  !q.ok || q.remaining === null
                    ? "bg-neutral-100 text-neutral-500"
                    : q.remaining === 0
                      ? "bg-rose-600 text-white"
                      : q.remaining <= QUOTA_WARN_AT
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {q.label}:{" "}
                {!q.ok
                  ? "เช็คไม่ได้"
                  : q.remaining === null
                    ? "ไม่จำกัด ✓"
                    : `เหลือ ${q.remaining} / ${q.limit}`}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-600">
            โควตารีเซ็ตอัตโนมัติต้นเดือนหน้า · ต้องการเพิ่มให้อัปเกรดแพ็กเกจที่{" "}
            <a
              href="https://manager.line.biz"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#1D4ED8] underline"
            >
              LINE OA Manager
            </a>{" "}
            · ระหว่างนี้ถ้ากดอนุมัติการจองแล้วขึ้นเตือน ต้องทักลูกค้าเองนะคะ
          </p>
        </section>
      )}

      {/* สถิติรวม (count-only queries — เร็วแม้ข้อมูลหลักหมื่น) */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-[#1D4ED8]/40 hover:shadow-md"
          >
            <p className={`text-3xl font-bold ${s.accent}`}>{s.value}</p>
            <p className="mt-1 text-sm text-neutral-500">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* คำขอลบประวัติจาก talent (self-service) — แอดมิน approve ลบถาวร */}
      <section
        id="deletion-requests"
        className="scroll-mt-20 rounded-2xl border border-rose-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-rose-600">
          🗑️ คำขอลบประวัติ ({deletionRequests.length})
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Talent กดขอลบประวัติเอง — โปรไฟล์ถูกซ่อนจากหน้าสาธารณะแล้ว เลือก
          &quot;ลบถาวร&quot; (ลบข้อมูล+รูปออกจากระบบ กู้คืนไม่ได้) หรือ &quot;ยกเลิกคำขอ&quot;
          (คืนสภาพให้ talent ใช้งานต่อ)
        </p>

        {deletionRequests.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-400">
            ไม่มีคำขอลบประวัติ ✓
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {deletionRequests.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/talents/${t.id}?from=/admin`}
                    className="font-medium text-neutral-800 hover:text-[#1D4ED8]"
                  >
                    {t.nickname_en ?? t.nickname_th ?? "(ไม่มีชื่อ)"}
                  </Link>
                  <p className="text-xs text-neutral-400">
                    {t.code} · ขอลบเมื่อ{" "}
                    {t.deletion_requested_at
                      ? formatThaiDate(t.deletion_requested_at)
                      : "-"}
                  </p>
                </div>
                <form action={rejectDeletionRequest}>
                  <input type="hidden" name="id" value={t.id} />
                  <Button type="submit" size="sm" variant="outline">
                    ยกเลิกคำขอ
                  </Button>
                </form>
                <DangerConfirmButton
                  action={approveDeletion}
                  hiddenFields={{ id: t.id }}
                  label="ลบถาวร"
                  title={`ลบประวัติ "${t.nickname_en ?? t.nickname_th ?? t.code}" ถาวร?`}
                  description="ข้อมูลและรูปทั้งหมดจะถูกลบออกจากระบบตามคำขอของเจ้าตัว — กู้คืนไม่ได้"
                  confirmLabel="ลบประวัติถาวร"
                  needsCode={hasDangerCode()}
                  fallbackPhrase={FALLBACK_PHRASE}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cleanup: ไม่มีการอัพเดทเกิน 3 ปี */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1D4ED8]">
          🧹 Cleanup — ไม่มีการอัพเดทเกิน 3 ปี ({stale.length})
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Talent ที่ไม่มีการแก้ไขข้อมูลเลย (ทั้งฝั่งเราและฝั่ง talent) นานเกิน 3 ปี —
          เลือกได้ว่าจะลบทิ้งหรือเก็บไว้ (กด &quot;เก็บไว้&quot; จะเริ่มนับใหม่)
        </p>

        {stale.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-400">
            ไม่มีข้อมูลค้างเก่า — ทุกคนอัพเดทภายใน 3 ปี ✓
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {stale.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 p-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/talents/${t.id}?from=/admin`}
                    className="font-medium text-neutral-800 hover:text-[#1D4ED8]"
                  >
                    {t.nickname_en ?? t.nickname_th ?? "(ไม่มีชื่อ)"}
                  </Link>
                  <p className="text-xs text-neutral-400">
                    {t.code} · อัพเดทล่าสุด{" "}
                    {formatThaiDate(t.updated_at)}
                  </p>
                </div>
                <form action={keepTalent}>
                  <input type="hidden" name="id" value={t.id} />
                  <Button type="submit" size="sm" variant="outline">
                    เก็บไว้
                  </Button>
                </form>
                <DangerConfirmButton
                  action={deleteStaleTalent}
                  hiddenFields={{ id: t.id }}
                  label="ลบทิ้ง"
                  title={`ลบประวัติ "${t.nickname_en ?? t.nickname_th ?? t.code}" ถาวร?`}
                  description="โปรไฟล์ที่ไม่มีการอัพเดทเกิน 3 ปี — ลบแล้วกู้คืนไม่ได้"
                  confirmLabel="ลบประวัติถาวร"
                  needsCode={hasDangerCode()}
                  fallbackPhrase={FALLBACK_PHRASE}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
