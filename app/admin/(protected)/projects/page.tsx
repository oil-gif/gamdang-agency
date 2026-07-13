import Link from "next/link";
import { getProjects } from "@/actions/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export default async function ProjectsListPage() {
  const projects = await getProjects();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">
          Projects ({projects.length})
        </h1>
        <Button asChild>
          <Link href="/admin/projects/new">+ สร้างโปรเจกต์</Link>
        </Button>
      </div>

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
                  ยังไม่มีโปรเจกต์ — กด &quot;+ สร้างโปรเจกต์&quot; เพื่อเริ่ม
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
