import Link from "next/link";
import {
  approveTalent,
  getPendingTalents,
  rejectTalent,
} from "@/actions/talents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateAge } from "@/lib/age";
import { TIER_LABEL } from "@/lib/constants";
import { getPhotoProxyUrl } from "@/lib/storage";

function socialSummary(t: {
  ig_followers: number;
  tiktok_followers: number;
  youtube_followers: number;
  facebook_followers: number;
  lemon8_followers: number;
}) {
  return (
    [
      ["IG", t.ig_followers],
      ["TikTok", t.tiktok_followers],
      ["YT", t.youtube_followers],
      ["FB", t.facebook_followers],
      ["Lemon8", t.lemon8_followers],
    ] as const
  )
    .filter(([, n]) => n > 0)
    .map(([label, n]) => `${label} ${n.toLocaleString()}`)
    .join(" · ");
}

export default async function ApprovalsPage() {
  const talents = await getPendingTalents();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">
          รออนุมัติ ({talents.length})
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          คนที่สมัครเข้ามา (ส่วนใหญ่ผ่าน LINE) รอให้แอดมินตรวจแล้วอนุมัติหรือปฏิเสธ
        </p>
      </div>

      {talents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-400">
          ไม่มีใครรออนุมัติ 🎉
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {talents.map((t) => {
            const social = socialSummary(t);
            return (
              <div
                key={t.id}
                className="flex gap-4 rounded-xl border bg-white p-4 shadow-sm"
              >
                <div className="size-28 shrink-0 overflow-hidden rounded-lg border bg-neutral-100">
                  {t.compcard_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPhotoProxyUrl(t.compcard_path)}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-neutral-400">
                      ไม่มีรูป
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-neutral-400">
                      {t.code}
                    </span>
                    {t.is_model && <Badge variant="secondary">Model</Badge>}
                    {t.is_influencer && (
                      <Badge variant="secondary">Influencer</Badge>
                    )}
                  </div>
                  <Link
                    href={`/admin/talents/${t.id}`}
                    className="mt-0.5 truncate text-lg font-semibold text-neutral-800 hover:text-[#1D4ED8]"
                  >
                    {t.nickname_en || t.nickname_th || t.line_display_name || "(ไม่มีชื่อ)"}
                  </Link>
                  <div className="mt-1 space-y-0.5 text-sm text-neutral-500">
                    <p>
                      {t.dob ? `${calculateAge(t.dob)} ปี` : "อายุ -"}
                      {t.height_cm ? ` · ${t.height_cm} ซม.` : ""}
                      {t.is_influencer ? ` · ${TIER_LABEL[t.tier] ?? t.tier}` : ""}
                    </p>
                    {t.phone && <p>📞 {t.phone}</p>}
                    {social && <p className="truncate">{social}</p>}
                  </div>

                  <div className="mt-auto flex gap-2 pt-3">
                    <form action={approveTalent}>
                      <input type="hidden" name="id" value={t.id} />
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        อนุมัติ
                      </Button>
                    </form>
                    <form action={rejectTalent}>
                      <input type="hidden" name="id" value={t.id} />
                      <Button type="submit" size="sm" variant="outline">
                        ปฏิเสธ
                      </Button>
                    </form>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/talents/${t.id}`}>ดูข้อมูล</Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
