import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-neutral-800">Dashboard</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>เข้าสู่ระบบสำเร็จ 🎉</CardTitle>
          <CardDescription>
            หน้านี้จะกลายเป็น dashboard จริงใน Milestone ถัดไป (Talent CRUD)
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
