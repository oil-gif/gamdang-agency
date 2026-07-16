import Link from "next/link";
import {
  addProjectRole,
  addTalentToProject,
  approveApplication,
  deleteProject,
  deleteProjectRole,
  getPickerTalents,
  getProject,
  getProjectApplications,
  getProjectRoles,
  getProjectTalents,
  moveProjectTalent,
  rejectApplication,
  removeTalentFromProject,
  setProjectTalentCardType,
  setTalentResponseAdmin,
  toggleClientInterestAdmin,
} from "@/actions/projects";
import {
  createProjectLink,
  getProjectLinks,
  renewProjectLink,
  revokeProjectLink,
} from "@/actions/project-links";
import { notifyTalentViaLine, sendJobConfirmed } from "@/actions/job-notify";
import { requestSubmissionViaLine } from "@/actions/submission";
import { CopyButton } from "@/components/admin/CopyButton";
import { JobCopyButton } from "@/components/admin/JobCopyButton";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateAge } from "@/lib/age";
import { createJobToken, createSubmitToken } from "@/lib/auth/talent-session";
import { TIER_LABEL } from "@/lib/constants";
import { SITE_URL } from "@/lib/site";
import { formatFollowers, talentSocials, topSocial } from "@/lib/social";
import { getPhotoProxyUrl } from "@/lib/storage";

const BASE_URL = SITE_URL;

