import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { replyLineMessage } from "@/lib/line-messaging";

export const runtime = "nodejs";

// Webhook ของ OA ที่ 2 "gamdangprofile" (บอทแจ้งเตือน admin เข้ากลุ่ม —
// แยกโควตาจาก OA หลัก) หน้าที่เดียว: พิมพ์ "id" ในกลุ่ม → ตอบ Group ID กลับ
// เพื่อเอาไปตั้ง ADMIN_LINE_NOTIFY_ID
// ตั้งใน LINE Developers Console ของ gamdangprofile → Messaging API →
// Webhook URL: https://<โดเมน>/api/line/webhook-notify (เปิด Use webhook)
export async function POST(req: NextRequest) {
  const secret = process.env.NOTIFY_LINE_CHANNEL_SECRET;
  const token = process.env.NOTIFY_LINE_ACCESS_TOKEN;
  if (!secret || !token) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as {
    events?: Array<{
      type: string;
      replyToken?: string;
      message?: { type?: string; text?: string };
      source?: { type?: string; userId?: string; groupId?: string; roomId?: string };
    }>;
  };

  for (const event of body.events ?? []) {
    if (event.type !== "message" || event.message?.type !== "text") continue;
    const t = (event.message.text ?? "").trim().toLowerCase();
    if (t !== "id" && t !== "/id" && t !== "ไอดี") continue;

    const src = event.source ?? {};
    const targetId = src.groupId ?? src.roomId ?? src.userId ?? "(ไม่พบ)";
    const kind = src.groupId ? "Group" : src.roomId ? "Room" : "User";
    if (event.replyToken && !/^0+$/.test(event.replyToken)) {
      await replyLineMessage(
        event.replyToken,
        [
          {
            type: "text",
            text: `${kind} ID:\n${targetId}\n\nนำ ID นี้ไปตั้งค่า ADMIN_LINE_NOTIFY_ID ใน Vercel เพื่อให้แจ้งเตือนการจองเด้งที่นี่ค่ะ`,
          },
        ],
        token,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
