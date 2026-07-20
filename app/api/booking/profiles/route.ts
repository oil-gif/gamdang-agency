import { NextResponse, type NextRequest } from "next/server";
import { verifyLineIdToken } from "@/lib/line-verify";
import { supabase } from "@/lib/supabase/server";

// สมาชิกเปิดหน้าจองจากแอป LINE → ส่ง id token มาแลกรายชื่อโปรไฟล์ของ
// บัญชีตัวเอง (แม่มีลูกหลายคน) เพื่อแตะเลือกแล้ว prefill ฟอร์มจอง ไม่ต้อง
// กรอกใหม่ — คืนเฉพาะข้อมูลของบัญชี LINE ที่ verify ผ่านเท่านั้น (ข้อมูล
// ชุดเดียวกับที่เจ้าของเห็นใน /apply/profiles อยู่แล้ว)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const idToken = typeof body?.id_token === "string" ? body.id_token : "";
  if (!idToken) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  const profile = await verifyLineIdToken(idToken);
  if (!profile) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const { data: talents } = await supabase
    .from("talents")
    .select(
      "id, nickname_en, nickname_th, full_name, phone, email, gender, dob, nationality, height_cm, weight_kg, status",
    )
    .eq("line_user_id", profile.lineUserId)
    .order("created_at", { ascending: true });

  if (!talents || talents.length === 0) {
    return NextResponse.json({ ok: true, profiles: [] });
  }

  const { data: photos } = await supabase
    .from("talent_photos")
    .select("talent_id, kind, storage_path, display_order")
    .in(
      "talent_id",
      talents.map((t) => t.id),
    )
    .order("display_order", { ascending: true });

  return NextResponse.json({
    ok: true,
    profiles: talents.map((t) => {
      const mine = (photos ?? []).filter((p) => p.talent_id === t.id);
      return {
        id: t.id,
        name: t.nickname_en || t.nickname_th || "ยังไม่ตั้งชื่อ",
        photo_path:
          mine.find((p) => p.kind === "gallery")?.storage_path ??
          mine.find((p) => p.kind === "compcard")?.storage_path ??
          null,
        // ค่าที่ใช้ prefill ฟอร์มจอง
        nickname: t.nickname_en || t.nickname_th || "",
        full_name: t.full_name ?? "",
        phone: t.phone ?? "",
        email: t.email ?? "",
        gender: t.gender ?? "",
        dob: t.dob ?? "",
        nationality: t.nationality ?? "",
        height: t.height_cm ? String(t.height_cm) : "",
        weight: t.weight_kg ? String(t.weight_kg) : "",
      };
    }),
  });
}
