import Link from "next/link";
import { getProjectsPage, type ProjectFilters } from "@/actions/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PROJECTS_PAGE_SIZE } from "@/lib/constants";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

type RawParams = Record<string, string | undefined>;

export default async function ProjectsListPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = await searchParams;
  const filters: ProjectFilters = {
    q: params.q || undefined,
    type:
      params.type === "model" || params.type === "influencer"
        ? params.type
        : undefined,
    year: params.year ? parseInt(params.year, 10) || undefined : undefined,
  };
  const page = Math.max(parseInt(params.page ?? "1", 10) || 1, 1);
  const { projects, total } = await getProjectsPage(filters, page);
  const totalPages = Math.max(Math.ceil(total / PROJECTS_PAGE_SIZE), 1);

  // ตัวเลือกปี: ปีหน้า → ย้อนหลัง 6 ปี (พ.ศ. ในหน้าจอ)
  const nowYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => nowYear + 1 - i);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams(
      Object.entries(params).filter(([k, v]) => v && k !== "page") as [
        string,
        string,
      ][],
    );
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/projects${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">
          Projects ({total})
        </h1>
        <Button asChild>
          <Link href="/admin/projects/new">+ สร้างโปรเจกต์</Link>
        </Button>
      </div>

      {/* ค้นหา/กรองโปรเจกต์ — ออกแบบเผื่อเป็นร้อยเป็นพันโปรเจกต์ */}
      <form
        method="get"
        className="grid grid-cols-2 gap-3 rounded-lg border bg-white p-4 sm:grid-cols-4 lg:grid-cols-5"
      >
        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="q">ค้นหา (ชื่องาน / ลูกค้า)</Label>
          <Input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="เช่น Uniqlo หรือ Momo"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">ประเภทงาน</Label>
          <select
            id="type"
            name="type"
            defaultValue={params.type ?? ""}
            className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm shadow-xs"
          >
            <option value="">ทั้งหมด</option>
            <option value="model">งาน Model</option>
            <option value="influencer">งาน Influencer</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="year">ปีของงาน</Label>
          <select
            id="year"
            name="year"
            defaultValue={params.year ?? ""}
            className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm shadow-xs"
          >
            <option value="">ทุกปี</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y} ({y + 543})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">ค้นหา</Button>
          <Button asChild variant="outline" type="button">
            <Link href="/admin/projects">ล้าง</Link>
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่องาน</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>ลูกค้า</TableHead>
              <TableHead>Shooting Date</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Talent</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>
                  {p.project_type === "influencer" ? (
                    <Badge className="bg-[#B82233] text-white">Influencer</Badge>
                  ) : (
                    <Badge className="bg-[#1D4ED8] text-white">Model</Badge>
                  )}
                </TableCell>
                <TableCell>{p.client_name ?? "-"}</TableCell>
                <TableCell>
                  {p.shooting_date
                    ? new Date(p.shooting_date).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </TableCell>
                <TableCell>{p.budget ?? "-"}</TableCell>
                <TableCell>{p.project_talents?.[0]?.count ?? 0} คน</TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "default" : "outline"}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/projects/${p.id}`}>เปิด</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-neutral-400">
                  ไม่พบโปรเจกต์ที่ตรงกับตัวกรอง
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 text-sm">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>← ก่อนหน้า</Link>
            </Button>
          )}
          <span className="text-neutral-400">
            หน้า {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>ถัดไป →</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
