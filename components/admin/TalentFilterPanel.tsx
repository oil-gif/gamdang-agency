import Link from "next/link";
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

      {/* ช่วงส่วนสูง/อายุ เป็นชุดเดียว: [ต่ำสุด] ถึง [สูงสุด] + หน่วย */}
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
        <Label htmlFor="min_height">ส่วนสูง (Height)</Label>
        <div className="flex h-9 items-center overflow-hidden rounded-md border border-input bg-white shadow-xs focus-within:border-[#1D4ED8] focus-within:ring-2 focus-within:ring-[#1D4ED8]/20">
          <input
            id="min_height"
            name="min_height"
            type="number"
            min={0}
            placeholder="ต่ำสุด"
            defaultValue={searchParams.min_height ?? ""}
            className="h-full w-full min-w-0 flex-1 bg-transparent px-3 text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="shrink-0 select-none px-1 text-xs text-neutral-400">
            ถึง
          </span>
          <input
            id="max_height"
            name="max_height"
            type="number"
            min={0}
            placeholder="สูงสุด"
            defaultValue={searchParams.max_height ?? ""}
            className="h-full w-full min-w-0 flex-1 bg-transparent px-3 text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="shrink-0 select-none border-l border-input bg-neutral-50 px-2.5 text-xs font-medium text-neutral-500">
            ซม.
          </span>
        </div>
      </div>
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
        <Label htmlFor="min_age">อายุ (Age)</Label>
        <div className="flex h-9 items-center overflow-hidden rounded-md border border-input bg-white shadow-xs focus-within:border-[#1D4ED8] focus-within:ring-2 focus-within:ring-[#1D4ED8]/20">
          <input
            id="min_age"
            name="min_age"
            type="number"
            min={0}
            placeholder="ต่ำสุด"
            defaultValue={searchParams.min_age ?? ""}
            className="h-full w-full min-w-0 flex-1 bg-transparent px-3 text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="shrink-0 select-none px-1 text-xs text-neutral-400">
            ถึง
          </span>
          <input
            id="max_age"
            name="max_age"
            type="number"
            min={0}
            placeholder="สูงสุด"
            defaultValue={searchParams.max_age ?? ""}
            className="h-full w-full min-w-0 flex-1 bg-transparent px-3 text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="shrink-0 select-none border-l border-input bg-neutral-50 px-2.5 text-xs font-medium text-neutral-500">
            ปี
          </span>
        </div>
      </div>

      <div className="flex items-end gap-2 sm:col-span-2">
        <Button type="submit">กรอง</Button>
        <Button asChild variant="outline" type="button">
          <Link href="/admin/talents">ล้างตัวกรอง</Link>
        </Button>
      </div>
    </form>
  );
}
