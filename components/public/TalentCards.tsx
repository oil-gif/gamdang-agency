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
  compcard_path: string | null;
  gallery_paths: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  talent: any;
};

export function ethnicityText(t: { ethnicities?: string[] | null }) {
  const list = (t.ethnicities ?? []) as string[];
  return list.length > 0
    ? list.map((e) => ETHNICITY_LABEL[e] ?? e).join(" / ")
    : null;
}

/**
 * งาน Model — full landscape comp card with a fact bar underneath.
 */
export function ModelCard({ pt }: { pt: ProjectTalentCard }) {
  const t = pt.talent;
  const displayName = t.nickname_en || t.nickname_th || t.code;
  const img = pt.compcard_path ?? pt.gallery_paths[0] ?? null;
  const facts = [
    t.dob ? `อายุ ${calculateAge(t.dob)} ปี` : null,
    t.height_cm ? `สูง ${t.height_cm} ซม.` : null,
    t.weight_kg ? `หนัก ${t.weight_kg} กก.` : null,
    ethnicityText(t),
  ].filter(Boolean) as string[];

  return (
    <article className="print-break overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
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
      </div>
    </article>
  );
}

/**
 * งาน Influencer — compact vertical card (แบบตัวอย่างที่พี่ส่งมา):
 * circular photo, name, tier pill, Max Followers / Age rows, expertise
 * chips, clickable social icon buttons.
 */
export function InfluCard({ pt }: { pt: ProjectTalentCard }) {
  const t = pt.talent;
  const displayName = t.nickname_en || t.nickname_th || t.code;
  const img = pt.gallery_paths[0] ?? pt.compcard_path ?? null;
  const top = topSocial(t);
  const socials = talentSocials(t);
  const expertise = (t.categories ?? []) as string[];

  return (
    <article className="print-break flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-5 text-center shadow-sm">
      <div className="size-24 overflow-hidden rounded-full border-2 border-[#1D4ED8]/15 bg-neutral-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getPhotoProxyUrl(img)}
            alt={displayName}
            className="size-full object-cover"
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
        <div className="mt-4 flex w-full flex-wrap justify-center gap-2 border-t border-neutral-100 pt-3.5">
          {socials.map((s) => (
            <a
              key={s.key}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${s.label}${s.followers > 0 ? ` · ${formatFollowers(s.followers)}` : ""}`}
              className="flex size-9 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm transition hover:scale-105"
              style={{ backgroundColor: s.color }}
            >
              {s.short}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

/**
 * PDF แนวตั้ง — mini card แนวนอน 8 ใบ/หน้า (2 คอลัมน์ × 4 แถว)
 * ใช้ทั้งงาน model และ influ โดยสลับข้อมูลด้านขวาตาม card_type.
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
      <div className="size-[72px] shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getPhotoProxyUrl(img)}
            alt={displayName}
            className="size-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <p className="truncate text-sm font-bold text-neutral-800">{displayName}</p>
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
              <p className="mt-0.5 truncate text-[10px] text-[#B82233]">
                {expertise.join(" · ")}
              </p>
            )}
            {socials.length > 0 && (
              <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] leading-3">
                {socials.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    className="font-semibold underline-offset-1"
                    style={{ color: s.color }}
                  >
                    {s.label}
                    {s.followers > 0 ? ` ${formatFollowers(s.followers)}` : ""}
                  </a>
                ))}
              </p>
            )}
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
}
