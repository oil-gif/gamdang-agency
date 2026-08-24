import { formatCount, platformColor, platformLabel } from "@/lib/social-posts";

// กราฟสรุปแคมเปญสำหรับรายงานลูกค้า — วาดด้วย SVG ล้วน ไม่ใช้ไลบรารีกราฟ
//
// ทำไมไม่ใช้ Recharts/Chart.js: รายงานนี้ต้อง "Save as PDF" ได้ด้วย
// ไลบรารีพวกนั้นวาดบน canvas หรือรอ JS ทำงาน → พิมพ์ออกมาเบลอ/หายทั้งกราฟ
// SVG คมทุกขนาด พิมพ์ได้ตรงๆ และไม่เพิ่มขนาดหน้าเว็บเลย
//
// ⚠️ ต้องใส่ printColorAdjust: "exact" ทุกชิ้นที่มีสีพื้น ไม่งั้นเบราว์เซอร์
// ตัดสีทิ้งตอนพิมพ์ กราฟจะกลายเป็นสีขาวล้วน

const exact = {
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
} as const;

export type Slice = { key: string; value: number };

/** โดนัทสัดส่วนยอดวิวแยกช่องทาง — ใช้ stroke-dasharray ไม่ต้องคำนวณ path arc */
export function DonutChart({
  slices,
  size = 132,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel: string;
  centerValue: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {/* วงพื้นหลัง — เผื่อกรณียอดเป็น 0 ทั้งหมด จะได้ไม่โล่ง */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={thickness}
          style={exact}
        />
        {total > 0 &&
          slices.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={platformColor(s.key)}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                style={exact}
              />
            );
            offset += len;
            return el;
          })}
      </g>
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        className="fill-neutral-800"
        style={{ fontSize: 19, fontWeight: 800 }}
      >
        {centerValue}
      </text>
      <text
        x="50%"
        y="62%"
        textAnchor="middle"
        className="fill-neutral-400"
        style={{ fontSize: 9, letterSpacing: 0.6 }}
      >
        {centerLabel}
      </text>
    </svg>
  );
}

/** แท่งแนวนอน — ใช้กับ "ยอดวิวรายคน" ให้ลูกค้าเห็นว่าใครพาไปได้ไกลสุด */
export function BarList({
  rows,
  unit = "views",
}: {
  rows: { label: string; value: number; color?: string }[];
  unit?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-[11px] font-medium text-neutral-600">
            {r.label}
          </span>
          <div
            className="h-4 flex-1 overflow-hidden rounded-full bg-neutral-100"
            style={exact}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((r.value / max) * 100, 2)}%`,
                backgroundColor: r.color ?? "#1D4ED8",
                ...exact,
              }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-[11px] font-semibold text-neutral-700">
            {formatCount(r.value)}
          </span>
        </div>
      ))}
      <p className="text-right text-[9px] text-neutral-400">หน่วย: {unit}</p>
    </div>
  );
}

/** คำอธิบายสีข้างโดนัท */
export function PlatformLegend({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <div className="space-y-1">
      {slices.map((s) => {
        const pct = total > 0 ? (s.value / total) * 100 : 0;
        return (
          <div key={s.key} className="flex items-center gap-2 text-[11px]">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: platformColor(s.key), ...exact }}
            />
            <span className="w-20 shrink-0 font-medium text-neutral-700">
              {platformLabel(s.key)}
            </span>
            <span className="text-neutral-500">{formatCount(s.value)}</span>
            <span className="ml-auto font-bold text-neutral-800">
              {pct.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
