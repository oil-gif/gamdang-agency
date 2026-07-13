"use client";

import { saveProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
};

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

      <Button type="submit">บันทึกโปรเจกต์</Button>
    </form>
  );
}
