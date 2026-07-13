import { TalentForm } from "@/components/admin/TalentForm";

export default function NewTalentPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-neutral-800">เพิ่ม Talent</h1>
      <TalentForm />
    </div>
  );
}
