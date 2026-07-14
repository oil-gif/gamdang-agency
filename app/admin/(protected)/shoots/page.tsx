import Link from "next/link";
import { createShootDay, getShootDays } from "@/actions/shoots";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { thaiDateLabel } from "@/lib/booking";

export default async function ShootDaysPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const days = await getShootDays();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">
          จองถ่ายโปรไฟล์ — รอบถ่าย ({days.length})
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          เปิดรอบถ่าย จัดการเวลา และตรวจสลิปการจอง — หน้าจองสาธารณะอยู่ที่{" "}
          <a href="/booking" target="_blank" className="text-[#1D4ED8] underline">
            /booking
          </a>
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* เปิดรอบใหม่ */}
      <form
        action={createShootDay}
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="shoot_date">วันที่ถ่าย *</Label>
          <Input id="shoot_date" name="shoot_date" type="date" required />
        </div>
        <div className="min-w-64 flex-1 space-y-1.5">
          <Label htmlFor="location">สถานที่</Label>
          <Input
            id="location"
            name="location"
            placeholder="เช่น Studio East62 (ลาดพร้าว 62)"
          />
        </div>
        <Button type="submit">+ เปิดรอบถ่ายใหม่</Button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่</TableHead>
              <TableHead>สถานที่</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>จองแล้ว</TableHead>
              <TableHead>สลิปรอตรวจ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  {thaiDateLabel(d.shoot_date)}
                </TableCell>
                <TableCell>{d.location ?? "-"}</TableCell>
                <TableCell>
                  {d.status === "published" ? (
                    <Badge className="bg-emerald-600 text-white">เปิดจอง</Badge>
                  ) : (
                    <Badge variant="outline">Draft (ซ่อน)</Badge>
                  )}
                </TableCell>
                <TableCell>{d.booking_count} คิว</TableCell>
                <TableCell>
                  {d.pending_count > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      ⏳ {d.pending_count} รายการ
                    </span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/shoots/${d.id}`}>เปิด</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {days.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-neutral-400">
                  ยังไม่มีรอบถ่าย — เลือกวันที่แล้วกด &quot;+ เปิดรอบถ่ายใหม่&quot;
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
