import Link from "next/link";
import { getPhotoProxyUrl } from "@/lib/storage";

// การ์ด talent ตัวเดียวใช้ทั้งหน้าบ้าน (/) และหลังบ้าน (/admin/talents)
// — ดึงข้อมูลรูปแบบเดียวกัน ไม่ต้องดูแล 2 ชุด. รูปเป็น thumbnail (?w=320)
// เพื่อให้ grid โหลดเร็วแม้มีข้อมูลหลักหมื่นคน.

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
  age?: number | null;
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
    props.age !== null && props.age !== undefined ? `${props.age} ปี` : null,
  ].filter(Boolean);

  const className =
    "group block overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#1D4ED8]/40 hover:shadow-md";
  const Wrapper = props.href
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={props.href!} className={className}>
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className={className}>{children}</div>
      );

  return (
    <Wrapper>
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
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
        {props.statusChip && (
          <span
            className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${props.statusChip.className}`}
          >
            {props.statusChip.label}
          </span>
        )}
      </div>

      <div className="space-y-1 p-2.5">
        <div className="flex items-baseline justify-between gap-1.5">
          <p className="truncate text-sm font-semibold text-neutral-800">
            {props.name}
            {props.nameSub && (
              <span className="ml-1 font-normal text-neutral-400">
                {props.nameSub}
              </span>
            )}
          </p>
          {props.code && (
            <span className="shrink-0 font-mono text-[9px] text-neutral-400">
              {props.code}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-neutral-500">
          {meta.length > 0 && <span>{meta.join(" · ")}</span>}
          {props.roles.model && (
            <span className="rounded bg-[#1D4ED8]/10 px-1 py-px text-[9px] font-semibold text-[#1D4ED8]">
              MODEL
            </span>
          )}
          {props.roles.influ && (
            <span className="rounded bg-[#B82233]/10 px-1 py-px text-[9px] font-semibold text-[#B82233]">
              INFLU
            </span>
          )}
          {props.roles.ai && (
            <span className="rounded bg-gradient-to-r from-[#1D4ED8]/15 to-[#B82233]/15 px-1 py-px text-[9px] font-semibold text-[#5b2b8f]">
              AI
            </span>
          )}
        </div>

        {props.characters && props.characters.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {props.characters.map((c) => (
              <span
                key={c}
                className="rounded-full bg-neutral-100 px-1.5 py-px text-[9px] text-neutral-600"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {(props.socials?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1 pt-0.5">
            {props.socials!.map((s) => (
              <span
                key={s.key}
                title={s.short}
                className="flex size-4.5 items-center justify-center rounded-full text-[7px] font-bold text-white"
                style={{ backgroundColor: s.color, width: 18, height: 18 }}
              >
                {s.short}
              </span>
            ))}
            {props.topFollower && (
              <span className="ml-auto text-[11px] font-bold text-neutral-700">
                {props.topFollower.count}
                <span className="ml-0.5 text-[9px] font-semibold text-neutral-400">
                  {props.topFollower.short}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
