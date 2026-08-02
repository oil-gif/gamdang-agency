import Link from "next/link";
import { setTalentRating } from "@/actions/talents";
import { LineLinkButton } from "@/components/admin/LineLinkButton";
import { calculateAge } from "@/lib/age";
import { TIER_LABEL } from "@/lib/constants";
import { formatFollowers, topSocial } from "@/lib/social";
import { getPhotoProxyUrl } from "@/lib/storage";

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-700" },
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "ไม่ผ่าน", className: "bg-rose-100 text-rose-700" },
  inactive: { label: "พักการใช้งาน", className: "bg-neutral-200 text-neutral-600" },
};

type Summary = {
  photoCount: number;
  hasCompcard: boolean;
  photoPath: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projects: any[];
};

// แถบสรุปหัวหน้าโปรไฟล์ (หลังบ้าน) — ดูปราดเดียวรู้ว่าโปรไฟล์ครบไหม
// อยู่งานอะไรบ้าง และ tier/ยอดผู้ติดตาม พร้อมปุ่มที่ใช้บ่อย
export function TalentProfileHeader({
  talent,
  summary,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  talent: any;
  summary: Summary;
}) {
  const status = STATUS[talent.status] ?? STATUS.pending;
  const name = talent.nickname_en || talent.nickname_th || talent.code;
  const alt = talent.nickname_en && talent.nickname_th ? talent.nickname_th : null;
  const age = talent.dob ? calculateAge(talent.dob) : null;
  const top = talent.is_influencer ? topSocial(talent) : null;
  const rating: number = talent.rating ?? 0;

  // ข้อมูลที่ยังขาด — โชว์เป็นชิปสีเหลืองให้ตามเก็บ
  const missing = [
    !talent.dob && "วันเกิด",
    !talent.phone && "เบอร์โทร",
    !talent.height_cm && "ส่วนสูง",
    !talent.weight_kg && "น้ำหนัก",
    !talent.nationality && "สัญชาติ",
    summary.photoCount === 0 && "รูปภาพ",
    !summary.hasCompcard && "คอมการ์ด",
  ].filter(Boolean) as string[];

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-5">
        {/* รูปตัวแทน */}
        <div className="size-24 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
          {summary.photoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getPhotoProxyUrl(summary.photoPath, 320)}
              alt={name}
              className="size-full object-cover object-top"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-[11px] text-neutral-400">
              ไม่มีรูป
            </div>
          )}
        </div>

        {/* ชื่อ + ข้อมูลย่อ + ป้าย */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="text-2xl font-bold text-neutral-800">{name}</h1>
            {alt && <span className="text-lg text-neutral-400">/ {alt}</span>}
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-500">
              {talent.code}
            </span>
          </div>

          <p className="mt-1 text-sm text-neutral-500">
            {[
              talent.gender === "male"
                ? "♂ ชาย"
                : talent.gender === "female"
                  ? "♀ หญิง"
                  : talent.gender
                    ? "อื่นๆ"
                    : null,
              age != null ? `${age} ปี` : null,
              talent.height_cm ? `${talent.height_cm} ซม.` : null,
              talent.weight_kg ? `${talent.weight_kg} กก.` : null,
              talent.nationality,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
            >
              {status.label}
            </span>
            {talent.is_model && (
              <span className="rounded-full bg-[#1D4ED8]/10 px-2.5 py-0.5 text-xs font-semibold text-[#1D4ED8]">
                MODEL
              </span>
            )}
            {talent.is_influencer && (
              <span className="rounded-full bg-[#B82233]/10 px-2.5 py-0.5 text-xs font-semibold text-[#B82233]">
                INFLUENCER
              </span>
            )}
            {talent.is_ai_model && (
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                AI MODEL
              </span>
            )}
            {/* Tier + ช่องทางเด่น (Influencer) */}
            {talent.is_influencer && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
                {TIER_LABEL[talent.tier] ?? talent.tier}
                {top ? ` · ${formatFollowers(top.followers)} on ${top.label}` : ""}
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                talent.line_user_id
                  ? "bg-[#06C755]/10 text-[#04863b]"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {talent.line_user_id ? "LINE ✓ ผูกแล้ว" : "ยังไม่ผูก LINE"}
            </span>
          </div>
        </div>

        {/* ปุ่มที่ใช้บ่อย + ดาวจัดอันดับ */}
        <div className="flex shrink-0 flex-col items-stretch gap-2">
          {/* ⭐ ดาวจัดอันดับ — ดันคนเด่น/ผลงานเยอะขึ้นหน้าแรกของ /talents */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">
            <p className="text-[11px] font-semibold text-amber-800">
              ⭐ ดาวจัดอันดับ (ดันขึ้นหน้าแรก)
            </p>
            <div className="mt-1 flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <form key={n} action={setTalentRating}>
                  <input type="hidden" name="id" value={talent.id} />
                  <input type="hidden" name="rating" value={n} />
                  <button
                    type="submit"
                    title={`ให้ ${n} ดาว`}
                    className={`px-0.5 text-xl leading-none transition hover:scale-110 ${
                      n <= rating ? "text-amber-500" : "text-neutral-300"
                    }`}
                  >
                    ★
                  </button>
                </form>
              ))}
              {rating > 0 && (
                <form action={setTalentRating} className="ml-1">
                  <input type="hidden" name="id" value={talent.id} />
                  <input type="hidden" name="rating" value={0} />
                  <button
                    type="submit"
                    className="text-[11px] text-neutral-400 underline hover:text-neutral-600"
                  >
                    ล้าง
                  </button>
                </form>
              )}
            </div>
          </div>
          {summary.photoCount + (summary.hasCompcard ? 1 : 0) > 0 && (
            <a
              href={`/api/talent-photos-zip?talent_id=${talent.id}`}
              className="rounded-full bg-[#1D4ED8] px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              ⬇ บันทึกรูปทั้งหมด
            </a>
          )}
          {!talent.line_user_id && <LineLinkButton talentId={talent.id} />}
        </div>
      </div>

      {/* สถานะความครบ + งานที่เคยอยู่ */}
      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            ความครบของโปรไฟล์
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-md bg-neutral-100 px-2 py-1 font-medium text-neutral-600">
              🖼 รูป {summary.photoCount} รูป
            </span>
            <span
              className={`rounded-md px-2 py-1 font-medium ${
                summary.hasCompcard
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              🪪 คอมการ์ด {summary.hasCompcard ? "✓" : "ยังไม่มี"}
            </span>
            {missing.length === 0 ? (
              <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                ✓ ข้อมูลครบ
              </span>
            ) : (
              <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">
                ขาด: {missing.join(", ")}
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            งานที่เคยอยู่ ({summary.projects.length})
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            {summary.projects.length === 0 ? (
              <span className="text-neutral-400">— ยังไม่เคยอยู่ในงานไหน</span>
            ) : (
              summary.projects.slice(0, 6).map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/projects/${p.id}`}
                  className="rounded-md bg-[#1D4ED8]/5 px-2 py-1 font-medium text-[#1D4ED8] hover:bg-[#1D4ED8]/10"
                >
                  {p.name}
                </Link>
              ))
            )}
            {summary.projects.length > 6 && (
              <span className="px-1 py-1 text-neutral-400">
                +{summary.projects.length - 6} งาน
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
