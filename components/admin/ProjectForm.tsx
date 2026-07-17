"use client";

import { saveProject } from "@/actions/projects";
import { ProjectCoverUploader } from "@/components/admin/ProjectCoverUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Project = {
  id?: string;
  name?: string | null;
  client_name?: string | null;
  description?: string | null;
  project_type?: string;
  shooting_date?: string | null;
  budget?: string | null;
  status?: string;
  category?: string | null;
  cover_path?: string | null;
  is_published?: boolean;
  casting_closed?: boolean;
};

const CATEGORIES = [
  "TV Commercial",
  "Ads Commercial",
  "Movie",
  "Series",
  "MV",
  "Lookbook Shooting",
  "Fashionshow",
  "Print / Photo",
  "Event / Presenter",
  "Online / Influencer",
  "Other",
];

export function ProjectForm({
  project,
  error,
}: {
  project?: Project;
  error?: string;
}) {
  return (
    <form action={saveProject} className="max-w-3xl space-y-6">
      {project?.id && <input type="hidden" name="id" value={project.id} />}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1D4ED8]">
            ข้อมูลโปรเจกต์ <span className="font-normal text-[#1D4ED8]/60">(Project Info)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">ชื่องาน (Project Name) *</Label>
            <Input id="name" name="name" defaultValue={project?.name ?? ""} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project_type">ประเภทงาน (Job Type) *</Label>
            <Select
              name="project_type"
              defaultValue={project?.project_type ?? "model"}
              required
            >
              <SelectTrigger id="project_type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="model">งาน Model</SelectItem>
                <SelectItem value="influencer">งาน Influencer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client_name">ชื่อลูกค้า (Client)</Label>
            <Input
              id="client_name"
              name="client_name"
              defaultValue={project?.client_name ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shooting_date">Shooting Date</Label>
            <Input
              id="shooting_date"
              name="shooting_date"
              type="date"
              defaultValue={project?.shooting_date ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget">Budget</Label>
            <Input
              id="budget"
              name="budget"
              placeholder="เช่น 50,000 บาท / คน"
              defaultValue={project?.budget ?? ""}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">รายละเอียดงาน (Description)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={project?.description ?? ""}
            />
          </div>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="status">สถานะ (Status)</Label>
            <Select name="status" defaultValue={project?.status ?? "draft"}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ===== ประกาศงานสาธารณะ (Casting Call) ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#B82233]">
            ประกาศรับสมัคร (Casting Call){" "}
            <span className="font-normal text-[#B82233]/60">
              — เผยแพร่หน้าเว็บให้คนสมัคร/แชร์
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>รูปปกงาน (Cover — 1200 × 630 px สำหรับแชร์ FB/LINE)</Label>
            <ProjectCoverUploader name="cover_path" defaultPath={project?.cover_path} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">หมวดงาน (Category)</Label>
            <Select name="category" defaultValue={project?.category ?? undefined}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="เลือกหมวด..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                name="is_published"
                defaultChecked={project?.is_published ?? false}
              />
              เผยแพร่หน้าเว็บ (โชว์ที่หน้า Casting Calls สาธารณะ)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                name="casting_closed"
                defaultChecked={project?.casting_closed ?? false}
              />
              ปิดรับสมัครแล้ว (ขึ้นป้าย &quot;CASTING CLOSED&quot; — ยังโชว์อยู่แต่กดสมัครไม่ได้)
            </label>
            <p className="text-xs text-neutral-400">
              รายละเอียดที่โชว์บนประกาศ = ช่อง &quot;รายละเอียดงาน&quot; ด้านบน · role
              ที่เปิดรับ เพิ่มได้ในหน้าโปรเจกต์หลังบันทึก
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit">บันทึกโปรเจกต์</Button>
    </form>
  );
}
