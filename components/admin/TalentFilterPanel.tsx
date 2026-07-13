import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, ETHNICITIES } from "@/lib/constants";

type Params = Record<string, string | undefined>;

export function TalentFilterPanel({ searchParams }: { searchParams: Params }) {
  return (
    <form
      method="get"
      className="grid grid-cols-2 gap-3 rounded-lg border bg-white p-4 sm:grid-cols-3 lg:grid-cols-6"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="q">ค้นหา (ชื่อเล่น / รหัส)</Label>
        <Input id="q" name="q" defaultValue={searchParams.q ?? ""} placeholder="เช่น มิ้นท์ หรือ GD-0001" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role">บทบาท</Label>
        <Select name="role" defaultValue={searchParams.role ?? "any"}>
          <SelectTrigger id="role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">ทั้งหมด</SelectItem>
            <SelectItem value="model">Model</SelectItem>
            <SelectItem value="influencer">Influencer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gender">เพศ</Label>
        <Select name="gender" defaultValue={searchParams.gender ?? "any"}>
          <SelectTrigger id="gender" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">ทั้งหมด</SelectItem>
            <SelectItem value="female">หญิง</SelectItem>
            <SelectItem value="male">ชาย</SelectItem>
            <SelectItem value="other">อื่นๆ / LGBTQ+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status">สถานะ</Label>
        <Select name="status" defaultValue={searchParams.status ?? "any"}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">ทั้งหมด</SelectItem>
            <SelectItem value="pending">รออนุมัติ</SelectItem>
            <SelectItem value="active">อนุมัติแล้ว</SelectItem>
            <SelectItem value="rejected">ปฏิเสธ</SelectItem>
            <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tier">Tier</Label>
        <Select name="tier" defaultValue={searchParams.tier ?? "any"}>
          <SelectTrigger id="tier" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">ทั้งหมด</SelectItem>
            <SelectItem value="nano">NANO</SelectItem>
            <SelectItem value="micro">MICRO</SelectItem>
            <SelectItem value="mid">MID-TIER</SelectItem>
            <SelectItem value="macro">MACRO</SelectItem>
            <SelectItem value="celeb">MEGA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select name="category" defaultValue={searchParams.category ?? "any"}>
          <SelectTrigger id="category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">ทั้งหมด</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ethnicity">เชื้อชาติ</Label>
        <Select name="ethnicity" defaultValue={searchParams.ethnicity ?? "any"}>
          <SelectTrigger id="ethnicity" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">ทั้งหมด</SelectItem>
            {ETHNICITIES.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="min_height">ส่วนสูง ต่ำสุด</Label>
        <Input
          id="min_height"
          name="min_height"
          type="number"
          defaultValue={searchParams.min_height ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="max_height">ส่วนสูง สูงสุด</Label>
        <Input
          id="max_height"
          name="max_height"
          type="number"
          defaultValue={searchParams.max_height ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="min_age">อายุ ต่ำสุด</Label>
        <Input
          id="min_age"
          name="min_age"
          type="number"
          defaultValue={searchParams.min_age ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="max_age">อายุ สูงสุด</Label>
        <Input
          id="max_age"
          name="max_age"
          type="number"
          defaultValue={searchParams.max_age ?? ""}
        />
      </div>

      <div className="flex items-end gap-2 sm:col-span-2">
        <Button type="submit">กรอง</Button>
        <Button asChild variant="outline" type="button">
          <a href="/admin/talents">ล้างตัวกรอง</a>
        </Button>
      </div>
    </form>
  );
}
