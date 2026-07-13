import { ProjectForm } from "@/components/admin/ProjectForm";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-neutral-800">สร้างโปรเจกต์</h1>
      <ProjectForm error={error} />
    </div>
  );
}
