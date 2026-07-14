import Link from "next/link";
import { TalentForm } from "@/components/talent/TalentForm";

export default async function NewTalentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/talents"
        className="inline-block text-sm font-medium text-[#1D4ED8] hover:underline"
      >
        ← กลับรายการ Talent
      </Link>
      <h1 className="text-2xl font-bold text-neutral-800">เพิ่ม Talent</h1>
      <TalentForm error={error} />
    </div>
  );
}
