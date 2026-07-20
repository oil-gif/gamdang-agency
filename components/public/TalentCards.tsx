import { toggleClientInterest } from "@/actions/client-selection";
import { SocialIcon } from "@/components/SocialIcon";
import { calculateAge } from "@/lib/age";
import { ETHNICITIES, TIER_LABEL } from "@/lib/constants";
import { formatFollowers, talentSocials, topSocial } from "@/lib/social";
import { getPhotoProxyUrl } from "@/lib/storage";

const ETHNICITY_LABEL: Record<string, string> = Object.fromEntries(
  ETHNICITIES.map((e) => [e.value, e.label]),
);

// Shape produced by getProjectTalents(): the join row + talent + photo paths.
export type ProjectTalentCard = {
  id: string;
  card_type: string;
  client_interested?: boolean | null;
  compcard_path: string | null;
  gallery_paths: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  talent: any;
};

// ปุ่ม "สนใจ" สำหรับลูกค้าบนหน้า /p/[token] — render เฉพาะเมื่อหน้านั้นส่ง
// token มาให้ (หน้า admin/print ไม่ส่ง → ไม่มีปุ่ม)
function InterestButton({
  token,
  ptId,
  interested,
  className = "",
}: {
  token: string;
  ptId: string;
  interested: boolean;
  className?: string;
}) {
  return (
    <form action={toggleClientInterest} className={className}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="pt_id" value={ptId} />
      <button
        type="submit"
        className={`w-full rounded-full px-5 py-2 text-sm font-semibold transition ${
          interested
            ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
            : "border border-neutral-300 bg-white text-neutral-600 hover:border-emerald-500 hover:text-emerald-600"
        }`}
      >
        {interested ? "✓ เลือกแล้ว (Selected)" : "+ สนใจคนนี้ (Select)"}
      </button>
    </form>
  );
}

export function ethnicityText(t: { ethnicities?: string[] | null }) {
  const list = (t.ethnicities ?? []) as string[];
  return list.length > 0
    ? list.map((e) => ETHNICITY_LABEL[e] ?? e).join(" / ")
    : null;
}

/**
 * งาน Model — full landscape comp card with a fact bar underneath.
 * ส่ง selectToken มาเมื่ออยากให้มีปุ่ม "สนใจ" สำหรับลูกค้า (เฉพาะ /p/[token])
 */
export function ModelCard({
  pt,
  selectToken,
}: {
  pt: ProjectTalentCard;
  selectToken?: string;
}) {
  const t = pt.talent;
  const displayName = t.nickname_en || t.nickname_th || t.code;
  const img = pt.compcard_path ?? pt.gallery_paths[0] ?? null;
  const interested = pt.client_interested === true;
  const facts = [
    t.dob ? `อายุ ${calculateAge(t.dob)} ปี` : null,
    t.height_cm ? `สูง ${t.height_cm} ซม.` : null,
    t.weight_kg ? `หนัก ${t.weight_kg} กก.` : null,
    ethnicityText(t),
  ].filter(Boolean) as string[];

  return (
    <article
      className={`print-break overflow-hidden rounded-2xl border bg-white shadow-sm ${
        selectToken && interested
          ? "border-emerald-500 ring-2 ring-emerald-500/40"
          : "border-neutral-200"
      }`}
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getPhotoProxyUrl(img)}
          alt={displayName}
          className={
            pt.compcard_path ? "w-full object-cover" : "max-h-[520px] w-full object-cover"
          }
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-neutral-100 text-sm text-neutral-400">
          ไม่มีรูป
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-5">
        <div className="mr-auto">
          <h2 className="text-xl font-bold text-neutral-800">{displayName}</h2>
          <p className="font-mono text-xs text-neutral-400">
            {t.code}
            {t.nickname_en && t.nickname_th ? ` · ${t.nickname_th}` : ""}
          </p>
        </div>
        {facts.map((f) => (
          <span
            key={f}
            className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600"
          >
            {f}
          </span>
        ))}
        {selectToken && (
          <InterestButton
            token={selectToken}
            ptId={pt.id}
            interested={interested}
            className="w-full pt-1 sm:w-auto sm:pt-0"
          />
        )}
      </div>
    </article>
  );
}

/**
 * งาน Influencer — compact vertical card (แบบตัวอย่างที่พี่ส่งมา):
 * circular photo, name, tier pill, Max Followers / Age rows, expertise
 * chips, clickable social icon buttons.
 */
