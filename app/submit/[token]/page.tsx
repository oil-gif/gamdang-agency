import type { Metadata } from "next";
import { saveSubmission } from "@/actions/submission";
import { CastingPhotoUploader } from "@/components/talent/CastingPhotoUploader";
import { verifySubmitToken } from "@/lib/auth/talent-session";
import { supabase } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "ส่งข้อมูล/ผลงาน — GAMDANG AGENCY",
  robots: { index: false, follow: false },
};

const MAX_LINKS = 5;

function Shell({
  subtitle,
  children,
}: {
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-6 py-5 text-white">
          <p className="text-sm font-extrabold tracking-widest">GAMDANG AGENCY</p>
          <p className="mt-0.5 text-xs text-white/75">{subtitle}</p>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default async function SubmitWorkPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; saved?: string; from?: string }>;
}) {
  const { token } = await params;
  const { error, saved, from } = await searchParams;
  const fromAdmin = from === "admin";
  const verified = await verifySubmitToken(token);

  if (!verified) {
    return (
      <Shell subtitle="ส่งข้อมูล/ผลงาน">
        <h1 className="text-lg font-bold text-neutral-800">
          ลิงก์หมดอายุหรือไม่ถูกต้อง
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          กรุณาติดต่อทีมงาน GAMDANG AGENCY เพื่อขอลิงก์ใหม่ค่ะ
        </p>
      </Shell>
    );
  }

  const { data: pt } = await supabase
    .from("project_talents")
    .select(
      "id, project_id, submission_links, submission_note, submitted_at, extra_photo_paths, intro_video_url, talent:talents(nickname_th, nickname_en), project:projects(name, client_name, project_type)",
    )
    .eq("id", verified.projectTalentId)
    .maybeSingle();

  if (!pt) {
    return (
      <Shell subtitle="ส่งข้อมูล/ผลงาน">
        <h1 className="text-lg font-bold text-neutral-800">ไม่พบงานนี้แล้ว</h1>
        <p className="mt-2 text-sm text-neutral-500">
          กรุณาติดต่อทีมงาน GAMDANG AGENCY ค่ะ
        </p>
      </Shell>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const talent = pt.talent as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = pt.project as any;
  const isModel = project.project_type === "model";
  const name = talent?.nickname_th || talent?.nickname_en || "";
  const existing: string[] = pt.submission_links ?? [];
  const extraPhotos: string[] = pt.extra_photo_paths ?? [];

  return (
    <Shell
      subtitle={
        isModel ? "ส่งข้อมูล Casting (Model Profile)" : "ส่งลิงก์ผลงาน (Work Submission)"
      }
    >
      {/* แอดมินเปิดจากปุ่ม "กรอกแทน" — มีทางกลับหลังบ้าน */}
      {fromAdmin && (
        <a
          href={`/admin/projects/${pt.project_id}`}
          className="mb-3 block rounded-lg bg-[#1D4ED8]/5 px-3 py-2 text-sm font-medium text-[#1D4ED8] hover:bg-[#1D4ED8]/10"
        >
          ← กลับหน้าโปรเจกต์ (โหมดแอดมินกรอกแทน)
        </a>
      )}
      <p className="text-sm text-neutral-500">สวัสดีค่ะ คุณ{name} 👋</p>
      <h1 className="mt-1 text-xl font-bold text-[#1D4ED8]">{project.name}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {isModel
          ? "รบกวนส่งข้อมูลเพิ่มเติมเพื่อเสนอลูกค้าค่ะ: รูปเพิ่ม 3 รูป, ลิงก์ผลงานที่เคยทำ และคลิปแนะนำตัว"
          : `แนบลิงก์โพสต์ผลงานของคุณ (สูงสุด ${MAX_LINKS} ลิงก์) — ทีมงานจะรวบรวมทำรายงานส่งลูกค้าค่ะ`}
      </p>

      {saved && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
          ✓ บันทึกเรียบร้อยแล้ว ขอบคุณค่ะ 🙌
          (แก้ไขและกดบันทึกซ้ำได้จนกว่าลิงก์จะหมดอายุ)
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
          {error}
        </div>
      )}

      {isModel && (
        <div className="mt-5">
          <p className="mb-1.5 text-xs font-medium text-neutral-500">
            รูปเพิ่มเติม 3 รูป * (อัพโหลดแล้วบันทึกอัตโนมัติ)
          </p>
          <CastingPhotoUploader token={token} photos={extraPhotos} />
        </div>
      )}

      <form action={saveSubmission} className="mt-5 space-y-3">
        <input type="hidden" name="token" value={token} />
        {fromAdmin && <input type="hidden" name="from" value="admin" />}

        {isModel && (
          <div className="space-y-1">
            <label
              htmlFor="intro_video"
              className="text-xs font-medium text-neutral-500"
            >
              ลิงก์คลิปแนะนำตัว (TikTok / YouTube / Google Drive)
            </label>
            <input
              id="intro_video"
              name="intro_video"
              type="url"
              inputMode="url"
              placeholder="https://..."
              defaultValue={pt.intro_video_url ?? ""}
              className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>
        )}

        {Array.from({ length: MAX_LINKS }).map((_, i) => (
          <div key={i} className="space-y-1">
            <label
              htmlFor={`link_${i}`}
              className="text-xs font-medium text-neutral-500"
            >
              {isModel ? "ลิงก์ผลงานที่เคยทำ" : "ลิงก์ผลงานที่"} {i + 1}
              {isModel ? " (ถ้ามี)" : i === 0 ? " *" : " (ถ้ามี)"}
            </label>
            <input
              id={`link_${i}`}
              name={`link_${i}`}
              type="url"
              inputMode="url"
              placeholder="https://..."
              defaultValue={existing[i] ?? ""}
              required={!isModel && i === 0 && existing.length === 0}
              className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>
        ))}
        <div className="space-y-1">
          <label htmlFor="note" className="text-xs font-medium text-neutral-500">
            โน้ตถึงทีมงาน (ถ้ามี)
          </label>
          <textarea
            id="note"
            name="note"
            rows={2}
            defaultValue={pt.submission_note ?? ""}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20"
          />
        </div>
        <button
          type="submit"
          className="h-12 w-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] font-semibold text-white shadow-sm transition hover:opacity-95"
        >
          {isModel ? "บันทึกข้อมูล Casting 📤" : "บันทึกผลงาน 📤"}
        </button>
      </form>

      {pt.submitted_at && (
        <p className="mt-3 text-center text-xs text-neutral-400">
          ส่งล่าสุดเมื่อ{" "}
          {new Date(pt.submitted_at).toLocaleString("th-TH", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </Shell>
  );
}
