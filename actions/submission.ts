"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifySubmitToken } from "@/lib/auth/talent-session";
import { pushLineMessage } from "@/lib/line-messaging";
import { SITE_URL } from "@/lib/site";
import { supabase } from "@/lib/supabase/server";

const MAX_LINKS = 5;
const BASE_URL = SITE_URL;

// talent กด "บันทึก" ใน /submit/[token] — auth ด้วย submit token
// (งาน influ = ลิงก์โพสต์ผลงาน · งาน model = casting: ลิงก์ผลงานเก่า + คลิปแนะนำตัว)
export async function saveSubmission(formData: FormData) {
  const token = String(formData.get("token"));
  const fromAdminQS = formData.get("from") === "admin" ? "&from=admin" : "";
  const verified = await verifySubmitToken(token);
  if (!verified) redirect("/submit/expired");

  const normalize = (value: string) =>
    /^https?:\/\//i.test(value) ? value : `https://${value}`;

  // เก็บเฉพาะลิงก์ที่ไม่ว่าง สูงสุด 5 ลิงก์
  const links: string[] = [];
  for (let i = 0; i < MAX_LINKS; i++) {
    const raw = formData.get(`link_${i}`);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) continue;
    links.push(normalize(value));
  }

  const introRaw = formData.get("intro_video");
  const introVideo =
    typeof introRaw === "string" && introRaw.trim() !== ""
      ? normalize(introRaw.trim())
      : null;

  const noteRaw = formData.get("note");
  const note = typeof noteRaw === "string" && noteRaw.trim() !== "" ? noteRaw.trim() : null;

  const { data: pt } = await supabase
    .from("project_talents")
    .select("id, project_id, talent_id, extra_photo_paths, project:projects(project_type)")
    .eq("id", verified.projectTalentId)
    .maybeSingle();
  if (!pt) redirect("/submit/expired");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isModel = (pt.project as any)?.project_type === "model";
  const hasPhotos = (pt.extra_photo_paths ?? []).length > 0;

  // influ ต้องมีลิงก์อย่างน้อย 1 · model ขอให้มีอย่างใดอย่างหนึ่ง
  // (รูป/ลิงก์/คลิป) ก็บันทึกได้
  if (!isModel && links.length === 0) {
    redirect(
      `/submit/${token}?error=${encodeURIComponent("กรุณาใส่ลิงก์ผลงานอย่างน้อย 1 ลิงก์")}${fromAdminQS}`,
    );
  }
  if (isModel && links.length === 0 && !introVideo && !hasPhotos && !note) {
    redirect(
      `/submit/${token}?error=${encodeURIComponent("กรุณาใส่รูป ลิงก์ผลงาน หรือคลิปแนะนำตัว อย่างน้อย 1 อย่าง")}${fromAdminQS}`,
    );
  }

  const { error } = await supabase
    .from("project_talents")
    .update({
      submission_links: links,
      submission_note: note,
      intro_video_url: introVideo,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", pt.id);
  if (error) throw new Error(error.message);

  // งาน model: sync ผลงาน/คลิปเข้า record ของ talent ด้วย (เก็บถาวรในระบบ
  // เห็นในหน้า talent หลังบ้าน) — อัพเดตเฉพาะค่าที่ส่งมา ไม่ล้างของเดิม
  if (isModel && (links.length > 0 || introVideo)) {
    const talentUpdate: Record<string, unknown> = {};
    if (links.length > 0) talentUpdate.portfolio_links = links;
    if (introVideo) talentUpdate.intro_video_url = introVideo;
    await supabase.from("talents").update(talentUpdate).eq("id", pt.talent_id);
    revalidatePath(`/admin/talents/${pt.talent_id}`);
  }

  revalidatePath(`/admin/projects/${pt.project_id}`);
  // คงโหมด "แอดมินกรอกแทน" ไว้หลัง save เพื่อให้ยังเห็นปุ่มกลับหลังบ้าน
  redirect(`/submit/${token}?saved=1${fromAdminQS}`);
}

// แอดมินกด "ขอส่งงานทาง LINE" — push Flex พร้อมปุ่มเปิดฟอร์มส่งงาน
export async function requestSubmissionViaLine(formData: FormData) {
  const ptId = String(formData.get("pt_id"));
  const submitUrl = String(formData.get("submit_url"));

  const { data: pt } = await supabase
    .from("project_talents")
    .select("id, project_id, talent:talents(line_user_id), project:projects(name, project_type)")
    .eq("id", ptId)
    .maybeSingle();
  if (!pt) throw new Error("ไม่พบแถวนี้");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const talent = pt.talent as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = pt.project as any;
  if (!talent?.line_user_id) {
    throw new Error("talent คนนี้ยังไม่ได้ผูก LINE — ใช้ปุ่มคัดลอกลิงก์แทน");
  }
  // กัน URL แปลกปลอม: ต้องเป็นลิงก์ /submit/ ของโดเมนเราเท่านั้น
  if (!submitUrl.startsWith(`${BASE_URL}/submit/`)) {
    throw new Error("ลิงก์ส่งงานไม่ถูกต้อง");
  }

  const isModel = project.project_type === "model";
  const subtitle = isModel
    ? "ขอข้อมูลเพิ่มเพื่อเสนอลูกค้า 📸"
    : "ถึงเวลาส่งผลงานแล้ว 📤";
  const description = isModel
    ? "รบกวนส่ง รูปเพิ่ม 3 รูป, ลิงก์ผลงานที่เคยทำ และคลิปแนะนำตัว เพื่อทีมงานเสนอลูกค้าค่ะ"
    : "แนบลิงก์โพสต์ผลงานของคุณ (สูงสุด 5 ลิงก์) เพื่อทีมงานจะรวบรวมส่งรายงานให้ลูกค้าค่ะ";
  const buttonLabel = isModel ? "ส่งข้อมูล Casting 📸" : "ส่งลิงก์ผลงาน 📤";

  const flex = {
    type: "flex",
    altText: `📤 ${subtitle} — ${project.name}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0d1b2a",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "GAMDANG AGENCY", color: "#ffffff", weight: "bold", size: "sm" },
          { type: "text", text: subtitle, color: "#9fb3c8", size: "xs", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: project.name, weight: "bold", size: "lg", wrap: true, color: "#1D4ED8" },
          {
            type: "text",
            text: description,
            size: "sm",
            color: "#555555",
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "vertical",
            cornerRadius: "28px",
            paddingAll: "12px",
            background: {
              type: "linearGradient",
              angle: "90deg",
              startColor: "#1D4ED8",
              endColor: "#B82233",
            },
            action: { type: "uri", label: buttonLabel.slice(0, 20), uri: submitUrl },
            contents: [
              {
                type: "text",
                text: buttonLabel,
                color: "#ffffff",
                align: "center",
                weight: "bold",
                size: "md",
              },
            ],
          },
        ],
      },
    },
  };
  await pushLineMessage(talent.line_user_id, [flex]);
  revalidatePath(`/admin/projects/${pt.project_id}`);
}
