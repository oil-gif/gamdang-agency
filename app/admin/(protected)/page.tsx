import Link from "next/link";
import {
  deleteStaleTalent,
  getPendingCount,
  getStaleTalents,
  getTalentCounts,
  keepTalent,
} from "@/actions/talents";
import { getProjectCounts } from "@/actions/projects";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const [talentCounts, pendingCount, projectCounts, stale] = await Promise.all([
    getTalentCounts(),
    getPendingCount(),
    getProjectCounts(),
    getStaleTalents(),
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
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-800">Dashboard</h1>

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
                    href={`/admin/talents/${t.id}`}
                    className="font-medium text-neutral-800 hover:text-[#1D4ED8]"
                  >
                    {t.nickname_th ?? t.nickname_en ?? "(ไม่มีชื่อ)"}
                  </Link>
                  <p className="text-xs text-neutral-400">
                    {t.code} · อัพเดทล่าสุด{" "}
                    {new Date(t.updated_at).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <form action={keepTalent}>
                  <input type="hidden" name="id" value={t.id} />
                  <Button type="submit" size="sm" variant="outline">
                    เก็บไว้
                  </Button>
                </form>
                <form action={deleteStaleTalent}>
                  <input type="hidden" name="id" value={t.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    ลบทิ้ง
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
