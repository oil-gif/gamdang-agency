import Link from "next/link";
import { ProjectForm } from "@/components/admin/ProjectForm";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/projects"
        className="inline-block text-sm font-medium text-[#1D4ED8] hover:underline"
      >
        ← กลับรายการโปรเจกต์
      </Link>
      <h1 className="text-2xl font-bold text-neutral-800">สร้างโปรเจกต์</h1>
      <ProjectForm error={error} />
    </div>
  );
}
