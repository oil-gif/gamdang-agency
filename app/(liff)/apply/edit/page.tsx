import Image from "next/image";
import { redirect } from "next/navigation";
import { getTalent } from "@/actions/talents";
import { TalentForm } from "@/components/talent/TalentForm";
import { TalentPhotos } from "@/components/talent/TalentPhotos";
import { getTalentSession } from "@/lib/auth/talent-session";

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-700" },
  active: { label: "อนุมัติแล้ว", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "ไม่ผ่าน", className: "bg-rose-100 text-rose-700" },
  inactive: { label: "พักการใช้งาน", className: "bg-neutral-200 text-neutral-600" },
};

export default async function ApplyEditPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await getTalentSession();
  if (!session) redirect("/apply");

  const { error, saved } = await searchParams;
  const talent = await getTalent(session.talentId);
  const status = STATUS[talent.status] ?? STATUS.pending;
  const displayName =
    talent.nickname_th || talent.line_display_name || "ยินดีต้อนรับ";

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Brand header */}
      <header className="bg-gradient-to-br from-[#1D4ED8] to-[#B82233] px-4 pb-8 pt-7 text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full border-2 border-white/70 bg-white/20">
            {talent.line_picture_url ? (
              <Image
                src={talent.line_picture_url}
                alt=""
                fill
                sizes="4rem"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex size-full items-center justify-center text-2xl font-semibold">
                {displayName.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white/80">โปรไฟล์ของฉัน</p>
            <h1 className="truncate text-xl font-bold">{displayName}</h1>
            <div className="mt-1.5 flex items-center gap-2">
              {talent.code && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                  {talent.code}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-24 pt-5">
        {saved && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            บันทึกข้อมูลเรียบร้อยแล้ว
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <TalentPhotos talentId={session.talentId} />
        <TalentForm talent={talent} mode="self" />
      </main>
    </div>
  );
}
