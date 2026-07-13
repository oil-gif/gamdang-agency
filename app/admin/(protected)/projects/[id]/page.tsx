import Link from "next/link";
import {
  addTalentToProject,
  deleteProject,
  getProject,
  getProjectTalents,
  moveProjectTalent,
  removeTalentFromProject,
  setProjectTalentCardType,
} from "@/actions/projects";
import {
  createProjectLink,
  getProjectLinks,
  renewProjectLink,
  revokeProjectLink,
} from "@/actions/project-links";
import { getTalents } from "@/actions/talents";
import { CopyButton } from "@/components/admin/CopyButton";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateAge } from "@/lib/age";
import { TIER_LABEL } from "@/lib/constants";
import { getPhotoProxyUrl } from "@/lib/storage";

const BASE_URL = "https://gamdang-app.vercel.app";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; pq?: string; prole?: string }>;
}) {
  const { id } = await params;
  const { error, pq, prole } = await searchParams;

  const [project, projectTalents, links] = await Promise.all([
    getProject(id),
    getProjectTalents(id),
    getProjectLinks(id),
  ]);

  // Talent picker: search active talents not already in this project.
  const existingIds = new Set(projectTalents.map((pt) => pt.talent_id));
  const candidates = (
    await getTalents({
      q: pq || undefined,
      role: prole === "model" || prole === "influencer" ? prole : undefined,
      status: "active",
    })
  )
    .filter((t) => !existingIds.has(t.id))
    .slice(0, 12);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-800">{project.name}</h1>
          {project.project_type === "influencer" ? (
            <Badge className="bg-[#B82233] text-white">งาน Influencer</Badge>
          ) : (
            <Badge className="bg-[#1D4ED8] text-white">งาน Model</Badge>
          )}
        </div>
        <form action={deleteProject}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" size="sm">
            ลบโปรเจกต์
          </Button>
        </form>
      </div>

      <ProjectForm project={project} error={error} />

      {/* ===== Talents in project ===== */}
      <section className="max-w-3xl space-y-4">
        <h2 className="text-lg font-semibold text-[#1D4ED8]">
          Talent ในโปรเจกต์ ({projectTalents.length})
        </h2>
        {projectTalents.length === 0 && (
          <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-neutral-400">
            ยังไม่มี talent — ค้นหาแล้วกด &quot;เพิ่ม&quot; ด้านล่าง
          </p>
        )}
        <div className="space-y-2">
          {projectTalents.map((pt, i) => {
            const t = pt.talent;
            return (
              <div
                key={pt.id}
                className="flex items-center gap-3 rounded-lg border bg-white p-3"
              >
                <span className="w-6 text-center font-mono text-sm text-neutral-400">
                  {i + 1}
                </span>
                <div className="size-14 shrink-0 overflow-hidden rounded-md border bg-neutral-100">
                  {pt.compcard_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPhotoProxyUrl(pt.compcard_path)}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[10px] text-neutral-400">
                      ไม่มีรูป
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/talents/${t.id}`}
                    className="font-medium text-neutral-800 hover:text-[#1D4ED8]"
                  >
                    {t.nickname_th}
                  </Link>
                  <p className="text-xs text-neutral-400">
                    {t.code}
                    {t.dob ? ` · ${calculateAge(t.dob)} ปี` : ""}
                    {t.is_influencer ? ` · ${TIER_LABEL[t.tier] ?? t.tier}` : ""}
                  </p>
                </div>

                {/* card type toggle */}
                <form action={setProjectTalentCardType}>
                  <input type="hidden" name="id" value={pt.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <input
                    type="hidden"
                    name="card_type"
                    value={pt.card_type === "compcard" ? "influcard" : "compcard"}
                  />
                  <Button type="submit" size="sm" variant="outline">
                    {pt.card_type === "compcard" ? "Comp Card" : "Influ Card"} ⇄
                  </Button>
                </form>

                {/* reorder */}
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

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {candidates.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-lg border bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-800">
                  {t.nickname_th}
                </p>
                <p className="text-xs text-neutral-400">
                  {t.code}
                  {t.dob ? ` · ${calculateAge(t.dob)} ปี` : ""}
                  {t.is_model ? " · Model" : ""}
                  {t.is_influencer ? " · Influ" : ""}
                </p>
              </div>
              <form action={addTalentToProject}>
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="talent_id" value={t.id} />
                <Button type="submit" size="sm">
                  + เพิ่ม
                </Button>
              </form>
            </div>
          ))}
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
              <div key={l.id} className="rounded-lg border bg-white p-3">
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
