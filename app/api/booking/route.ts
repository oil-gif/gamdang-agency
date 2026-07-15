import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { BOOKING } from "@/lib/constants";
import { pushLineMessage } from "@/lib/line-messaging";
import { thaiDateLabel } from "@/lib/booking";
import { supabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function err(code: string, status = 400) {
  return NextResponse.json({ ok: false, code }, { status, headers: CORS });
}

// รับการจอง: validate → เก็บสลิปลง bucket ส่วนตัว → จองแบบ atomic
// (book_shoot_slot ใน DB — เช็คความจุ+insert ใน lock เดียว ปิด race)
// body = JSON base64 (แนวเดียวกับ upload อื่นๆ ของระบบ):
// { day_id, package, hour, full_name, nickname?, phone, line_id?, email?,
//   height?, weight?, talents?, slip: dataURL(jpg/png/webp/pdf), website? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return err("invalid");

  // honeypot กันสแปม — bot กรอกช่องซ่อน → ทิ้งเงียบๆ แบบระบบเดิม
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { headers: CORS });
  }

  const str = (v: unknown) =>
    typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, 500) : null;

  const dayId = str(body.day_id);
  const pkg: "A" | "B" | null =
    body.package === "A" || body.package === "B" ? body.package : null;
  const hour = (BOOKING.hours as readonly string[]).includes(body.hour)
    ? (body.hour as string)
    : null;
  // บังคับ: ชื่อเล่น(อังกฤษ) + เบอร์ + อีเมล + สัญชาติ · ชื่อจริงไม่บังคับ
  const nickname = str(body.nickname);
  const fullNameRaw = str(body.full_name);
  const phone = str(body.phone);
  const email = str(body.email);
  const nationality = str(body.nationality);
  const gender = ["male", "female", "other"].includes(body.gender)
    ? (body.gender as string)
    : null;
  const dob = /^\d{4}-\d{2}-\d{2}$/.test(String(body.dob ?? "")) ? body.dob : null;
  const slip = typeof body.slip === "string" ? body.slip : "";
  if (!dayId || !pkg || !hour || !nickname || !phone || !email || !slip) {
    console.error("booking invalid:", {
      dayId: !!dayId, pkg: !!pkg, hour: !!hour,
      nickname: !!nickname, phone: !!phone, email: !!email, slip: !!slip,
    });
    return err("invalid");
  }
  // ตาราง shoot_bookings มี full_name NOT NULL — ไม่มีชื่อจริงใช้ชื่อเล่นแทน
  const fullName = fullNameRaw ?? nickname;

  // ===== สลิป: รูป (บีบเป็น jpg) หรือ PDF ≤ ~3.5MB =====
  const match = slip.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!match) return err("upload");
  const mime = match[1].toLowerCase();
  const buf = Buffer.from(match[2], "base64");
  if (buf.length > 3.5 * 1024 * 1024) return err("upload");

  let slipBuffer: Buffer;
  let ext: string;
  let contentType: string;
  if (mime === "application/pdf") {
    if (!buf.subarray(0, 5).toString().startsWith("%PDF")) return err("upload");
    slipBuffer = buf;
    ext = "pdf";
    contentType = "application/pdf";
  } else if (["image/jpeg", "image/png", "image/webp"].includes(mime)) {
    try {
      slipBuffer = await sharp(buf)
        .rotate()
        .resize({ width: 2000, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch {
      return err("upload");
    }
    ext = "jpg";
    contentType = "image/jpeg";
  } else {
    return err("upload");
  }

  const slipPath = `${dayId}/${randomUUID()}.${ext}`;
  const blob = new Blob([new Uint8Array(slipBuffer)], { type: contentType });
  const { error: uploadError } = await supabase.storage
    .from("booking-slips")
    .upload(slipPath, blob, { contentType });
  if (uploadError) return err("upload", 500);

  // ===== จองแบบ atomic =====
  const { data: bookingId, error } = await supabase.rpc("book_shoot_slot", {
    p_day: dayId,
    p_package: pkg,
    p_hour: hour,
    p_full_name: fullName,
    p_nickname: nickname,
    p_phone: phone,
    p_line_id: str(body.line_id),
    p_email: email,
    p_height: str(body.height),
    p_weight: str(body.weight),
    p_talents: str(body.talents),
    p_slip_path: slipPath,
    p_photo_cap: BOOKING.photoCap,
    p_video_cap: BOOKING.videoCap,
  });
  // gender/dob ไม่เกี่ยวกับความจุ — อัพเดตแยกหลังจองสำเร็จ
  // (ไม่ต้องแก้ signature ของ book_shoot_slot)
  if (error) {
    // ที่เต็ม/ปิดพอดี — ลบสลิปที่เพิ่งอัพทิ้ง
    await supabase.storage.from("booking-slips").remove([slipPath]);
    const code = error.message.includes("full") ? "full" : "invalid";
    if (code === "invalid") console.error("booking rpc error:", error.message);
    return err(code, 409);
  }

  if (gender || dob || nationality) {
    const { error: updErr } = await supabase
      .from("shoot_bookings")
      .update({ gender, dob, nationality })
      .eq("id", bookingId);
    // เผื่อ migration 010 (nationality) ยังไม่ถูกรัน — อย่าให้ทั้ง gender/dob
    // หายไปเพราะ column เดียวไม่มี ลองบันทึกเฉพาะ gender/dob อีกรอบ
    if (updErr) {
      await supabase
        .from("shoot_bookings")
        .update({ gender, dob })
        .eq("id", bookingId);
    }
  }

  // แจ้งเตือนแอดมินทาง LINE (best-effort — พังก็ไม่ทำให้การจองล้ม)
  const adminLineId = process.env.ADMIN_LINE_USER_ID;
  if (adminLineId) {
    try {
      const { data: day } = await supabase
        .from("shoot_days")
        .select("shoot_date, location")
        .eq("id", dayId)
        .single();
      await pushLineMessage(adminLineId, [
        {
          type: "text",
          text: [
            "📸 มีจองถ่ายโปรไฟล์ใหม่!",
            `วันถ่าย: ${day ? thaiDateLabel(day.shoot_date) : "-"} ${day?.location ?? ""}`,
            `รอบ: ${hour} น. · Package ${pkg} (฿${BOOKING.packages[pkg].price.toLocaleString()})`,
            `ชื่อ: ${fullName}${str(body.nickname) ? ` (${str(body.nickname)})` : ""}`,
            `โทร: ${phone}${str(body.line_id) ? ` · LINE: ${str(body.line_id)}` : ""}`,
            "",
            "ตรวจสลิปที่: https://gamdang-app.vercel.app/admin/shoots",
          ].join("\n"),
        },
      ]);
    } catch (e) {
      console.error("LINE admin notify failed", e);
    }
  }

  return NextResponse.json({ ok: true, id: bookingId }, { headers: CORS });
}
