import type { Metadata } from "next";
import { respondToJob } from "@/actions/job-response";
import { verifyJobToken } from "@/lib/auth/talent-session";
import { supabase } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "ตอบรับงาน — GAMDANG AGENCY",
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-6 py-5 text-white">
          <p className="text-sm font-extrabold tracking-widest">GAMDANG AGENCY</p>
          <p className="mt-0.5 text-xs text-white/75">แจ้งงานใหม่ (Job Offer)</p>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default async function JobOfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = await verifyJobToken(token);

  if (!verified) {
    return (
      <Shell>
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
      "id, talent_response, talent:talents(nickname_th, nickname_en), project:projects(name, client_name, shooting_date, budget, description)",
    )
    .eq("id", verified.projectTalentId)
    .maybeSingle();

  if (!pt) {
    return (
      <Shell>
        <h1 className="text-lg font-bold text-neutral-800">ไม่พบงานนี้แล้ว</h1>
        <p className="mt-2 text-sm text-neutral-500">
          งานอาจถูกยกเลิกไปแล้ว กรุณาติดต่อทีมงาน GAMDANG AGENCY ค่ะ
        </p>
      </Shell>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const talent = pt.talent as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = pt.project as any;
  const name = talent?.nickname_th || talent?.nickname_en || "";

  const rows: [string, string][] = [
    ["Client", project.client_name || "To Be Confirmed"],
    [
      "Shooting Date",
      project.shooting_date
        ? new Date(project.shooting_date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "To Be Confirmed",
    ],
    ["Budget", project.budget || "To Be Confirmed"],
  ];

  return (
    <Shell>
      <p className="text-sm text-neutral-500">สวัสดีค่ะ คุณ{name} 👋</p>
      <h1 className="mt-1 text-xl font-bold text-[#1D4ED8]">{project.name}</h1>

      <div className="mt-4 space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <span className="text-neutral-400">{label}</span>
            <span className="text-right font-semibold text-neutral-800">
              {value}
            </span>
          </div>
        ))}
        {project.description && (
          <p className="border-t border-neutral-200 pt-2 leading-6 text-neutral-600">
            {project.description}
          </p>
        )}
      </div>

      {pt.talent_response === "accepted" && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
          ✓ รับทราบความสนใจแล้ว — รบกวนล็อกคิววันถ่ายไว้ก่อนนะคะ ทีมงานจะส่ง
          &quot;Job Confirmed 🎉&quot; ยืนยันอีกครั้งเมื่อลูกค้าคอนเฟิร์มค่ะ
        </div>
      )}
      {pt.talent_response === "declined" && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-700">
          คุณแจ้งไม่สะดวกไว้ — เปลี่ยนใจสามารถกด &quot;สนใจ&quot; ด้านล่างได้ค่ะ
        </div>
      )}

      <div className="mt-5 space-y-3">
        <form action={respondToJob}>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="response" value="accepted" />
          <button
            type="submit"
            className="h-12 w-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            สนใจ (Interested)
          </button>
        </form>
        <form action={respondToJob}>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="response" value="declined" />
          <button
            type="submit"
            className="h-12 w-full rounded-full bg-neutral-200 font-semibold text-neutral-600 transition hover:bg-neutral-300"
          >
            ไม่สะดวก
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-neutral-400">
        ปุ่มนี้เป็นการเช็คคิวเบื้องต้น — งานจะยืนยันอีกครั้งด้วยข้อความ
        &quot;Job Confirmed 🎉&quot; จากทีมงาน GAMDANG AGENCY ค่ะ
      </p>
    </Shell>
  );
}
