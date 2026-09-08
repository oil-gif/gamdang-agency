import { Fragment } from "react";
import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import {
  addProjectRole,
  addTalentToProject,
  approveApplication,
  discardQuickTalent,
  clearSentToClient,
  deleteProject,
  deleteProjectRole,
  getPickerTalents,
  getProject,
  getProjectApplications,
  getProjectRoles,
  getProjectTalents,
  markSentToClient,
  rejectApplication,
  unrejectApplication,
  removeTalentFromProject,
  reorderProjectTalents,
  saveQuickTalents,
  reorderProjectRoles,
  setProjectTalentCardType,
  setProjectTalentRole,
  setTalentResponseAdmin,
  toggleClientInterestAdmin,
  updateProjectRole,
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
import {
  SubmittedPosts,
  readPosts,
} from "@/components/admin/SubmittedPosts";
import { JobCopyButton } from "@/components/admin/JobCopyButton";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateAge } from "@/lib/age";
import { createJobToken, createSubmitToken } from "@/lib/auth/talent-session";
import { SocialIcon } from "@/components/SocialIcon";
import { CATEGORIES, TIER_LABEL } from "@/lib/constants";
import { SITE_URL } from "@/lib/site";
import { formatFollowers, talentSocials, topSocial } from "@/lib/social";
import { getPhotoProxyUrl } from "@/lib/storage";
import { formatEnDate, formatThaiDate, formatThaiDateTime } from "@/lib/datetime";
import { DangerConfirmButton } from "@/components/admin/DangerConfirmButton";
import { TalentExtraInfo } from "@/components/admin/TalentExtraInfo";
import { CollapsibleSection } from "@/components/admin/CollapsibleSection";
import { DragOrderList } from "@/components/admin/DragOrderList";
import { QuickTalentUpload } from "@/components/admin/QuickTalentUpload";
import { parseExtraDetails } from "@/lib/extra-details";
import { FALLBACK_PHRASE, hasDangerCode } from "@/lib/danger";
import { LINE_FAIL_TEXT, type LineFailReason } from "@/lib/line-messaging";

const BASE_URL = SITE_URL;

const RESPONSE_CHIP: Record<string, { label: string; className: string }> = {
  accepted: { label: "รับงานแล้ว ✓", className: "bg-emerald-100 text-emerald-700" },
  declined: { label: "ปฏิเสธงาน", className: "bg-rose-100 text-rose-700" },
  pending: { label: "แจ้งแล้ว · รอตอบ", className: "bg-amber-100 text-amber-700" },
};

