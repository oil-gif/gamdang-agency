import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { formatDateEN, replyLineMessage } from "@/lib/line-messaging";
import { supabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Webhook ของ LINE OA @gamdangmodeling — รับ postback จากปุ่มในการ์ดแจ้งงาน
// (สนใจ / ไม่สะดวก) แล้วอัพเดตคำตอบ + ตอบกลับในแชททันที
// ต้องตั้งใน LINE Developers Console → Messaging API → Webhook URL:
// https://gamdang-app.vercel.app/api/line/webhook (เปิด Use webhook)
export async function POST(req: NextRequest) {
  const secret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  // ตรวจลายเซ็น: HMAC-SHA256(body) ด้วย channel secret ต้องตรงกับ header
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
      postback?: { data?: string };
    }>;
  };

  for (const event of body.events ?? []) {
    // ปุ่ม Verify ในคอนโซลส่ง event เปล่า/replyToken ศูนย์ล้วน — ข้ามเฉยๆ
    if (event.type !== "postback" || !event.postback?.data) continue;

    const params = new URLSearchParams(event.postback.data);
    if (params.get("action") !== "job") continue;
    const ptId = params.get("pt") ?? "";
    const response = params.get("response");
    if (response !== "accepted" && response !== "declined") continue;

    const { data: pt } = await supabase
      .from("project_talents")
      .select(
        "id, project_id, project:projects(project_type, shooting_date, name)",
      )
      .eq("id", ptId)
      .maybeSingle();
    if (!pt) continue;

    await supabase
      .from("project_talents")
      .update({ talent_response: response })
      .eq("id", pt.id);

    // ตอบกลับในแชท — ฝั่ง Model ให้ย้ำเรื่องล็อกคิววันถ่ายด้วย
    if (event.replyToken && !/^0+$/.test(event.replyToken)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const project = pt.project as any;
      let text: string;
      if (response === "declined") {
        text =
          "รับทราบค่ะ ขอบคุณที่แจ้งกลับนะคะ 🙏 โอกาสหน้าฝากด้วยค่ะ";
      } else if (project?.project_type === "model") {
        text = `ขอบคุณที่สนใจค่ะ 🙌 รบกวน "ล็อกคิว" วันถ่าย ${formatDateEN(project?.shooting_date)} ไว้ก่อนนะคะ ทีมงานจะส่ง "Job Confirmed 🎉" ยืนยันอีกครั้งเมื่อลูกค้าคอนเฟิร์มค่ะ`;
      } else {
        text = `ขอบคุณที่สนใจเข้าร่วมค่ะ 🙌 ทีมงานจะส่ง "Job Confirmed 🎉" ยืนยันอีกครั้งเมื่อลูกค้าคอนเฟิร์มค่ะ`;
      }
      await replyLineMessage(event.replyToken, [{ type: "text", text }]);
    }
  }

  return NextResponse.json({ ok: true });
}
