import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwnedTalent } from "@/actions/talents";
import { ConfirmStep } from "@/components/compcard/ConfirmStep";
import { ModelPhotoStep } from "@/components/compcard/ModelPhotoStep";
import { SinglePhotoUpload } from "@/components/compcard/SinglePhotoUpload";
import { TalentForm } from "@/components/talent/TalentForm";
import { getTalentSession } from "@/lib/auth/talent-session";
import { REQUIRED_SLOTS } from "@/lib/compcard";
import { formatFollowers, topSocial } from "@/lib/social";
import { supabase } from "@/lib/supabase/server";

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-700" },
  active: { label: "อนุมัติแล้ว", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "ไม่ผ่าน", className: "bg-rose-100 text-rose-700" },
  inactive: { label: "พักการใช้งาน", className: "bg-neutral-200 text-neutral-600" },
};

const STEPS = [
  { n: 1, label: "ข้อมูล" },
  { n: 2, label: "รูปถ่าย" },
  { n: 3, label: "ยืนยัน" },
];

export default async function ApplyEditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; step?: string; error?: string; saved?: string }>;
}) {
  const session = await getTalentSession();
  if (!session) redirect("/apply");

  const { id, step: stepRaw, error, saved } = await searchParams;
  // มี id → ต้องเป็นโปรไฟล์ของบัญชี LINE นี้จริง (กันแก้ข้ามบัญชี)
  // ไม่มี id → โหมด "เพิ่มโปรไฟล์ใหม่" ยังไม่สร้าง row จนกว่าจะกดบันทึก
  const talent = id ? await getOwnedTalent(id) : null;
  if (id && !talent) redirect("/apply/profiles");

  const isNew = !talent;
  let step = Math.min(3, Math.max(1, parseInt(stepRaw ?? "1", 10) || 1));
  if (isNew) step = 1;

  // ===== แยกเส้นทางตามบทบาท =====
  // Influencer ล้วน → อัพรูปเดียว · Model → คอมการ์ดใหม่ หรือคอมการ์ดแก้มแดงเดิม
  const isModel = talent?.is_model === true;
  const isInfluencer = talent?.is_influencer === true;
  const influencerOnly = isInfluencer && !isModel;
  const slots: Record<string, string> = (talent?.compcard_slots ?? {}) as Record<
    string,
    string
  >;
  const hasRequiredSlots = REQUIRED_SLOTS.every((k) => slots[k]);
  const singlePath = slots.single ?? null;

  // คอมการ์ดที่อัพไว้ (legacy) — ใช้เช็ค gate + โชว์ตอนยืนยัน
  let compcardPath: string | null = null;
  if (talent && !isNew) {
    const { data: cc } = await supabase
      .from("talent_photos")
      .select("storage_path")
      .eq("talent_id", talent.id)
      .eq("kind", "compcard")
      .maybeSingle();
    compcardPath = cc?.storage_path ?? null;
  }

  // "รอคอมการ์ดจากแก้มแดง" (เพิ่งจองถ่าย ยังไม่มีคอมการ์ด) — migration 018
  const awaitingCompcard = !!(talent as { compcard_awaiting_at?: string | null })
    ?.compcard_awaiting_at;

  // variant ตอนยืนยัน: influencer / compcard(สร้างใหม่) / legacy(อัพเดิม) /
  // awaiting(รอคอมการ์ด — โชว์รูปหลัก + บอกว่ากำลังรอ)
  const variant: "compcard" | "legacy" | "influencer" | "awaiting" = influencerOnly
    ? "influencer"
    : hasRequiredSlots
      ? "compcard"
      : compcardPath
        ? "legacy"
        : awaitingCompcard
          ? "awaiting"
          : "compcard";

  // gate ก่อนไปหน้ายืนยัน (step 3)
  // legacy ต้องมี "รูปหลัก" (singlePath) ด้วย — ใช้เป็นการ์ดหน้าบ้านแทนคอมการ์ด
  // awaiting ใช้รูปหลัก 1 รูปพอ (คอมการ์ดค่อยตามมาทีหลัง)
  const gateOk = influencerOnly
    ? !!singlePath
    : hasRequiredSlots ||
      (!!compcardPath && !!singlePath) ||
      (awaitingCompcard && !!singlePath);
  if (step === 3 && !gateOk) {
    const msg = influencerOnly
      ? "อัพโหลดรูปโปรไฟล์ก่อนค่ะ"
      : awaitingCompcard
        ? "อัพโหลดรูปหลัก 1 รูปก่อนค่ะ"
        : "อัพโหลดรูปให้ครบก่อนค่ะ (คอมการ์ดใหม่ 4 รูป · หรือคอมการ์ดแก้มแดงเดิม + รูปหลัก 1 รูป · หรือเลือก 'รอคอมการ์ด' แล้วอัพรูปหลัก 1 รูป)";
    redirect(`/apply/edit?id=${id}&step=2&error=${encodeURIComponent(msg)}`);
  }

  const status = talent ? (STATUS[talent.status] ?? STATUS.pending) : null;
  const displayName = isNew
    ? "โปรไฟล์ใหม่"
    : talent!.nickname_en || talent!.nickname_th || "โปรไฟล์ใหม่";
  const avatarUrl = talent?.line_picture_url ?? session.linePicture;

  const top = talent?.is_influencer ? topSocial(talent) : null;
  const topSocialText = top
    ? `${formatFollowers(top.followers)} on ${top.label}`
    : null;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Brand header */}
      <header className="bg-gradient-to-br from-[#1D4ED8] to-[#B82233] px-4 pb-6 pt-5 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/apply/profiles"
            className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white"
          >
            ← โปรไฟล์ทั้งหมดของฉัน
          </Link>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-full border-2 border-white/70 bg-white/20">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  fill
                  sizes="3.5rem"
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
              <p className="text-sm text-white/80">
                {isNew ? "สมัคร/เพิ่มโปรไฟล์ใหม่" : "โปรไฟล์นักแสดง"}
              </p>
              <h1 className="truncate text-xl font-bold">{displayName}</h1>
              {!isNew && (
                <div className="mt-1 flex items-center gap-2">
                  {talent!.code && (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                      {talent!.code}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${status!.className}`}
                  >
                    {status!.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Step indicator */}
          <div className="mt-5 flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                      step >= s.n
                        ? "bg-white text-[#1D4ED8]"
                        : "bg-white/25 text-white/70"
                    }`}
                  >
                    {step > s.n ? "✓" : s.n}
                  </span>
                  <span className="mt-1 text-[11px] text-white/85">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 mb-4 h-0.5 flex-1 rounded ${step > s.n ? "bg-white" : "bg-white/25"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-24 pt-5">
        {saved && step === 2 && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✓ บันทึกข้อมูลแล้ว — ต่อไปอัพโหลดรูปค่ะ
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            {isNew && (
              <div className="rounded-2xl border border-dashed border-[#1D4ED8]/30 bg-[#1D4ED8]/5 px-4 py-3 text-sm text-neutral-600">
                📝 กรอกข้อมูล + กด <b>บันทึก</b> แล้วไปขั้นตอนอัพโหลดรูปต่อได้เลยค่ะ
              </div>
            )}
            <TalentForm talent={talent ?? undefined} mode="self" />
          </>
        )}

        {step === 2 && !isNew && (
          <>
            {influencerOnly ? (
              <SinglePhotoUpload talentId={talent!.id} initialPath={singlePath} />
            ) : (
              <ModelPhotoStep
                talentId={talent!.id}
                initialSlots={slots}
                initialMode={
                  compcardPath && !hasRequiredSlots
                    ? "legacy"
                    : awaitingCompcard && !hasRequiredSlots
                      ? "awaiting"
                      : "new"
                }
                legacyCode={
                  (talent as { legacy_code?: string | null }).legacy_code ?? null
                }
                legacyPath={compcardPath}
                legacySinglePath={singlePath}
              />
            )}
            <div className="flex gap-3">
              <Link
                href={`/apply/edit?id=${id}&step=1`}
                className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-600"
              >
                ← ย้อนกลับ
              </Link>
              <Link
                href={`/apply/edit?id=${id}&step=3`}
                className="flex-1 rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] py-3 text-center text-sm font-bold text-white shadow-md transition hover:opacity-95"
              >
                ถัดไป: ยืนยันข้อมูล →
              </Link>
            </div>
            <p className="text-center text-xs text-neutral-400">
              {influencerOnly
                ? "อัพโหลดรูปโปรไฟล์ก่อน ถึงจะไปขั้นตอนยืนยันได้"
                : "ทำคอมการ์ดใหม่ครบ 4 รูป · หรืออัพคอมการ์ดเดิม + รูปหลัก · หรือเลือก “รอคอมการ์ด” แล้วอัพรูปหลัก 1 รูป"}
            </p>
          </>
        )}

        {step === 3 && !isNew && (
          <ConfirmStep
            talent={talent!}
            slots={slots}
            backHref={`/apply/edit?id=${id}&step=2`}
            doneHref="/apply/profiles"
            isInfluencer={isInfluencer}
            topSocialText={topSocialText}
            expertise={(talent!.categories ?? []) as string[]}
            variant={variant}
            compcardPath={compcardPath}
            singlePhotoPath={singlePath}
          />
        )}
      </main>
    </div>
  );
}