const SENT_VIA_LABEL: Record<string, string> = {
  line: "ทางไลน์",
  email: "ทางอีเมล",
  link: "ทางลิงก์ในระบบ",
  other: "ช่องทางอื่น",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildJobMessage(project: any, jobUrl: string) {
  const dateEN = project.shooting_date
    ? formatEnDate(project.shooting_date, {
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) || undefined;
  const many = (v: string | string[] | undefined) =>
    v == null ? [] : Array.isArray(v) ? v : [v];
  const numOr = (v: string | string[] | undefined) => {
    const n = Number(one(v));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const error = one(sp.error);
  const linefail = one(sp.linefail);
  const pq = one(sp.pq);
  const prole = one(sp.prole);
  const pgender = one(sp.pgender);
  const ptiers = many(sp.ptier);
  const pcats = many(sp.pcat);
  const pminage = numOr(sp.pminage);
  const pmaxage = numOr(sp.pmaxage);
  const ppage = numOr(sp.ppage) ?? 1;

  const [project, projectTalents, links, picker, roles, applications] =
    await Promise.all([
      getProject(id),
      getProjectTalents(id),
      getProjectLinks(id),
      getPickerTalents(id, {
        q: pq,
        role: prole === "model" || prole === "influencer" ? prole : undefined,
        gender:
          pgender === "male" || pgender === "female" || pgender === "other"
            ? pgender
            : undefined,
        tiers: ptiers,
        categories: pcats,
        minAge: pminage,
        maxAge: pmaxage,
        page: ppage,
      }),
      getProjectRoles(id),
      getProjectApplications(id),
    ]);
  const candidates = picker.candidates;

  // ใครส่งใบสมัครงานนี้มาแล้วบ้าง — ช่องค้นหาตัดออกเฉพาะ "คนที่อยู่ในงานแล้ว"
  // คนที่เพิ่งสมัครเข้ามาจึงยังโผล่ในช่องค้นหาอยู่ · ถ้าเจ้าหน้าที่กด + เพิ่ม จาก
  // ตรงนี้ ใบสมัครของเขาจะค้างเป็น "รอตอบ" ไม่ถูกปิด และ Role ที่เขาเลือกมาเอง
  // จะหาย → ติดป้ายบอกให้ไปกดอนุมัติที่ใบสมัครแทน (พี่เจ้าของถาม 2026-09-01)
  const appliedTalentIds = new Map<string, string>();
  for (const a of applications) {
    const tid = (a as { talent_id?: string }).talent_id;
    if (tid) appliedTalentIds.set(tid, String(a.status ?? "pending"));
  }

  // สร้างลิงก์ pagination โดยคงตัวกรอง picker เดิม (anchor #picker)
  const pickerHref = (page: number) => {
    const q = new URLSearchParams();
    if (pq) q.set("pq", pq);
    if (prole) q.set("prole", prole);
    if (pgender) q.set("pgender", pgender);
    for (const t of ptiers) q.append("ptier", t);
    for (const c of pcats) q.append("pcat", c);
    if (pminage) q.set("pminage", String(pminage));
    if (pmaxage) q.set("pmaxage", String(pmaxage));
    if (page > 1) q.set("ppage", String(page));
    q.set("open", "picker"); // กันกล่อง picker พับตอนเปลี่ยนหน้า
    const s = q.toString();
    return `/admin/projects/${id}${s ? `?${s}` : ""}#picker`;
  };
  const pendingApps = applications.filter((a) => a.status === "pending");
  // กล่องที่ถูกพับต้องกางเองเมื่อผู้ใช้ "ตั้งใจจะไปที่นั่น" ไม่งั้นกดลิงก์แล้ว
  // เจอกล่องปิด เหมือนปุ่มไม่ทำงาน · anchor (#picker) ส่งมาถึง server ไม่ได้
  // เลยต้องใช้ ?open=<ชื่อกล่อง> ควบคู่ไปด้วย
  const openParam = one(sp.open);
  // แบ่งรายชื่อ Talent ตาม Role (พี่เจ้าของเสนอ 2026-08-30) — หน้าที่มี 80 คน
  // ส่งข้อมูล 3 MB / ฟอร์ม 815 อัน ทำให้เบราว์เซอร์ต่อสายปุ่มไม่ทันจนกดไม่ติด
  // ลากจัดลำดับถูกจำกัดให้อยู่ใน Role เดียวกันอยู่แล้ว แบ่งแบบนี้เลยไม่เสียอะไร
  const troleParam = one(sp.trole);
  const tpage = numOr(sp.tpage) ?? 1;
  const pickerActive =
    openParam === "picker" ||
    Boolean(pq || prole || pgender || ptiers.length || pcats.length || pminage || pmaxage) ||
    ppage > 1;
  // ลูกค้าเปิดลิงก์ในระบบไปแล้วกี่ครั้ง — ใช้เป็นสัญญาณช่วยเตือนตอนที่ยังไม่ได้
  // บันทึกสถานะ "ส่งแล้ว" ด้วยมือ
  const totalLinkViews = links.reduce(
    (sum, l) => sum + (l.view_count ?? 0),
    0,
  );

  // ===== แบ่งรายชื่อ Talent: เลือก Role → แล้วแบ่งหน้าถ้ายังเยอะ =====
  const TALENTS_PER_PAGE = 20;
  const roleGroups: { key: string; title: string; count: number }[] = [];
  for (const pt of projectTalents) {
    const key = pt.role_id ?? "none";
    const found = roleGroups.find((g) => g.key === key);
    if (found) found.count += 1;
    else
      roleGroups.push({
        key,
        title: pt.role_title ?? "ไม่ระบุ Role",
        count: 1,
      });
  }
  // งานเล็ก (≤20 คน) ไม่ต้องแบ่งอะไรเลย · งานใหญ่เปิดมาที่ Role แรกก่อน
  const needsSplit = projectTalents.length > TALENTS_PER_PAGE;
  const selectedRole =
    troleParam && (troleParam === "all" || roleGroups.some((g) => g.key === troleParam))
      ? troleParam
      : needsSplit && roleGroups.length > 1
        ? roleGroups[0].key
        : "all";
  const inRole =
    selectedRole === "all"
      ? projectTalents
      : projectTalents.filter((pt) => (pt.role_id ?? "none") === selectedRole);
  const talentTotalPages = Math.max(
    Math.ceil(inRole.length / TALENTS_PER_PAGE),
    1,
  );
  const talentPage = Math.min(Math.max(tpage, 1), talentTotalPages);
  const visibleTalents = inRole.slice(
    (talentPage - 1) * TALENTS_PER_PAGE,
    talentPage * TALENTS_PER_PAGE,
  );
  const talentHref = (over: { trole?: string; tpage?: number }) => {
    const q = new URLSearchParams();
    const role = over.trole ?? selectedRole;
    if (role !== "all") q.set("trole", role);
    const pg = over.tpage ?? 1;
    if (pg > 1) q.set("tpage", String(pg));
    const str = q.toString();
    return `/admin/projects/${id}${str ? `?${str}` : ""}#talents`;
  };

  // token ต่อแถว (แจ้งงาน 14 วัน / ส่งงาน 60 วัน) — stateless JWT สร้างใหม่
  // ทุก render ได้ ของเก่ายังใช้ได้จนหมดอายุ
  // สร้างเฉพาะคนที่โชว์จริง — เดิมสร้างให้ทุกคน (81 คน = 162 JWT ฝังในหน้า)
  const [jobTokens, submitTokens] = await Promise.all([
    Promise.all(visibleTalents.map((pt) => createJobToken(pt.id))),
    Promise.all(visibleTalents.map((pt) => createSubmitToken(pt.id))),
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
          {/* ทางลัดไปหาลิงก์ Report ที่ส่งให้ลูกค้า — อยู่ในกล่อง "ส่งให้ลูกค้า"
              ด้านล่าง แต่หาไม่เจอถ้าไม่รู้ว่าอยู่ตรงไหน */}
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/projects/${id}?open=send#send-client`}>
              {links.length === 0
                ? "🔗 สร้างลิงก์ให้ลูกค้า"
                : "🔗 ลิงก์ Report ให้ลูกค้า"}
            </Link>
          </Button>
          <DangerConfirmButton
            action={deleteProject}
            hiddenFields={{ id }}
            label="ลบโปรเจกต์"
            title={`ลบโปรเจกต์ "${project.name}"?`}
            description={`Talent ในงาน ${projectTalents.length} คน · ใบสมัคร ${applications.length} ใบ · ลิงก์ลูกค้าทั้งหมด จะถูกลบถาวร — กู้คืนไม่ได้`}
            confirmLabel="ลบโปรเจกต์ถาวร"
            needsCode={hasDangerCode()}
            fallbackPhrase={FALLBACK_PHRASE}
          />
        </div>
      </div>

      {/* ส่ง LINE ไม่ออก (โควตาเต็ม/ถูกบล็อก) — ต้องบอกให้ชัด ไม่งั้นแอดมิน
          เข้าใจว่าแจ้งงานไปแล้วทั้งที่น้องไม่ได้รับอะไร */}
      {linefail && (
        <section className="max-w-3xl rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">
            ⚠️ ส่งข้อความ LINE ไม่สำเร็จ — กรุณาแจ้งน้องเองค่ะ
          </p>
          <p className="mt-1 text-sm text-amber-800">
            สาเหตุ:{" "}
            {LINE_FAIL_TEXT[linefail as LineFailReason] ?? LINE_FAIL_TEXT.failed}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            ใช้ปุ่ม &quot;📋 คัดลอกข้อความแจ้งงาน&quot; แล้วส่งทางแชทเองได้เลย
          </p>
        </section>
      )}

      {/* โน้ตภายในทีม — โชว์บนสุดให้เห็นก่อนทำงาน (แก้ได้ในฟอร์มด้านล่าง)
          ห้ามย้ายไป render ในหน้า /casting /p/[token] /print /report */}
      {project.internal_note && (
        <section className="max-w-3xl rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-900">
            🔒 โน้ตภายใน (ทีมงานเห็นเท่านั้น — ลูกค้า/คนสมัครไม่เห็น)
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-amber-950">
            {project.internal_note}
          </p>
        </section>
      )}

      {/* ตั้งค่าครั้งเดียวตอนสร้างงาน — พับไว้ แต่กางเองถ้าบันทึกไม่ผ่าน
          (ไม่งั้นผู้ใช้ไม่เห็นข้อความ error ที่อยู่ในฟอร์ม) */}
      <CollapsibleSection
        icon="⚙️"
        title="ข้อมูลงาน + ประกาศรับสมัคร"
        hint="ชื่องาน · ลูกค้า · วันถ่าย · Budget · โน้ตภายใน"
        defaultOpen={Boolean(error)}
      >
        <ProjectForm project={project} error={error} />
      </CollapsibleSection>

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
      {/* ใส่ครั้งเดียวตอนเปิดงาน — พับไว้ แต่กางเองตอนยังไม่มี Role เลย */}
      <CollapsibleSection
        id="roles"
        icon="🎭"
        title="Roles ที่เปิดรับ"
        badge={roles.length}
        hint="ใส่ครั้งเดียวตอนเปิดงาน"
        defaultOpen={roles.length === 0 || openParam === "roles"}
      >
      <section className="space-y-3">
        <p className="text-sm text-neutral-500">
          แก้ข้อความในช่องแล้วกด <b>บันทึก</b> ได้เลย — ผู้สมัครที่เลือก Role นี้ไว้ไม่หลุด
        </p>
        {/* ลากจัดลำดับ Role — กลุ่มไหนขึ้นก่อนในหน้านี้ ใบเสนอ PDF และ Report */}
        <DragOrderList
          saveAction={reorderProjectRoles.bind(null, id)}
          showGroupHeaders={false}
          items={roles.map((r) => ({
            id: r.id,
            roleTitle: null,
            node: (
            <div className="rounded-lg border bg-white p-3">
              {/* แก้ข้อความ Role ได้ในที่ (ข้อความมักยาว เช่นเรตค่าตัว/เงื่อนไข) */}
              <form action={updateProjectRole} className="space-y-2">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="project_id" value={id} />
                <div className="space-y-1">
                  <Label
                    htmlFor={`role_title_${r.id}`}
                    className="text-xs font-normal text-neutral-400"
                  >
                    ชื่อ Role / รายละเอียดงาน
                  </Label>
                  <Textarea
                    id={`role_title_${r.id}`}
                    name="title"
                    rows={2}
                    defaultValue={r.title}
                    required
                    className="font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor={`role_desc_${r.id}`}
                    className="text-xs font-normal text-neutral-400"
                  >
                    รายละเอียดย่อย (เพศ/อายุ/ลักษณะ)
                  </Label>
                  <Input
                    id={`role_desc_${r.id}`}
                    name="description"
                    defaultValue={r.description ?? ""}
                    placeholder="เช่น หญิง, เด็กผู้ชายและเด็กผู้หญิง"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm">
                    บันทึก
                  </Button>
                  <span className="flex-1" />
                </div>
              </form>
              <form action={deleteProjectRole} className="mt-1">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="project_id" value={id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50"
                >
                  ลบ Role นี้
                </Button>
              </form>
            </div>
            ),
          }))}
        />
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
      </CollapsibleSection>

      {/* ===== ผู้สมัครเข้าร่วม (จากหน้าประกาศ) ===== */}
      {/* กางเองเมื่อมีใบสมัครรอตรวจ — งานที่ต้องรีบดู */}
      <CollapsibleSection
        id="applications"
        icon="📝"
        title="ผู้สมัครเข้าร่วม"
        badge={
          pendingApps.length > 0
            ? `รอตรวจ ${pendingApps.length}`
            : applications.length
        }
        hint={pendingApps.length > 0 ? "มีคนรอให้ตรวจ" : "ตรวจครบแล้ว"}
        defaultOpen={pendingApps.length > 0 || openParam === "applications"}
      >
      <section className="space-y-3">
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
                    href={`/admin/talents/${t?.id}?from=${encodeURIComponent(`/admin/projects/${id}?open=applications#applications`)}`}
                    className="font-medium text-neutral-800 hover:text-[#1D4ED8] hover:underline"
                  >
                    {t?.nickname_en || t?.nickname_th || "(ไม่มีชื่อ)"}
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
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        a.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {a.status === "approved" ? "รับแล้ว ✓" : "ปฏิเสธ"}
                    </span>
                    {/* กดปฏิเสธผิด — เอากลับมารอตรวจได้ */}
                    {a.status === "rejected" && (
                      <form action={unrejectApplication}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="project_id" value={id} />
                        <button
                          type="submit"
                          title="กดผิด? คืนใบสมัครกลับเป็นรอตรวจ"
                          className="rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] font-medium text-neutral-500 transition hover:bg-neutral-100"
                        >
                          ↩︎ กดคืน
                        </button>
                      </form>
                    )}
                  </div>
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
      </CollapsibleSection>

      {/* ===== Talents in project ===== */}
      {/* งานประจำวัน — ไม่พับ อยู่ใกล้บนสุดเสมอ (การ์ดแต่ละคนคงรูปแบบเดิม) */}
      <section id="talents" className="max-w-3xl space-y-4 scroll-mt-4">
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
        {/* คำอธิบายปุ่ม — พนักงานสับสนว่าปุ่มไหนส่งข้อความหาน้องจริง ปุ่มไหน
            แค่บันทึกไว้เฉยๆ (พี่เจ้าของแจ้ง 2026-08-24) · พับไว้ ไม่ให้รก */}
        {projectTalents.length > 0 && (
          <details className="rounded-lg border border-neutral-200 bg-neutral-50/70 text-xs">
            <summary className="cursor-pointer list-none px-3 py-2 font-medium text-neutral-500 hover:text-neutral-700">
              ℹ️ ปุ่มไหนทำอะไร? (กดดูคำอธิบาย)
            </summary>
            <div className="space-y-2 border-t border-neutral-200 px-3 py-2.5">
              <p className="text-neutral-600">
                <b className="text-neutral-800">สีของปุ่มบอกว่าเกิดอะไรขึ้น:</b>
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="rounded-full bg-[#06C755] px-2 py-0.5 font-semibold text-white">
                    เขียว
                  </span>
                  <span className="text-neutral-600">
                    = <b>ส่งข้อความหาน้องทาง LINE จริง</b> (น้องได้รับทันที)
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="rounded-full border border-neutral-300 bg-white px-2 py-0.5 font-semibold text-neutral-600">
                    ขาว/เส้นขอบ
                  </span>
                  <span className="text-neutral-600">
                    = <b>บันทึกในระบบเฉยๆ</b> ไม่มีอะไรส่งออกไป
                  </span>
                </span>
              </div>
              <div className="space-y-1 border-t border-neutral-200 pt-2 text-neutral-600">
                <p>
                  <b className="text-neutral-700">① แจ้งงาน</b> — ส่งงานให้น้องดู
                  แล้วบันทึกว่าเขารับหรือปฏิเสธ (บันทึกแทนได้ถ้าคุยกันนอกระบบ)
                </p>
                <p>
                  <b className="text-neutral-700">② ส่งงาน</b> — ขอให้น้องส่งผลงาน
                  · &quot;กรอกแทน&quot; = เปิดฟอร์มเดียวกับน้องเพื่อกรอกให้เอง
                </p>
                <p>
                  <b className="text-neutral-700">③ โพสต์ที่ลง</b> — ผลงานที่ส่งมาแล้ว
                  แยกตามช่องทาง · ป้าย <b>⟳ auto</b> = ยอดที่ระบบดึงมาเอง
                </p>
              </div>
            </div>
          </details>
        )}
        {projectTalents.length === 0 && (
          <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-neutral-400">
            ยังไม่มี talent — ค้นหาแล้วกด &quot;เพิ่ม&quot; ด้านล่าง
          </p>
        )}
        {/* เลือกดูทีละ Role — งานใหญ่ 80 คนโหลดพร้อมกันแล้วปุ่มกดไม่ติด
            (ลากจัดลำดับจำกัดอยู่ใน Role เดียวกันอยู่แล้ว เลยไม่เสียอะไร) */}
        {needsSplit && roleGroups.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
            <span className="px-1 text-[11px] font-semibold text-neutral-500">
              ดูทีละ Role:
            </span>
            {roleGroups.map((g) => (
              <Link
                key={g.key}
                href={talentHref({ trole: g.key })}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedRole === g.key
                    ? "bg-[#B82233] text-white shadow-sm"
                    : "border border-neutral-300 bg-white text-neutral-600 hover:border-[#B82233]"
                }`}
              >
                🎭 {g.title.length > 26 ? g.title.slice(0, 26) + "…" : g.title}{" "}
                ({g.count})
              </Link>
            ))}
            <Link
              href={talentHref({ trole: "all" })}
              title="ช้ากว่า แต่ลากสลับข้าม Role ได้"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                selectedRole === "all"
                  ? "bg-neutral-700 text-white"
                  : "border border-neutral-300 bg-white text-neutral-500 hover:border-neutral-500"
              }`}
            >
              ทั้งหมด ({projectTalents.length})
            </Link>
          </div>
        )}

        {inRole.length > TALENTS_PER_PAGE && (
          <p className="text-xs text-neutral-500">
            แสดง {(talentPage - 1) * TALENTS_PER_PAGE + 1}–
            {(talentPage - 1) * TALENTS_PER_PAGE + visibleTalents.length} จาก{" "}
            {inRole.length} คน
            <span className="ml-1 text-neutral-400">
              — ลากจัดลำดับได้เฉพาะคนที่อยู่ในหน้านี้
            </span>
          </p>
        )}

        {/* ลากวางจัดลำดับ (ในกลุ่ม Role เดียวกัน) — บันทึกทีเดียวตอนปล่อยนิ้ว */}
        <DragOrderList
          saveAction={reorderProjectTalents.bind(null, id)}
          items={visibleTalents.map((pt, i) => {
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
            // โพสต์แยกช่องทาง + ยอด (migration 024) — งาน influencer ใช้ตัวนี้
            const posts = readPosts(pt);
            const showPosts = project.project_type !== "model" && posts.length > 0;
            const introVideo = t.intro_video_url ?? pt.intro_video_url ?? null;
            const responseChip = pt.talent_response
              ? RESPONSE_CHIP[pt.talent_response]
              : null;
            // หัวข้อ Role กับลำดับย้ายไปให้ TalentReorderList จัดการ
            // (มันต้องขยับตามตอนลาก)
            return {
              id: pt.id,
              roleTitle: pt.role_title ?? null,
              node: (
              <div className="space-y-2.5 rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
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
                      href={`/admin/talents/${t.id}?from=${encodeURIComponent(`/admin/projects/${id}`)}`}
                      className="font-medium text-neutral-800 hover:text-[#1D4ED8] hover:underline"
                    >
                      {t.nickname_en || t.nickname_th}
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
                  {/* เปลี่ยน/ย้าย Role ได้ (งานที่มีหลาย Role) */}
                  {roles.length > 0 && (
                    <form
                      action={setProjectTalentRole}
                      className="mt-1 flex items-center gap-1.5"
                    >
                      <input type="hidden" name="id" value={pt.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <span className="text-[11px] text-neutral-400">🎭</span>
                      <select
                        name="role_id"
                        defaultValue={pt.role_id ?? ""}
                        className="max-w-[10rem] rounded-md border border-neutral-300 bg-white px-1.5 py-0.5 text-[11px] text-neutral-700"
                        aria-label="Role"
                      >
                        <option value="">— ไม่ระบุ Role —</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="text-[11px] font-medium text-[#1D4ED8] hover:underline"
                      >
                        ย้าย
                      </button>
                    </form>
                  )}
                </div>

                <CardTypeSwitch ptId={pt.id} projectId={id} current={pt.card_type} />

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
                <span className="w-full shrink-0 text-[10px] font-bold tracking-wide text-neutral-400 sm:w-20">
                  ① แจ้งงาน
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    responseChip
                      ? responseChip.className
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {responseChip ? responseChip.label : "ยังไม่แจ้งงาน"}
                </span>
                {/* แอดมินบันทึกคำตอบแทน talent (คุยกันนอกระบบ)
                    — กดสลับไปมาได้ตลอด ปุ่มที่กดอยู่จะเป็นสีทึบ กดซ้ำ = คืนค่า
                    (กันทีมงานกดผิดแล้วแก้ไม่ได้) */}
                {(["accepted", "declined"] as const).map((r) => {
                  const isCurrent = pt.talent_response === r;
                  const accepted = r === "accepted";
                  return (
                    <form key={r} action={setTalentResponseAdmin}>
                      <input type="hidden" name="pt_id" value={pt.id} />
                      <input type="hidden" name="project_id" value={id} />
                      {/* กดปุ่มที่เลือกอยู่ = คืนกลับเป็น "รอตอบ" */}
                      <input
                        type="hidden"
                        name="response"
                        value={isCurrent ? "pending" : r}
                      />
                      <button
                        type="submit"
                        title={
                          isCurrent
                            ? "กดอีกครั้งเพื่อคืนค่า (กลับเป็นรอตอบ)"
                            : "บันทึกคำตอบแทน talent — กดเปลี่ยนได้ตลอด"
                        }
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                          isCurrent
                            ? accepted
                              ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                              : "border-rose-500 bg-rose-500 text-white hover:bg-rose-600"
                            : accepted
                              ? "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                              : "border-rose-300 text-rose-500 hover:bg-rose-50"
                        }`}
                      >
                        {isCurrent && "↩︎ "}
                        {accepted ? "บันทึกว่ารับงาน" : "บันทึกว่าปฏิเสธ"}
                        {isCurrent && " (กดคืน)"}
                      </button>
                    </form>
                  );
                })}
                {/* เผลอกดตอนที่ยังไม่ได้แจ้งงาน — ล้างกลับเป็น "ยังไม่แจ้งงาน" */}
                {pt.talent_response === "pending" && (
                  <form action={setTalentResponseAdmin}>
                    <input type="hidden" name="pt_id" value={pt.id} />
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="response" value="none" />
                    <button
                      type="submit"
                      title="ล้างสถานะกลับเป็นยังไม่แจ้งงาน"
                      className="rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] font-medium text-neutral-500 transition hover:bg-neutral-100"
                    >
                      ล้างสถานะ
                    </button>
                  </form>
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
                <span className="w-full shrink-0 text-[10px] font-bold tracking-wide text-neutral-400 sm:w-20">
                  ② ส่งงาน
                </span>
                {/* แอดมินติ๊ก "ลูกค้าสนใจ" แทนลูกค้าได้ */}
                <form action={toggleClientInterestAdmin}>
                  <input type="hidden" name="pt_id" value={pt.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <button
                    type="submit"
                    title={
                      pt.client_interested
                        ? "กดอีกครั้งเพื่อคืนค่า (เอาดาวออก)"
                        : "ติ๊กแทนลูกค้าได้ — กดซ้ำเพื่อยกเลิกได้ตลอด"
                    }
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                      pt.client_interested
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border border-neutral-300 text-neutral-500 hover:border-emerald-500 hover:text-emerald-600"
                    }`}
                  >
                    ★ ลูกค้าสนใจ{pt.client_interested ? " ✓ (กดคืน)" : ""}
                  </button>
                </form>
                {pt.submitted_at ? (
                  <span className="rounded-full bg-[#1D4ED8]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                    📤 ส่งงานแล้ว{" "}
                    {showPosts ? `${posts.length} โพสต์` : `${submissionLinks.length} ลิงก์`}
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
                {!showPosts &&
                  showLinks.map((link, li) => (
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

              {/* โพสต์ที่ส่งงานมา แยกช่องทาง + ยอด (งาน Influencer) */}
              {showPosts && (
                <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-2.5">
                  <span className="w-full shrink-0 text-[10px] font-bold tracking-wide text-neutral-400 sm:w-20">
                    ③ โพสต์ที่ลง
                  </span>
                  <div className="min-w-0 flex-1">
                    <SubmittedPosts posts={posts} />
                  </div>
                </div>
              )}

              {/* ข้อมูลเพิ่มเติมที่ลูกค้าถาม (English Level, Passport, Swim ฯลฯ)
                  — วางไว้ตรงนี้เพราะแอดมินคุยกับลูกค้าอยู่หน้านี้ ดู migration 022 */}
              <div className="border-t border-neutral-100 pt-2.5">
                <TalentExtraInfo
                  ptId={pt.id}
                  projectId={id}
                  talentId={t.id}
                  talentName={t.nickname_en || t.nickname_th || t.code || "คนนี้"}
                  details={parseExtraDetails(t.extra_details)}
                  note={pt.notes ?? ""}
                  noteShow={pt.notes_show === true}
                  showSocials={pt.show_socials === true}
                  socialCount={talentSocials(t).length}
                />
              </div>
              </div>
              ),
            };
          })}
        />

        {/* เปลี่ยนหน้า (เมื่อ Role เดียวมีเกิน 20 คน) */}
        {talentTotalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            {talentPage > 1 ? (
              <Link
                href={talentHref({ tpage: talentPage - 1 })}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:border-[#B82233] hover:text-[#B82233]"
              >
                ← ก่อนหน้า
              </Link>
            ) : (
              <span className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-300">
                ← ก่อนหน้า
              </span>
            )}
            <span className="px-2 text-xs font-semibold text-neutral-500">
              หน้า {talentPage} / {talentTotalPages}
            </span>
            {talentPage < talentTotalPages ? (
              <Link
                href={talentHref({ tpage: talentPage + 1 })}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:border-[#B82233] hover:text-[#B82233]"
              >
                ถัดไป →
              </Link>
            ) : (
              <span className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-300">
                ถัดไป →
              </span>
            )}
          </div>
        )}
      </section>

      {/* ===== เพิ่มด่วนจากคอมการ์ด ===== */}
      {/* บางคนเรามีแค่คอมการ์ด ไม่รู้วันเกิด/ส่วนสูง → เดิมเอาเข้างานไม่ได้เลย
          เพราะต้องกรอกฟอร์มเต็มทีละคน (พี่เจ้าของแจ้ง 2026-09-08) */}
      <CollapsibleSection
        id="quickadd"
        icon="⚡"
        title="เพิ่มด่วนจากคอมการ์ด"
        badge="มีแค่รูป + ชื่อ ก็เสนอลูกค้าได้"
        hint="ใช้ตอนมีแต่คอมการ์ด"
        defaultOpen={openParam === "quickadd"}
      >
        <QuickTalentUpload
          projectId={id}
          roles={roles.map((r) => ({ id: r.id, title: r.title }))}
          saveAction={saveQuickTalents.bind(null, id)}
          discardAction={discardQuickTalent}
        />
      </CollapsibleSection>

      {/* ===== Talent picker ===== */}
      {/* พับไว้ — ใช้ตอนจัดทีมเท่านั้น · แต่ต้องกางเองเมื่อผู้ใช้กำลังค้นหา
          หรือกดเปลี่ยนหน้าอยู่ ไม่งั้นกดแล้วเหมือนไม่มีอะไรเกิดขึ้น */}
      <CollapsibleSection
        id="picker"
        icon="➕"
        title="ค้นหา / เพิ่มคนเข้างาน"
        badge={`เลือกได้ ${picker.total} คน`}
        hint="ใช้ตอนจัดทีม"
        defaultOpen={pickerActive}
      >
      <section className="space-y-4">
        {/* ตอบคำถามที่เจ้าหน้าที่สงสัยบ่อย: ทำไมคนที่สมัครมาแล้วยังขึ้นตรงนี้ */}
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-500">
          รายชื่อนี้ตัด <b>คนที่อยู่ในงานนี้แล้ว</b> ออกให้อัตโนมัติ ·
          ส่วนคนที่ <b>ส่งใบสมัครมา</b> จะยังขึ้นอยู่ (มีป้าย 📩 กำกับ)
          จนกว่าจะกดอนุมัติใบสมัคร — คนที่มีป้าย ให้กด{" "}
          <b>อนุมัติที่ใบสมัคร</b> แทนการกด + เพิ่ม ตรงนี้ ใบสมัครจะได้ถูกปิด
          และได้ Role ที่เขาเลือกมาเอง
        </p>
        <form
          method="GET"
          className="space-y-3 rounded-xl border bg-white p-4"
        >
          <div className="flex flex-wrap items-end gap-2">
            <Input
              name="pq"
              placeholder="ค้นหาชื่อ / code..."
              defaultValue={pq ?? ""}
              className="max-w-xs"
            />
            <select
              name="prole"
              defaultValue={prole ?? ""}
              className="h-9 rounded-md border bg-white px-3 text-sm"
            >
              <option value="">ทุกบทบาท</option>
              <option value="model">Model</option>
              <option value="influencer">Influencer</option>
            </select>
            <select
              name="pgender"
              defaultValue={pgender ?? ""}
              className="h-9 rounded-md border bg-white px-3 text-sm"
            >
              <option value="">ทุกเพศ</option>
              <option value="female">หญิง</option>
              <option value="male">ชาย</option>
              <option value="other">อื่นๆ / LGBTQ+</option>
            </select>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-neutral-500">อายุ</span>
              <input
                name="pminage"
                type="number"
                min={0}
                placeholder="ต่ำ"
                defaultValue={pminage ?? ""}
                className="h-9 w-16 rounded-md border px-2 text-sm"
              />
              <span className="text-neutral-400">–</span>
              <input
                name="pmaxage"
                type="number"
                min={0}
                placeholder="สูง"
                defaultValue={pmaxage ?? ""}
                className="h-9 w-16 rounded-md border px-2 text-sm"
              />
              <span className="text-neutral-400">ปี</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <p className="mb-1 text-xs font-medium text-neutral-500">Tier</p>
              <div className="flex flex-wrap gap-1.5">
                {(["nano", "micro", "mid", "macro", "celeb"] as const).map((tr) => (
                  <label
                    key={tr}
                    className="flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition has-[:checked]:border-[#1D4ED8] has-[:checked]:bg-[#1D4ED8]/5"
                  >
                    <input
                      type="checkbox"
                      name="ptier"
                      value={tr}
                      defaultChecked={ptiers.includes(tr)}
                      className="size-3.5"
                    />
                    {TIER_LABEL[tr] ?? tr}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-neutral-500">
                Expertise
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition has-[:checked]:border-[#B82233] has-[:checked]:bg-[#B82233]/5"
                  >
                    <input
                      type="checkbox"
                      name="pcat"
                      value={c}
                      defaultChecked={pcats.includes(c)}
                      className="size-3.5"
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="outline">
              กรอง
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/admin/projects/${id}?open=picker#picker`}>ล้างตัวกรอง</Link>
            </Button>
          </div>
        </form>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {candidates.map((t) => {
            const top = topSocial(t);
            const socials = talentSocials(t);
            const expertise = ((t.categories ?? []) as string[]).slice(0, 3);
            const appliedStatus = appliedTalentIds.get(t.id);
            const isDraft = t.status === "draft";
            return (
              <div
                key={t.id}
                className={`rounded-xl border bg-white p-3 shadow-sm ${
                  appliedStatus === "pending"
                    ? "border-amber-300 ring-1 ring-amber-200"
                    : ""
                }`}
              >
                {/* ===== แถวบน: รูป + ชื่อ/รายละเอียด (กว้างเต็มการ์ด) ===== */}
                <div className="flex gap-3">
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
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    {/* กดชื่อ → เปิดโปรไฟล์ (มีปุ่มกลับมาโปรเจกต์นี้)
                        ชื่อยาวให้ตกบรรทัด ไม่ตัดด้วย … (พี่เจ้าของแจ้ง 2026-09-01
                        เดิมการ์ดวางเป็นแถวเดียว ชื่อโดนบีบจนเหลือ "Ph…") */}
                    <Link
                      href={`/admin/talents/${t.id}?from=${encodeURIComponent(`/admin/projects/${id}?open=picker#picker`)}`}
                      className="font-medium break-words text-neutral-800 hover:text-[#1D4ED8] hover:underline"
                    >
                      {t.nickname_en ?? t.nickname_th}
                    </Link>
                    {t.nickname_en && t.nickname_th && (
                      <span className="text-xs text-neutral-500">
                        ({t.nickname_th})
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-neutral-400">
                      {t.code}
                    </span>
                  </div>
                  {isDraft && (
                    <p className="mt-1 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                      ⚡ ใบร่าง — มีแต่คอมการ์ด ยังไม่เข้าระบบ Talent
                    </p>
                  )}
                  {appliedStatus && (
                    <p
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        appliedStatus === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {appliedStatus === "pending"
                        ? "📩 สมัครงานนี้มาแล้ว — อนุมัติที่ใบสมัครด้านบน"
                        : "📩 เคยส่งใบสมัครงานนี้"}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500">
                    {t.dob ? `${calculateAge(t.dob)} ปี` : ""}
                    {t.is_model ? " · Model" : ""}
                    {t.is_influencer
                      ? ` · ${TIER_LABEL[t.tier] ?? t.tier}${top ? ` · ${formatFollowers(top.followers)} on ${top.label}` : ""}`
                      : ""}
                  </p>
                  {expertise.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-[#B82233]">
                      {expertise.join(" · ")}
                    </p>
                  )}
                  {socials.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {socials.map((s) => (
                        <SocialIcon key={s.key} platform={s.key} size={20} title={s.label} />
                      ))}
                    </div>
                  )}
                </div>
                </div>

                {/* ===== แถวล่าง: เลือก Role + ปุ่มเพิ่ม (เต็มความกว้าง) ===== */}
                <form
                  action={addTalentToProject}
                  className="mt-2.5 flex items-center gap-2"
                >
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="talent_id" value={t.id} />
                  {roles.length > 0 && (
                    <select
                      name="role_id"
                      defaultValue={roles[0].id}
                      className="h-8 min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 text-xs text-neutral-700"
                      aria-label="เลือก Role"
                    >
                      <option value="">— ไม่ระบุ Role —</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button type="submit" size="sm" className="shrink-0">
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

        <div className="pt-1">
          <Pagination
            page={ppage}
            totalPages={picker.totalPages}
            hrefFor={pickerHref}
          />
        </div>
      </section>

      </CollapsibleSection>

      {/* ===== ส่งให้ลูกค้า: สถานะที่บันทึกเอง + ลิงก์ ===== */}
      {/* กางเองถ้ายังไม่ได้บันทึกว่าส่ง — เตือนว่ายังมีงานค้าง */}
      <CollapsibleSection
        id="send-client"
        icon="📤"
        title="ส่งให้ลูกค้า"
        badge={project.client_sent_at ? "ส่งแล้ว ✓" : "ยังไม่ส่ง"}
        hint={`ลิงก์ลูกค้า ${links.length} ลิงก์ · เปิดดู ${totalLinkViews} ครั้ง`}
        defaultOpen={!project.client_sent_at || openParam === "send"}
      >
      <section className="space-y-4">

        {/* ลูกค้าบางเจ้าขอให้ส่งไฟล์ทางไลน์ ไม่เปิดลิงก์เอง view_count เลยไม่ขยับ
            — ต้องให้แอดมินบันทึกไว้เองว่าส่งไปแล้ว */}
        {project.client_sent_at ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                ✅ ส่งให้ลูกค้าแล้ว
              </span>
              <span className="text-sm text-emerald-900">
                {SENT_VIA_LABEL[project.client_sent_via] ?? "ช่องทางอื่น"} ·{" "}
                {formatThaiDateTime(project.client_sent_at)}
              </span>
              <span className="flex-1" />
              <form action={clearSentToClient}>
                <input type="hidden" name="project_id" value={id} />
                <button
                  type="submit"
                  className="text-xs text-neutral-500 hover:text-[#B82233] hover:underline"
                >
                  ล้างสถานะ
                </button>
              </form>
            </div>
            {project.client_sent_note && (
              <p className="mt-1.5 text-xs text-emerald-800">
                📝 {project.client_sent_note}
              </p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-[#1D4ED8] hover:underline">
                แก้ช่องทาง / หมายเหตุ
              </summary>
              <form
                action={markSentToClient}
                className="mt-2 flex flex-wrap items-end gap-2"
              >
                <input type="hidden" name="project_id" value={id} />
                <div className="space-y-1">
                  <Label
                    htmlFor="sent_via"
                    className="text-xs font-normal text-neutral-500"
                  >
                    ส่งทางไหน
                  </Label>
                  <select
                    id="sent_via"
                    name="via"
                    defaultValue={project.client_sent_via ?? "line"}
                    className="h-9 rounded-md border border-input bg-white px-2 text-sm shadow-xs"
                  >
                    <option value="line">ไลน์</option>
                    <option value="email">อีเมล</option>
                    <option value="link">ลิงก์ในระบบ</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
                <div className="min-w-[12rem] flex-1 space-y-1">
                  <Label
                    htmlFor="sent_note"
                    className="text-xs font-normal text-neutral-500"
                  >
                    หมายเหตุ (ไม่ใส่ก็ได้)
                  </Label>
                  <Input
                    id="sent_note"
                    name="note"
                    defaultValue={project.client_sent_note ?? ""}
                    placeholder="เช่น ส่งกลุ่มไลน์คุณเอ"
                  />
                </div>
                <Button type="submit" variant="outline">
                  บันทึกการแก้ไข
                </Button>
              </form>
              <p className="mt-1 text-[11px] text-neutral-500">
                แก้แล้ววันที่เดิมไม่เปลี่ยน — ถ้าอยากได้วันที่ใหม่ ให้กด
                &quot;ล้างสถานะ&quot; แล้วบันทึกใหม่
              </p>
            </details>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-white p-3">
            <p className="text-sm text-neutral-500">
              ⚪ <b className="text-neutral-700">ยังไม่ได้บันทึกว่าส่งให้ลูกค้า</b>{" "}
              — ถ้าส่งรายชื่อ/ไฟล์ทางไลน์หรืออีเมลไปแล้ว กดบันทึกไว้กันลืม
            </p>
            {totalLinkViews > 0 && (
              <p className="mt-1 text-xs text-[#1D4ED8]">
                ℹ️ ลูกค้าเปิดดูลิงก์ในระบบแล้ว {totalLinkViews} ครั้ง
              </p>
            )}
            <form
              action={markSentToClient}
              className="mt-2 flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="project_id" value={id} />
              <div className="space-y-1">
                <Label
                  htmlFor="sent_via"
                  className="text-xs font-normal text-neutral-500"
                >
                  ส่งทางไหน
                </Label>
                <select
                  id="sent_via"
                  name="via"
                  defaultValue="line"
                  className="h-9 rounded-md border border-input bg-white px-2 text-sm shadow-xs"
                >
                  <option value="line">ไลน์</option>
                  <option value="email">อีเมล</option>
                  <option value="link">ลิงก์ในระบบ</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>
              <div className="min-w-[12rem] flex-1 space-y-1">
                <Label
                  htmlFor="sent_note"
                  className="text-xs font-normal text-neutral-500"
                >
                  หมายเหตุ (ไม่ใส่ก็ได้)
                </Label>
                <Input
                  id="sent_note"
                  name="note"
                  placeholder="เช่น ส่งกลุ่มไลน์คุณเอ"
                />
              </div>
              <Button type="submit">✅ บันทึกว่าส่งแล้ว</Button>
            </form>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <h3 className="font-semibold text-neutral-700">
            ลิงก์ส่งลูกค้า (Client Links)
          </h3>
          <form action={createProjectLink}>
            <input type="hidden" name="project_id" value={id} />
            <Button type="submit">+ สร้างลิงก์</Button>
          </form>
        </div>
        <div className="space-y-2">
          {links.map((l) => {
            const url = `${BASE_URL}/p/${l.token}`;
            // ลิงก์ Report ใช้ token ใบเดียวกัน — ลูกค้าคนเดิม งานเดิม
            // (ต้องกดยอมรับเงื่อนไขที่หน้า /p ก่อน ถึงจะเปิด /r ได้)
            const reportUrl = `${BASE_URL}/r/${l.token}`;
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

                {/* ลิงก์ Report — ใช้ token เดียวกับด้านบน ให้ลูกค้ากดดูรายงานเองได้
                    ไม่ต้องส่ง PDF · โชว์แม้ลิงก์หมดอายุ (แค่เตือนให้ต่ออายุก่อน)
                    เดิมซ่อนทั้งแถวตอนหมดอายุ แอดมินเลยหาปุ่มไม่เจอ นึกว่าไม่มี
                    ระบบนี้ (พี่เจ้าของแจ้ง 2026-08-24) */}
                {l.status !== "revoked" && (
                  <div className="mt-1.5 border-t border-neutral-100 pt-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="shrink-0 text-[11px] font-semibold text-[#B82233]">
                        📊 Report:
                      </span>
                      <code
                        className={`min-w-0 flex-1 truncate rounded px-2 py-1 text-xs ${
                          expired ? "bg-neutral-100 text-neutral-400" : "bg-neutral-50"
                        }`}
                      >
                        {reportUrl}
                      </code>
                      <CopyButton text={reportUrl} label="คัดลอกลิงก์ Report" />
                    </div>
                    {expired && (
                      <p className="mt-1 text-[11px] font-medium text-amber-700">
                        ⚠️ ลิงก์หมดอายุแล้ว — กด &quot;ต่ออายุ&quot; ด้านบนก่อน
                        ลูกค้าถึงจะเปิดดูได้
                      </p>
                    )}
                  </div>
                )}

                <p className="mt-1.5 text-xs text-neutral-400">
                  {l.status === "revoked"
                    ? "ยกเลิกแล้ว"
                    : expired
                      ? "หมดอายุแล้ว"
                      : `ใช้ได้ถึง ${formatThaiDate(l.expires_at!)}`}
                  {" · "}เปิดดู {l.view_count} ครั้ง
                  {l.tc_accepted &&
                    ` · ลูกค้ายอมรับ T&C แล้ว (${formatThaiDateTime(l.tc_accepted_at!)})`}
                </p>
              </div>
            );
          })}
          {links.length === 0 && (
            <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-neutral-400">
              ยังไม่มีลิงก์ — กด &quot;+ สร้างลิงก์&quot; ด้านบนก่อน
              <span className="mt-1 block text-neutral-500">
                1 ลิงก์ได้ <b>2 อย่าง</b>: หน้าเสนอทาเลนต์ให้ลูกค้าเลือก
                และ <b>📊 ลิงก์ Report</b> สรุปผลงาน
              </span>
            </p>
          )}
        </div>
      </section>
      </CollapsibleSection>
    </div>
  );
}