const RESPONSE_CHIP: Record<string, { label: string; className: string }> = {
  accepted: { label: "รับงานแล้ว ✓", className: "bg-emerald-100 text-emerald-700" },
  declined: { label: "ปฏิเสธงาน", className: "bg-rose-100 text-rose-700" },
  pending: { label: "แจ้งแล้ว · รอตอบ", className: "bg-amber-100 text-amber-700" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildJobMessage(project: any, jobUrl: string) {
  const dateEN = project.shooting_date
    ? new Date(project.shooting_date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "To Be Confirmed";
  return [
    "มีงานใหม่จาก GAMDANG AGENCY 🎬",
    `งาน: ${project.name}`,
    `Client: ${project.client_name || "To Be Confirmed"}`,
    `Shooting Date: ${dateEN}`,
    `Budget: ${project.budget || "To Be Confirmed"}`,
    "",
    "เช็คคิวและกดตอบรับได้ที่ลิงก์นี้ (ใช้ได้ 14 วัน):",
    jobUrl,
  ].join("\n");
}

function CardTypeSwitch({
  ptId,
  projectId,
  current,
}: {
  ptId: string;
  projectId: string;
  current: string;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-neutral-200 text-xs font-medium">
      {(
        [
          ["compcard", "Comp Card"],
          ["influcard", "Influ Card"],
        ] as const
      ).map(([value, label]) => {
        const active = current === value;
        return (
          <form key={value} action={setProjectTalentCardType}>
            <input type="hidden" name="id" value={ptId} />
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="card_type" value={value} />
            <button
              type="submit"
              disabled={active}
              className={
                active
                  ? "cursor-default bg-[#1D4ED8] px-3 py-1.5 text-white"
                  : "bg-white px-3 py-1.5 text-neutral-500 hover:bg-neutral-50"
              }
            >
              {label}
            </button>
          </form>
        );
      })}
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; pq?: string; prole?: string }>;
}) {
  const { id } = await params;
  const { error, pq, prole } = await searchParams;

  const [project, projectTalents, links, candidates, roles, applications] =
    await Promise.all([
      getProject(id),
      getProjectTalents(id),
      getProjectLinks(id),
      getPickerTalents(
        id,
        pq || undefined,
        prole === "model" || prole === "influencer" ? prole : undefined,
      ),
      getProjectRoles(id),
      getProjectApplications(id),
    ]);
  const pendingApps = applications.filter((a) => a.status === "pending");

  // token ต่อแถว (แจ้งงาน 14 วัน / ส่งงาน 60 วัน) — stateless JWT สร้างใหม่
  // ทุก render ได้ ของเก่ายังใช้ได้จนหมดอายุ
  const [jobTokens, submitTokens] = await Promise.all([
    Promise.all(projectTalents.map((pt) => createJobToken(pt.id))),
    Promise.all(projectTalents.map((pt) => createSubmitToken(pt.id))),
  ]);

  return (
    <div className="space-y-8">
      <Link
        href="/admin/projects"
        className="inline-block text-sm font-medium text-[#1D4ED8] hover:underline"
      >
        ← กลับรายการโปรเจกต์
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-800">{project.name}</h1>
          {project.project_type === "influencer" ? (
            <Badge className="bg-[#B82233] text-white">งาน Influencer</Badge>
          ) : (
            <Badge className="bg-[#1D4ED8] text-white">งาน Model</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/projects/${id}/print`}>🖨 สร้าง PDF</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/projects/${id}/report`}>📊 Report ผลงาน</Link>
          </Button>
          <form action={deleteProject}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="ghost" size="sm">
              ลบโปรเจกต์
            </Button>
          </form>
        </div>
      </div>

      <ProjectForm project={project} error={error} />

      {/* ===== ประกาศงานสาธารณะ: ลิงก์ + roles + ผู้สมัคร ===== */}
      {project.is_published && (
        <section className="max-w-3xl space-y-2 rounded-xl border border-[#B82233]/20 bg-[#B82233]/5 p-4">
          <p className="text-sm font-semibold text-[#B82233]">
            🌐 เผยแพร่หน้าเว็บแล้ว — ลิงก์แชร์:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-xs">
              {BASE_URL}/casting/{id}
            </code>
            <CopyButton text={`${BASE_URL}/casting/${id}`} />
            <Button asChild size="sm" variant="outline">
              <a href={`/casting/${id}`} target="_blank" rel="noopener noreferrer">
                เปิดดู
              </a>
            </Button>
          </div>
        </section>
      )}

      {/* ===== Roles ที่เปิดรับ ===== */}
      <section className="max-w-3xl space-y-3">
        <h2 className="text-lg font-semibold text-[#1D4ED8]">
          Roles ที่เปิดรับ ({roles.length})
        </h2>
        <div className="space-y-2">
          {roles.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 rounded-lg border bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-neutral-800">{r.title}</p>
                {r.description && (
                  <p className="text-sm text-neutral-500">{r.description}</p>
                )}
              </div>
              <form action={deleteProjectRole}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="project_id" value={id} />
                <Button type="submit" size="sm" variant="ghost">
                  ลบ
                </Button>
              </form>
            </div>
          ))}
        </div>
        <form
          action={addProjectRole}
          className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed bg-white p-3"
        >
          <input type="hidden" name="project_id" value={id} />
          <div className="space-y-1">
            <Label htmlFor="role_title">ชื่อ Role (เช่น นางเอก, เด็กชาย 5-7 ขวบ)</Label>
            <Input id="role_title" name="title" className="w-56" required />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <Label htmlFor="role_desc">รายละเอียด (ถ้ามี)</Label>
            <Input id="role_desc" name="description" placeholder="เพศ/อายุ/ลักษณะ/ค่าตัว" />
          </div>
          <Button type="submit">+ เพิ่ม Role</Button>
        </form>
      </section>

      {/* ===== ผู้สมัครเข้าร่วม (จากหน้าประกาศ) ===== */}
      <section className="max-w-3xl space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#1D4ED8]">
            ผู้สมัครเข้าร่วม (Applications)
          </h2>
          {pendingApps.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              ⏳ รออนุมัติ {pendingApps.length}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {applications.map((a) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const t = a.talent as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const role = a.role as any;
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm"
              >
                <div className="size-12 shrink-0 overflow-hidden rounded-full border bg-neutral-100">
                  {a.photo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPhotoProxyUrl(a.photo_path, 320)}
                      alt=""
                      className="size-full object-cover object-top"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/talents/${t?.id}`}
                    className="font-medium text-neutral-800 hover:text-[#1D4ED8]"
                  >
                    {t?.nickname_th || t?.nickname_en || "(ไม่มีชื่อ)"}
                  </Link>
                  <p className="text-xs text-neutral-400">
                    {t?.code}
                    {t?.dob ? ` · ${calculateAge(t.dob)} ปี` : ""}
                    {t?.phone ? ` · ${t.phone}` : ""}
                    {role?.title ? ` · สมัคร: ${role.title}` : ""}
                  </p>
                </div>
                {a.status === "pending" ? (
                  <>
                    <form action={approveApplication}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        ✓ รับเข้า Project
                      </Button>
                    </form>
                    <form action={rejectApplication}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <Button type="submit" size="sm" variant="ghost">
                        ปฏิเสธ
                      </Button>
                    </form>
                  </>
                ) : (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      a.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {a.status === "approved" ? "รับแล้ว ✓" : "ปฏิเสธ"}
                  </span>
                )}
              </div>
            );
          })}
          {applications.length === 0 && (
            <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-neutral-400">
              ยังไม่มีคนสมัครเข้าร่วมงานนี้ — แชร์ลิงก์ประกาศให้คนกดสมัคร
            </p>
          )}
        </div>
      </section>

      {/* ===== Talents in project ===== */}
      <section className="max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-[#1D4ED8]">
            Talent ในโปรเจกต์ ({projectTalents.length})
          </h2>
          {projectTalents.some((pt) => pt.client_interested) && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              ★ ลูกค้าเลือกแล้ว{" "}
              {projectTalents.filter((pt) => pt.client_interested).length} คน
            </span>
          )}
        </div>
        {projectTalents.length === 0 && (
          <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-neutral-400">
            ยังไม่มี talent — ค้นหาแล้วกด &quot;เพิ่ม&quot; ด้านล่าง
          </p>
        )}
        <div className="space-y-2">
          {projectTalents.map((pt, i) => {
            const t = pt.talent;
            const jobUrl = `${BASE_URL}/job/${jobTokens[i]}`;
            const submitUrl = `${BASE_URL}/submit/${submitTokens[i]}`;
            // ลิงก์ที่ talent ส่งในโปรเจกต์นี้ก่อน — ถ้าไม่มี ใช้ portfolio
            // ถาวรที่หน้า talent (แอดมินกรอกเองได้) มาโชว์แทน
            const submissionLinks: string[] = pt.submission_links ?? [];
            const portfolioLinks: string[] = (t.portfolio_links ?? []) as string[];
            const showLinks =
              submissionLinks.length > 0 ? submissionLinks : portfolioLinks;
            const linksFromProfile = submissionLinks.length === 0;
            const introVideo = t.intro_video_url ?? pt.intro_video_url ?? null;
            const responseChip = pt.talent_response
              ? RESPONSE_CHIP[pt.talent_response]
              : null;
            return (
              <div
                key={pt.id}
                className="space-y-2.5 rounded-xl border bg-white p-3 shadow-sm"
              >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-mono text-sm text-neutral-400">
                  {i + 1}
                </span>
                <div className="size-14 shrink-0 overflow-hidden rounded-full border bg-neutral-100">
                  {(pt.card_type === "influcard"
                    ? (pt.gallery_paths[0] ?? pt.compcard_path)
                    : (pt.compcard_path ?? pt.gallery_paths[0])) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPhotoProxyUrl(
                        pt.card_type === "influcard"
                          ? (pt.gallery_paths[0] ?? pt.compcard_path!)
                          : (pt.compcard_path ?? pt.gallery_paths[0]!),
                      )}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[9px] text-neutral-400">
                      ไม่มีรูป
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/talents/${t.id}`}
                      className="font-medium text-neutral-800 hover:text-[#1D4ED8]"
                    >
                      {t.nickname_th}
                    </Link>
                    {pt.client_interested && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        ★ ลูกค้าสนใจ
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400">
                    {t.code}
                    {t.dob ? ` · ${calculateAge(t.dob)} ปี` : ""}
                    {t.is_influencer ? ` · ${TIER_LABEL[t.tier] ?? t.tier}` : ""}
                  </p>
                </div>

                <CardTypeSwitch ptId={pt.id} projectId={id} current={pt.card_type} />

                <div className="flex flex-col">
                  <form action={moveProjectTalent}>
                    <input type="hidden" name="id" value={pt.id} />
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="dir" value="up" />
                    <button
                      type="submit"
                      disabled={i === 0}
                      className="px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                      aria-label="เลื่อนขึ้น"
                    >
                      ▲
                    </button>
                  </form>
                  <form action={moveProjectTalent}>
                    <input type="hidden" name="id" value={pt.id} />
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="dir" value="down" />
                    <button
                      type="submit"
                      disabled={i === projectTalents.length - 1}
                      className="px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                      aria-label="เลื่อนลง"
                    >
                      ▼
                    </button>
                  </form>
                </div>

                <form action={removeTalentFromProject}>
                  <input type="hidden" name="id" value={pt.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <Button type="submit" size="sm" variant="ghost">
                    เอาออก
                  </Button>
                </form>
              </div>

              {/* แถบแจ้งงาน + สถานะตอบรับ */}
              <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-2.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    responseChip
                      ? responseChip.className
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {responseChip ? responseChip.label : "ยังไม่แจ้งงาน"}
                </span>
                {/* แอดมินบันทึกคำตอบแทน talent (คุยกันนอกระบบ) */}
                {(["accepted", "declined"] as const).map((r) =>
                  pt.talent_response === r ? null : (
                    <form key={r} action={setTalentResponseAdmin}>
                      <input type="hidden" name="pt_id" value={pt.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <input type="hidden" name="response" value={r} />
                      <button
                        type="submit"
                        title="บันทึกคำตอบแทน talent"
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                          r === "accepted"
                            ? "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                            : "border-rose-300 text-rose-500 hover:bg-rose-50"
                        }`}
                      >
                        {r === "accepted" ? "บันทึกว่ารับงาน" : "บันทึกว่าปฏิเสธ"}
                      </button>
                    </form>
                  ),
                )}
                <span className="flex-1" />
                {t.line_user_id && (
                  <form action={notifyTalentViaLine}>
                    <input type="hidden" name="pt_id" value={pt.id} />
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-[#06C755] text-white hover:bg-[#05b04c]"
                    >
                      📨 แจ้งงานทาง LINE
                    </Button>
                  </form>
                )}
                {t.line_user_id && pt.talent_response === "accepted" && (
                  <form action={sendJobConfirmed}>
                    <input type="hidden" name="pt_id" value={pt.id} />
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] text-white hover:opacity-90"
                    >
                      🎉 ส่ง Job Confirmed
                    </Button>
                  </form>
                )}
                <JobCopyButton
                  text={buildJobMessage(project, jobUrl)}
                  ptId={pt.id}
                />
              </div>

              {/* แถบส่งงาน/ผลงาน + สถานะลูกค้าเลือก */}
              <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-2.5">
                {/* แอดมินติ๊ก "ลูกค้าสนใจ" แทนลูกค้าได้ */}
                <form action={toggleClientInterestAdmin}>
                  <input type="hidden" name="pt_id" value={pt.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <button
                    type="submit"
                    title="ติ๊กแทนลูกค้าได้ (กดซ้ำเพื่อยกเลิก)"
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                      pt.client_interested
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border border-neutral-300 text-neutral-500 hover:border-emerald-500 hover:text-emerald-600"
                    }`}
                  >
                    ★ ลูกค้าสนใจ{pt.client_interested ? " ✓" : ""}
                  </button>
                </form>
                {pt.submitted_at ? (
                  <span className="rounded-full bg-[#1D4ED8]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                    📤 ส่งงานแล้ว {submissionLinks.length} ลิงก์
                  </span>
                ) : showLinks.length > 0 ? (
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600">
                    🗂 ลิงก์จากโปรไฟล์ {showLinks.length} ลิงก์
                  </span>
                ) : (
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-500">
                    ยังไม่มีผลงาน
                  </span>
                )}
                {(pt.extra_photo_paths ?? []).length > 0 && (
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600">
                    🖼 {(pt.extra_photo_paths ?? []).length} รูป
                  </span>
                )}
                {introVideo && (
                  <a
                    href={introVideo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] text-neutral-500 hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
                  >
                    🎬 คลิปแนะนำตัว
                  </a>
                )}
                {showLinks.map((link, li) => (
                  <a
                    key={li}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={linksFromProfile ? "ลิงก์จากโปรไฟล์ talent" : "ลิงก์ที่ส่งในโปรเจกต์นี้"}
                    className="max-w-40 truncate rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] text-neutral-500 hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
                  >
                    🔗 {link.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                ))}
                <span className="flex-1" />
                {t.line_user_id && (
                  <form action={requestSubmissionViaLine}>
                    <input type="hidden" name="pt_id" value={pt.id} />
                    <input type="hidden" name="submit_url" value={submitUrl} />
                    <Button type="submit" size="sm" variant="outline">
                      {project.project_type === "model"
                        ? "📸 ขอรูปและลิงก์ผลงานเพิ่ม (LINE)"
                        : "📤 ขอส่งงานทาง LINE"}
                    </Button>
                  </form>
                )}
                {/* แอดมินเปิดฟอร์มเดียวกับ talent เพื่อกรอกแทนได้เลย
                    (?from=admin → ฟอร์มมีปุ่มกลับหน้าโปรเจกต์) */}
                <Button asChild size="sm" variant="ghost">
                  <a
                    href={`${submitUrl}?from=admin`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ✏️ กรอกแทน
                  </a>
                </Button>
                <CopyButton
                  text={submitUrl}
                  label={
                    project.project_type === "model"
                      ? "คัดลอกลิงก์ขอรูป/ผลงาน"
                      : "คัดลอกลิงก์ส่งงาน"
                  }
                />
              </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Talent picker ===== */}
      <section className="max-w-3xl space-y-4">
        <h2 className="text-lg font-semibold text-[#1D4ED8]">เพิ่ม Talent</h2>
        <form method="GET" className="flex flex-wrap gap-2">
          <Input
            name="pq"
            placeholder="ค้นหาชื่อ / code..."
            defaultValue={pq ?? ""}
            className="max-w-xs"
          />
          <select
            name="prole"
            defaultValue={prole ?? ""}
            className="rounded-md border bg-white px-3 text-sm"
          >
            <option value="">ทุกบทบาท</option>
            <option value="model">Model</option>
            <option value="influencer">Influencer</option>
          </select>
          <Button type="submit" variant="outline">
            ค้นหา
          </Button>
        </form>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {candidates.map((t) => {
            const top = topSocial(t);
            const socials = talentSocials(t);
            const expertise = ((t.categories ?? []) as string[]).slice(0, 3);
            return (
              <div
                key={t.id}
                className="flex gap-3 rounded-xl border bg-white p-3 shadow-sm"
              >
                <div className="size-16 shrink-0 overflow-hidden rounded-full border bg-neutral-100">
                  {t.photo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPhotoProxyUrl(t.photo_path)}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[9px] text-neutral-400">
                      ไม่มีรูป
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <p className="truncate font-medium text-neutral-800">
                      {t.nickname_th}
                    </p>
                    <span className="font-mono text-[10px] text-neutral-400">
                      {t.code}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {t.dob ? `${calculateAge(t.dob)} ปี` : ""}
                    {t.is_model ? " · Model" : ""}
                    {t.is_influencer
                      ? ` · ${TIER_LABEL[t.tier] ?? t.tier}${top ? ` · ${formatFollowers(top.followers)} on ${top.label}` : ""}`
                      : ""}
                  </p>
                  {expertise.length > 0 && (
                    <p className="mt-0.5 truncate text-[11px] text-[#B82233]">
                      {expertise.join(" · ")}
                    </p>
                  )}
                  {socials.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {socials.map((s) => (
                        <span
                          key={s.key}
                          title={s.label}
                          className="flex size-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                          style={{ backgroundColor: s.color }}
                        >
                          {s.short}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <form action={addTalentToProject} className="self-center">
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="talent_id" value={t.id} />
                  <Button type="submit" size="sm">
                    + เพิ่ม
                  </Button>
                </form>
              </div>
            );
          })}
          {candidates.length === 0 && (
            <p className="text-sm text-neutral-400 sm:col-span-2">
              ไม่พบ talent (แสดงเฉพาะสถานะ &quot;อนุมัติแล้ว&quot; ที่ยังไม่อยู่ในโปรเจกต์)
            </p>
          )}
        </div>
      </section>

      {/* ===== Client links ===== */}
      <section className="max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1D4ED8]">
            ลิงก์ส่งลูกค้า (Client Links)
          </h2>
          <form action={createProjectLink}>
            <input type="hidden" name="project_id" value={id} />
            <Button type="submit">+ สร้างลิงก์</Button>
          </form>
        </div>
        <div className="space-y-2">
          {links.map((l) => {
            const url = `${BASE_URL}/p/${l.token}`;
            const expired = l.expires_at && new Date(l.expires_at) < new Date();
            return (
              <div key={l.id} className="rounded-xl border bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-neutral-50 px-2 py-1 text-xs">
                    {url}
                  </code>
                  <CopyButton text={url} />
                  {l.status === "active" && !expired ? (
                    <form action={revokeProjectLink}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <Button type="submit" size="sm" variant="ghost">
                        ยกเลิก
                      </Button>
                    </form>
                  ) : (
                    <form action={renewProjectLink}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <Button type="submit" size="sm" variant="outline">
                        ต่ออายุ
                      </Button>
                    </form>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-neutral-400">
                  {l.status === "revoked"
                    ? "ยกเลิกแล้ว"
                    : expired
                      ? "หมดอายุแล้ว"
                      : `ใช้ได้ถึง ${new Date(l.expires_at!).toLocaleDateString("th-TH")}`}
                  {" · "}เปิดดู {l.view_count} ครั้ง
                  {l.tc_accepted &&
                    ` · ลูกค้ายอมรับ T&C แล้ว (${new Date(l.tc_accepted_at!).toLocaleString("th-TH")})`}
                </p>
              </div>
            );
          })}
          {links.length === 0 && (
            <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-neutral-400">
              ยังไม่มีลิงก์ — กด &quot;+ สร้างลิงก์&quot; แล้วส่ง URL ให้ลูกค้า
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
