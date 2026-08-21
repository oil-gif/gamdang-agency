import "server-only";

// โควตาข้อความของ LINE OA — แพ็กเกจฟรีส่งได้ 300 ข้อความ/เดือน/บัญชี
// พอเต็ม LINE จะตอบ 429 "You have reached your monthly limit." แล้วข้อความ
// ทุกอย่างเงียบหายไปเฉยๆ (เจอจริง 2026-08-21: เต็มทั้ง 3 บัญชี ลูกค้าที่จอง
// ไม่ได้รับข้อความยืนยันเลยหลายวันกว่าจะรู้ตัว)
//
// เอามาโชว์บน Dashboard เพื่อให้เห็นก่อนที่จะเต็ม

export type LineQuota = {
  label: string;
  used: number;
  limit: number | null; // null = ไม่จำกัด (แพ็กเกจเสียเงิน)
  remaining: number | null;
  ok: boolean; // ดึงข้อมูลสำเร็จมั้ย
};

const OAS: { label: string; env: string }[] = [
  { label: "Gamdang Modeling", env: "LINE_MESSAGING_ACCESS_TOKEN" },
  { label: "gamdangprofile", env: "NOTIFY_LINE_ACCESS_TOKEN" },
  { label: "Gamdang Casting", env: "CASTING_LINE_ACCESS_TOKEN" },
];

// เตือนเมื่อเหลือน้อยกว่านี้
export const QUOTA_WARN_AT = 50;

async function fetchOne(label: string, token: string): Promise<LineQuota> {
  const headers = { Authorization: `Bearer ${token}` };
  // cache 15 นาที — ไม่ต้องยิง LINE ทุกครั้งที่เปิด Dashboard
  const opts = { headers, next: { revalidate: 900 } } as RequestInit;
  try {
    const [q, c] = await Promise.all([
      fetch("https://api.line.me/v2/bot/message/quota", opts),
      fetch("https://api.line.me/v2/bot/message/quota/consumption", opts),
    ]);
    if (!q.ok || !c.ok) return { label, used: 0, limit: null, remaining: null, ok: false };
    const qj = (await q.json()) as { type?: string; value?: number };
    const cj = (await c.json()) as { totalUsage?: number };
    const used = cj.totalUsage ?? 0;
    // type "none" = ไม่จำกัด · "limited" = มีเพดานที่ value
    const limit = qj.type === "limited" && typeof qj.value === "number" ? qj.value : null;
    return {
      label,
      used,
      limit,
      remaining: limit === null ? null : Math.max(limit - used, 0),
      ok: true,
    };
  } catch {
    return { label, used: 0, limit: null, remaining: null, ok: false };
  }
}

export async function getLineQuotas(): Promise<LineQuota[]> {
  const configured = OAS.filter((o) => process.env[o.env]);
  return Promise.all(
    configured.map((o) => fetchOne(o.label, process.env[o.env] as string)),
  );
}
