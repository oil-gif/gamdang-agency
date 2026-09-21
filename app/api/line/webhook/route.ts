import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ackRef, parseAckRef } from "@/lib/booking-ack";
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
      message?: { type?: string; text?: string };
      source?: {
        type?: string;
        userId?: string;
        groupId?: string;
        roomId?: string;
      };
    }>;
  };

  for (const event of body.events ?? []) {
    // ตัวช่วยหา ID ปลายทางแจ้งเตือน: พิมพ์ "id" ในแชท/กลุ่ม → บอทตอบ ID กลับ
    // เอา group id ไปตั้ง ADMIN_LINE_NOTIFY_ID เพื่อให้แจ้งเตือนเด้งเข้ากลุ่ม
    if (event.type === "message" && event.message?.type === "text") {
      // ปุ่ม "รับทราบค่ะ" ใต้ข้อความยืนยันรอบถ่าย (lib/booking-ack.ts)
      const ref = parseAckRef(event.message.text ?? "");
      if (ref) {
        await markBookingAck(ref, event.source?.userId, event.replyToken);
        continue;
      }
      const t = (event.message.text ?? "").trim().toLowerCase();
      if (t === "id" || t === "/id" || t === "ไอดี") {
        const src = event.source ?? {};
        const targetId = src.groupId ?? src.roomId ?? src.userId ?? "(ไม่พบ)";
        const kind = src.groupId ? "Group" : src.roomId ? "Room" : "User";
        if (event.replyToken && !/^0+$/.test(event.replyToken)) {
          await replyLineMessage(event.replyToken, [
            {
              type: "text",
              text: `${kind} ID:\n${targetId}\n\nนำ ID นี้ไปตั้งค่า ADMIN_LINE_NOTIFY_ID ใน Vercel เพื่อให้แจ้งเตือนการจองเด้งที่นี่ค่ะ`,
            },
          ]);
        }
      }
      continue;
    }

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
        text = `ขอบคุณที่สนใจค่ะ 🙌 รบกวน "ล็อกคิว" วันถ่าย ${formatDateEN(project?.shooting_date)} ไว้ก่อนนะคะ ทีมงานจะส่ง "Job Confirmed 🎉" ยืนยันอีกครั้งเมื่อลูกค้าคอนเฟิร์มค่ะ\n\nรบกวนช่วยตอบกลับรับทราบว่าล็อกคิวให้แล้วด้วยค่ะ 🙏`;
      } else {
        text = `ขอบคุณที่สนใจเข้าร่วมค่ะ 🙌 ทีมงานจะส่ง "Job Confirmed 🎉" ยืนยันอีกครั้งเมื่อลูกค้าคอนเฟิร์มค่ะ\n\nรบกวนช่วยตอบกลับรับทราบด้วยค่ะ 🙏`;
      }
      await replyLineMessage(event.replyToken, [{ type: "text", text }]);
    }
  }

  return NextResponse.json({ ok: true });
}

// ติ๊ก "ลูกค้ารับทราบแล้ว" ที่คิวจองถ่าย
//
// เทียบเฉพาะคิวของ LINE user ที่กดเท่านั้น — ต่อให้ใครพิมพ์ #ref ของคนอื่น
// มาเอง ก็ติ๊กของคนอื่นไม่ได้ · ผู้ปกครองคนเดียวจองให้ลูกหลายคนได้ เลยต้องใช้
// ref แยกใบ (คิวของไลน์เดียวมีไม่กี่ใบ กรองใน JS ได้ — คอลัมน์ id เป็น uuid
// ใช้ like ผ่าน PostgREST ไม่ได้)
async function markBookingAck(
  ref: string,
  userId: string | undefined,
  replyToken: string | undefined,
) {
  if (!userId) return;
  const { data: mine } = await supabase
    .from("shoot_bookings")
    .select("id, line_ack_at")
    .eq("line_user_id", userId)
    .limit(200);
  const hit = (mine ?? []).find((b) => ackRef(b.id) === ref);
  if (!hit) return; // ไม่ใช่ของไลน์นี้ → เงียบ (แอดมินยังเห็นแชทตามปกติ)

  // กดซ้ำ → ไม่ทับเวลาแรก แต่ยังตอบขอบคุณ
  if (!hit.line_ack_at) {
    await supabase
      .from("shoot_bookings")
      .update({ line_ack_at: new Date().toISOString() })
      .eq("id", hit.id);
  }
  // reply ไม่นับโควตาข้อความรายเดือน (ต่างจาก push)
  if (replyToken && !/^0+$/.test(replyToken)) {
    await replyLineMessage(replyToken, [
      {
        type: "text",
        text: "ขอบคุณที่ยืนยันค่ะ 🙏 แล้วพบกันวันถ่ายนะคะ",
      },
    ]);
  }
}
