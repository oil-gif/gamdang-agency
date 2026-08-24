import { SocialIcon } from "@/components/SocialIcon";
import { platformColor, platformLabel, socialIconKey } from "@/lib/social-posts";

// ป้ายช่องทางแบบมีโลโก้จริง — ใช้ทั้งใน Report และหลังบ้าน ให้หน้าตาตรงกับ
// การ์ด Influencer ที่เสนอลูกค้า (components/public/TalentCards ใช้ SocialIcon เดียวกัน)
//
// "other" ไม่มีโลโก้ → วาดเป็นป้ายสีเทาแทน จะได้ไม่หายไปเฉยๆ
export function PlatformTag({
  platform,
  size = 16,
  showLabel = true,
}: {
  platform: string;
  size?: number;
  showLabel?: boolean;
}) {
  const iconKey = socialIconKey(platform);
  const label = platformLabel(platform);

  if (!iconKey) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
        style={{
          backgroundColor: platformColor(platform),
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        🔗 {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <SocialIcon platform={iconKey} size={size} title={label} />
      {showLabel && (
        <span className="text-[11px] font-semibold text-neutral-700">{label}</span>
      )}
    </span>
  );
}
