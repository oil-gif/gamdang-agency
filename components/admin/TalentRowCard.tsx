import Link from "next/link";
import { DeleteTalentButton } from "@/components/admin/DeleteTalentButton";
import { getPhotoProxyUrl } from "@/lib/storage";

// การ์ด talent แบบ "บาร์ยาว" สำหรับ list หลังบ้าน — เห็นข้อมูลครบโดยไม่ต้อง
// hover (ชื่อ อายุ เพศ สัดส่วน follower สูงสุด ไอคอน social และ Expertise)
// คลิกทั้งการ์ดเข้าหน้าแก้ไข /admin/talents/[id]

export type RowCardSocial = {
  key: string;
  short: string;
  color: string;
  followers: number;
};

export type TalentRowCardProps = {
  href: string;
  talentId: string;
  photoPath: string | null;
  name: string;
  nameSub?: string | null;
  code?: string | null;
  gender?: string | null;
  ageText?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  nationality?: string | null;
  roles: { model: boolean; influ: boolean; ai: boolean };
  tierLabel?: string | null;
  statusChip: { label: string; className: string };
  socials?: RowCardSocial[];
  topFollower?: { short: string; label: string; count: string } | null;
  categories?: string[]; // Expertise ของ influencer
  characters?: string[]; // AI model
};

const GENDER_TEXT: Record<string, string> = {
  male: "♂ ชาย",
  female: "♀ หญิง",
  other: "⚧ อื่นๆ",
};

export function TalentRowCard(props: TalentRowCardProps) {
  const meta = [
    props.ageText ?? null,
    props.gender ? GENDER_TEXT[props.gender] : null,
    props.heightCm ? `${props.heightCm}cm` : null,
    props.weightKg ? `${props.weightKg}kg` : null,
    props.nationality ?? null,
  ].filter(Boolean);

  return (
    <div className="group relative flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#1D4ED8]/40 hover:shadow-md">
      {/* คลิกที่ไหนบนการ์ดก็เข้าหน้าแก้ไข (overlay ลิงก์ ปุ่มลบอยู่ทับด้านบน) */}
      <Link
        href={props.href}
        aria-label={props.name}
        className="absolute inset-0 rounded-2xl"
      />

      {/* รูปวงกลม */}
      <div className="pointer-events-none relative size-16 shrink-0 overflow-hidden rounded-full bg-neutral-100 ring-1 ring-neutral-200">
        {props.photoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getPhotoProxyUrl(props.photoPath, 320)}
            alt={props.name}
            loading="lazy"
            className="size-full object-cover object-top"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[10px] text-neutral-400">
            ไม่มีรูป
          </div>
        )}
      </div>

      {/* ข้อมูลหลัก */}
      <div className="pointer-events-none min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-base font-bold text-neutral-800">
            {props.name}
            {props.nameSub && (
              <span className="ml-1.5 text-sm font-normal text-neutral-400">
                {props.nameSub}
              </span>
            )}
          </p>
          {props.code && (
            <span className="shrink-0 font-mono text-[11px] text-neutral-400">
              {props.code}
            </span>
          )}
        </div>

        {meta.length > 0 && (
          <p className="mt-0.5 truncate text-[13px] text-neutral-500">
            {meta.join(" · ")}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {props.roles.model && <RoleBadge className="bg-[#1D4ED8]/10 text-[#1D4ED8]">MODEL</RoleBadge>}
          {props.roles.influ && <RoleBadge className="bg-[#B82233]/10 text-[#B82233]">INFLU</RoleBadge>}
          {props.roles.ai && <RoleBadge className="bg-violet-100 text-violet-700">AI</RoleBadge>}
          {props.tierLabel && (
            <RoleBadge className="bg-amber-100 text-amber-700">{props.tierLabel}</RoleBadge>
          )}
          {/* Expertise */}
          {props.categories && props.categories.length > 0 && (
            <span className="truncate text-xs font-medium text-[#B82233]">
              {props.categories.join(" · ")}
            </span>
          )}
          {props.characters && props.characters.length > 0 && (
            <span className="truncate text-xs text-violet-600">
              {props.characters.join(" · ")}
            </span>
          )}
        </div>
      </div>

      {/* ฝั่งขวา: สถานะ + follower สูงสุด + ไอคอน social */}
      <div className="pointer-events-none flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${props.statusChip.className}`}
        >
          {props.statusChip.label}
        </span>

        {props.topFollower && (
          <p className="text-sm font-bold text-neutral-800">
            {props.topFollower.count}
            <span className="ml-1 text-[11px] font-medium text-neutral-400">
              on {props.topFollower.label}
            </span>
          </p>
        )}

        {(props.socials?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1">
            {props.socials!.map((s) => (
              <span
                key={s.key}
                title={`${s.short} ${s.followers ? `· ${s.followers.toLocaleString()}` : ""}`}
                className="flex size-[18px] items-center justify-center rounded-full text-[7px] font-bold text-white"
                style={{ backgroundColor: s.color }}
              >
                {s.short}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ปุ่มลบ — อยู่เหนือ overlay ลิงก์ กดแล้วถามยืนยันก่อน */}
      <div className="relative z-10 shrink-0">
        <DeleteTalentButton id={props.talentId} name={props.name} code={props.code} />
      </div>
    </div>
  );
}

function RoleBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`rounded px-1.5 py-px text-[10px] font-bold ${className}`}>
      {children}
    </span>
  );
}
