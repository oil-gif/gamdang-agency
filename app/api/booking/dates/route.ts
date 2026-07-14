import { NextResponse } from "next/server";
import { getPublicShootDates } from "@/lib/booking";

// เปิด CORS ให้หน้าบ้าน WordPress (คนละโดเมน) เรียกได้
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// รอบถ่ายที่เปิดจอง + availability ต่อ (ชั่วโมง, แพกเกจ) — boolean เท่านั้น
// ห้ามส่งจำนวนที่นั่งออกไปเด็ดขาด (กฎธุรกิจ: ลูกค้าเห็นแค่ ว่าง/เต็ม)
export async function GET() {
  const dates = await getPublicShootDates();
  return NextResponse.json(
    { dates },
    { headers: { ...CORS, "Cache-Control": "no-store" } },
  );
}
