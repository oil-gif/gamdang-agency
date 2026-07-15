import Link from "next/link";
import { getPhotoProxyUrl } from "@/lib/storage";

// การ์ด talent ตัวเดียวใช้ทั้งหน้าบ้าน (/) และหลังบ้าน (/admin/talents)
// สไตล์ตารางรูปล้วน (photo mosaic) แบบเว็บเอเจนซี่: ปกติเห็นแค่รูป
// เอา cursor ชี้แล้วข้อมูลเด้งขึ้นเป็น overlay — โหลดเร็วด้วย thumbnail ?w=320

export type GridCardSocial = {
  key: string;
  short: string;
  color: string;
  url: string;
  followers: number;
};

export type TalentGridCardProps = {
  // ไม่ใส่ = การ์ดโชว์เฉยๆ (หน้าบ้าน) / ใส่ = คลิกเข้าหน้าเชิงลึก (หลังบ้าน)
  href?: string;
  photoPath: string | null;
  name: string;
  nameSub?: string | null;
  code?: string | null;
  gender?: string | null;
  // ส่งเป็นข้อความ (เช่น "3 ปี 0 ด." สำหรับเด็ก) — คำนวณจาก dob ที่ฝั่ง page
  ageText?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  nationality?: string | null;
  roles: { model: boolean; influ: boolean; ai: boolean };
  // admin เท่านั้น
  statusChip?: { label: string; className: string } | null;
  // influ: ไอคอน social + ยอดช่องที่เยอะสุด
  socials?: GridCardSocial[];
  topFollower?: { short: string; color: string; count: string } | null;
  // AI model: character chips
  characters?: string[];
};

const GENDER_SYMBOL: Record<string, string> = {
  male: "♂",
  female: "♀",
  other: "⚧",
};

export function TalentGridCard(props: TalentGridCardProps) {
  const meta = [
    props.gender ? GENDER_SYMBOL[props.gender] : null,
    props.ageText ?? null,
    props.heightCm ? `${props.heightCm}cm` : null,
    props.weightKg ? `${props.weightKg}kg` : null,
    props.nationality ?? null,
    props.code ?? null,
  ].filter(Boolean);

  const className =
    "group relative block aspect-[3/4] overflow-hidden rounded-lg bg-neutral-200";

  const inner = (
    <>
      {props.photoPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getPhotoProxyUrl(props.photoPath, 320)}
          alt={props.name}
          loading="lazy"
          className="size-full object-cover object-top transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-xs text-neutral-400">
          ไม่มีรูป
        </div>
      )}

      {/* admin: ป้ายสถานะจุดเล็กมุมรูป (ดูผ่านๆ ได้โดยไม่ต้อง hover) */}
      {props.statusChip && (
        <span
          className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-px text-[9px] font-semibold shadow-sm ${props.statusChip.className}`}
        >
          {props.statusChip.label}
        </span>
      )}

      {/* ข้อมูลเด้งขึ้นเมื่อ hover */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <p className="text-sm font-bold leading-tight text-white">
          {props.name}
          {props.nameSub && (
            <span className="ml-1 font-normal text-white/70">{props.nameSub}</span>
          )}
        </p>
        {meta.length > 0 && (
          <p className="mt-0.5 text-[11px] text-white/75">{meta.join(" · ")}</p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1">
          {props.roles.model && (
            <span className="rounded bg-white/20 px-1 py-px text-[8px] font-bold text-white backdrop-blur-sm">
              MODEL
            </span>
          )}
          {props.roles.influ && (
            <span className="rounded bg-white/20 px-1 py-px text-[8px] font-bold text-white backdrop-blur-sm">
              INFLU
            </span>
          )}
          {props.roles.ai && (
            <span className="rounded bg-white/20 px-1 py-px text-[8px] font-bold text-white backdrop-blur-sm">
              AI
            </span>
          )}
          {props.characters?.map((c) => (
            <span
              key={c}
              className="rounded-full bg-white/20 px-1.5 py-px text-[8px] text-white backdrop-blur-sm"
            >
              {c}
            </span>
          ))}
        </div>

        {(props.socials?.length ?? 0) > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            {props.socials!.map((s) => (
              <span
                key={s.key}
                title={s.short}
                className="flex items-center justify-center rounded-full text-[7px] font-bold text-white"
                style={{ backgroundColor: s.color, width: 16, height: 16 }}
              >
                {s.short}
              </span>
            ))}
            {props.topFollower && (
              <span className="ml-auto text-[11px] font-bold text-white">
                {props.topFollower.count}
                <span className="ml-0.5 text-[9px] font-semibold text-white/60">
                  {props.topFollower.short}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );

  return props.href ? (
    <Link href={props.href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}
