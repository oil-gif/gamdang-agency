import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StyleGuidePage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-brand-gradient px-6 py-16 text-white sm:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-medium tracking-wide text-white/80">
            Gamdang Agency
          </p>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">
            Modeling & Influencer Agency
          </h1>
          <p className="mt-3 max-w-xl text-white/90">
            หน้านี้เอาไว้ดูสี ฟอนต์ และ component พื้นฐานที่จะใช้ทั่วทั้งระบบ
            — ยังไม่ใช่หน้าจริงของแอป
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-6 py-12 sm:px-10">
        <section>
          <h2 className="text-brand-gradient text-2xl font-bold">
            หัวข้อแบบ gradient text
          </h2>
          <p className="mt-1 text-neutral-500">
            ใช้กับหัวข้อสำคัญๆ ที่อยากเน้น ไม่ควรใช้พร่ำเพรื่อ
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold text-neutral-800">ปุ่ม (Buttons)</h3>
          <div className="flex flex-wrap items-center gap-3">
            <Button>ปุ่มหลัก</Button>
            <Button variant="secondary">ปุ่มรอง</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">ลบ / ปฏิเสธ</Button>
            <Button variant="ghost">Ghost</Button>
            <Button className="bg-brand-gradient text-white hover:opacity-90">
              ปุ่ม Gradient (CTA พิเศษ)
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold text-neutral-800">Badge / สถานะ</h3>
          <div className="flex flex-wrap gap-2">
            <Badge>Active</Badge>
            <Badge variant="secondary">Pending</Badge>
            <Badge variant="destructive">Rejected</Badge>
            <Badge variant="outline">Inactive</Badge>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold text-neutral-800">
            ตัวอย่าง Talent Card (mock)
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { name: "น้องมิ้นท์", tier: "MICRO", role: "Influencer" },
              { name: "พี่ต้น", tier: "MACRO", role: "Model" },
              { name: "น้องฟ้า", tier: "MID", role: "Model + Influencer" },
            ].map((t) => (
              <Card key={t.name} className="overflow-hidden py-0">
                <div className="bg-brand-gradient flex h-40 items-end p-4">
                  <span className="text-lg font-semibold text-white">
                    {t.name}
                  </span>
                </div>
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{t.tier}</Badge>
                    <span className="text-sm text-neutral-500">
                      {t.role}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="max-w-md space-y-3">
          <h3 className="font-semibold text-neutral-800">ฟอร์มพื้นฐาน</h3>
          <Card>
            <CardHeader>
              <CardTitle>ตัวอย่างฟอร์ม</CardTitle>
              <CardDescription>Input / Label เฉยๆ ยังไม่ผูก action</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="demo-name">ชื่อเล่น</Label>
                <Input id="demo-name" placeholder="เช่น มิ้นท์" />
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