export function InfluCard({
  pt,
  selectToken,
}: {
  pt: ProjectTalentCard;
  selectToken?: string;
}) {
  const t = pt.talent;
  const displayName = t.nickname_en || t.nickname_th || t.code;
  const img = pt.gallery_paths[0] ?? pt.compcard_path ?? null;
  const interested = pt.client_interested === true;
  const top = topSocial(t);
  const socials = talentSocials(t);
  const expertise = (t.categories ?? []) as string[];

  return (
    <article
      className={`print-break flex flex-col items-center rounded-2xl border bg-white p-5 text-center shadow-sm ${
        selectToken && interested
          ? "border-emerald-500 ring-2 ring-emerald-500/40"
          : "border-neutral-200"
      }`}
    >
      <div className="size-28 overflow-hidden rounded-full border-2 border-[#1D4ED8]/15 bg-neutral-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getPhotoProxyUrl(img)}
            alt={displayName}
            className="size-full object-cover object-top"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-neutral-400">
            ไม่มีรูป
          </div>
        )}
      </div>

      <h2 className="mt-3 text-lg font-bold leading-tight text-neutral-800">
        {displayName}
      </h2>
      <p className="font-mono text-[11px] text-neutral-400">{t.code}</p>
      <span className="mt-1.5 rounded-full bg-[#1D4ED8]/10 px-3 py-0.5 text-xs font-semibold text-[#1D4ED8]">
        {TIER_LABEL[t.tier] ?? t.tier}
      </span>

      <div className="mt-4 w-full space-y-1 border-t border-neutral-100 pt-3 text-sm">
        {top && (
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Max Followers</span>
            <span className="font-bold text-neutral-800">
              {formatFollowers(top.followers)}
              <span className="ml-1 text-[10px] font-semibold text-neutral-400">
                {top.short}
              </span>
            </span>
          </div>
        )}
        {t.dob && (
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Age</span>
            <span className="font-bold text-neutral-800">{calculateAge(t.dob)}</span>
          </div>
        )}
      </div>

      {expertise.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {expertise.map((c) => (
            <span
              key={c}
              className="rounded-full bg-[#B82233]/8 px-2.5 py-0.5 text-xs font-medium text-[#B82233]"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {socials.length > 0 && (
        <div className="mt-4 flex w-full flex-wrap justify-center gap-x-3.5 gap-y-2 border-t border-neutral-100 pt-3.5">
          {socials.map((s) => (
            <a
              key={s.key}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={s.label}
              className="flex items-center gap-1.5 transition hover:scale-105"
            >
              <SocialIcon
                platform={s.key}
                size={32}
                title={s.label}
                className="shadow-sm"
              />
              {s.followers > 0 && (
                <span className="text-xs font-semibold text-neutral-600">
                  {formatFollowers(s.followers)}
                </span>
              )}
            </a>
          ))}
        </div>
      )}

      {selectToken && (
        <InterestButton
          token={selectToken}
          ptId={pt.id}
          interested={interested}
          className="mt-4 w-full"
        />
      )}
    </article>
  );
}

/**
 * PDF แนวตั้ง — mini card แนวนอน 2 คอลัมน์ × 4 แถว = 8 ใบ/หน้า
 * รูปเป็นกรอบแนวตั้ง 3:4 (เห็นหน้าชัด, object-top) · social เป็นไอคอนวงกลม
 * สีแบรนด์เรียงแถวพร้อมยอด follower · ใช้ทั้งงาน model และ influ.
 */
export function PrintMiniCard({ pt }: { pt: ProjectTalentCard }) {
  const t = pt.talent;
  const displayName = t.nickname_en || t.nickname_th || t.code;
  const isInflu = pt.card_type === "influcard";
  const img = isInflu
    ? (pt.gallery_paths[0] ?? pt.compcard_path)
    : (pt.compcard_path ?? pt.gallery_paths[0]);
  const top = topSocial(t);
  const socials = talentSocials(t);
  const expertise = ((t.categories ?? []) as string[]).slice(0, 3);

  return (
    <div className="flex gap-3 overflow-hidden rounded-xl border border-neutral-200 bg-white p-3">
      {/* งาน influ = กรอบแนวตั้ง 3:4 เห็นหน้าชัด · งาน model = กรอบแนวนอนกว้าง
          object-contain เห็นคอมการ์ดเต็มใบไม่โดน crop */}
      <div
        className={`shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 ${
          isInflu ? "aspect-[3/4] w-24" : "h-28 w-44"
        }`}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getPhotoProxyUrl(img)}
            alt={displayName}
            className={`size-full ${isInflu ? "object-cover object-top" : "object-contain"}`}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[9px] text-neutral-400">
            ไม่มีรูป
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline gap-1.5">
          <p className="truncate text-base font-bold text-neutral-800">
            {displayName}
          </p>
          <span className="font-mono text-[9px] text-neutral-400">{t.code}</span>
        </div>

        {isInflu ? (
          <>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              <span className="font-semibold text-[#1D4ED8]">
                {TIER_LABEL[t.tier] ?? t.tier}
              </span>
              {top && (
                <>
                  {" · "}
                  <span className="font-bold text-neutral-800">
                    {formatFollowers(top.followers)}
                  </span>{" "}
                  on {top.label}
                </>
              )}
              {t.dob && ` · อายุ ${calculateAge(t.dob)}`}
            </p>
            {expertise.length > 0 && (
              <p className="mt-1 truncate text-[10px] font-medium text-[#B82233]">
                {expertise.join(" · ")}
              </p>
            )}
            {socials.length > 0 && (
              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5">
                {socials.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    className="flex items-center gap-1"
                    title={s.label}
                  >
                    <SocialIcon
                      platform={s.key}
                      size={20}
                      title={s.label}
                      className="[print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
                    />
                    {s.followers > 0 && (
                      <span className="text-[10px] font-semibold text-neutral-600">
                        {formatFollowers(s.followers)}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mt-0.5 text-[11px] leading-4 text-neutral-500">
              {[
                t.dob ? `อายุ ${calculateAge(t.dob)} ปี` : null,
                t.height_cm ? `สูง ${t.height_cm} ซม.` : null,
                t.weight_kg ? `หนัก ${t.weight_kg} กก.` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              {ethnicityText(t) && (
                <span className="block text-[10px] text-neutral-400">
                  {ethnicityText(t)}
                </span>
              )}
            </p>
            {top && (
              <div className="mt-auto flex items-center gap-1.5 pt-1.5">
                <SocialIcon
                  platform={top.key}
                  size={20}
                  title={top.label}
                  className="[print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
                />
                <span className="text-[10px] font-semibold text-neutral-600">
                  {formatFollowers(top.followers)} on {top.label}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
