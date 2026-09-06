import Link from "next/link";
import {
  createShootDay,
  getPostponedBookings,
  getShootDays,
  searchBookings,
} from "@/actions/shoots";
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

const SEARCH_STATUS: Record<string, string> = {
  pending: "⏳ รอตรวจ",
  approved: "✅ อนุมัติ",
  rejected: "❌ ปฏิเสธ",
  postponed: "🔁 เลื่อนรอบ",
};

export default async function ShootDaysPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const { error, q } = await searchParams;
  const [days, found, postponed] = await Promise.all([
    getShootDays(),
    q ? searchBookings(q) : Promise.resolve([]),
    getPostponedBookings(),
  ]);
  // ยังไม่กลับมาจอง = ที่ต้องตามต่อ · กลับมาแล้ว = เก็บไว้ดูย้อนหลัง
  const waiting = postponed.filter((p) => !p.rebooked);
  const returned = postponed.filter((p) => p.rebooked);
  const sureCount = postponed.filter((p) => p.matchKind === "sure").length;

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

      {/* ค้นหาการจอง (ชื่อ / เบอร์ / รหัส) — ไว้แก้ไข/เช็คอินหน้างาน */}
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
        <div className="min-w-64 flex-1 space-y-1.5">
          <Label htmlFor="q">🔍 ค้นหาการจอง (ชื่อ / ชื่อเล่น / เบอร์โทร / รหัส talent)</Label>
          <Input id="q" name="q" defaultValue={q ?? ""} placeholder="เช่น Tammy, 0812345678, FF979D" />
        </div>
        <Button type="submit">ค้นหา</Button>
        {q && (
          <Button asChild variant="outline" type="button">
            <Link href="/admin/shoots">ล้าง</Link>
          </Button>
        )}
      </form>

      {q && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-neutral-600">
            ผลค้นหา &quot;{q}&quot; — {found.length} รายการ
          </p>
          {found.map((b) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const d = b.shoot_day as any;
            return (
              <Link
                key={b.id}
                href={`/admin/shoots/${d?.id}#b-${b.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-white p-3 text-sm shadow-sm transition hover:border-[#1D4ED8]/40"
              >
                <span className="font-semibold text-neutral-800">
                  {b.full_name}
                  {b.nickname ? ` (${b.nickname})` : ""}
                </span>
                <span className="text-neutral-500">📞 {b.phone}</span>
                <span className="rounded bg-[#1D4ED8]/10 px-1.5 py-px text-xs font-bold text-[#1D4ED8]">
                  Package {b.package}
                </span>
                <span className="font-mono text-neutral-600">
                  {d ? thaiDateLabel(d.shoot_date) : "-"} · {b.hour} น.
                </span>
                <span className="text-xs">{SEARCH_STATUS[b.status] ?? b.status}</span>
                {b.arrived_at && (
                  <span className="rounded-full bg-sky-100 px-2 py-px text-xs font-semibold text-sky-700">
                    🏁 มาแล้ว
                  </span>
                )}
                <span className="ml-auto text-xs text-[#1D4ED8]">เปิดดู →</span>
              </Link>
            );
          })}
          {found.length === 0 && (
            <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-neutral-400">
              ไม่พบการจองที่ตรงกับคำค้น
            </p>
          )}
        </div>
      )}

      {/* ===== คนขอเลื่อนรอบ — ตามต่อว่ากลับมาจองรอบใหม่หรือยัง ===== */}
      {postponed.length > 0 && (
        <details
          open={waiting.length > 0}
          className="group overflow-hidden rounded-xl border border-violet-200 bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 bg-violet-50/60 px-4 py-3 hover:bg-violet-50">
            <span className="text-base">🔁</span>
            <span className="font-semibold text-violet-800">คนขอเลื่อนรอบ</span>
            {waiting.length > 0 && (
              <span className="rounded-full bg-violet-600 px-2 py-0.5 text-xs font-bold text-white">
                รอกลับมาจอง {waiting.length}
              </span>
            )}
            {sureCount > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                กลับมาแล้ว {sureCount}
              </span>
            )}
            {returned.length - sureCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                น่าจะกลับมา {returned.length - sureCount}
              </span>
            )}
            <span className="flex-1" />
            <span className="hidden text-xs text-neutral-400 sm:inline">
              ระบบจับคู่ให้เองจากเบอร์โทร/LINE
            </span>
            <span className="text-xs text-neutral-400 transition group-open:rotate-90">
              ▶
            </span>
          </summary>

          <div className="space-y-2 border-t border-violet-100 p-4">
            {[...waiting, ...returned].map((p) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const from = p.shoot_day as any;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const back = p.rebooked as any;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const backDay = back?.shoot_day as any;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border bg-white p-3 shadow-sm ${
                    p.matchKind === "sure"
                      ? "border-emerald-200"
                      : p.matchKind === "maybe"
                        ? "border-amber-200"
                        : "border-violet-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold text-neutral-800">
                      {p.full_name}
                      {p.nickname_th || p.nickname
                        ? ` (${p.nickname_th || p.nickname})`
                        : ""}
                    </span>
                    <span className="text-sm text-neutral-500">
                      📞 {p.phone}
                    </span>
                    {p.line_id && (
                      <span className="text-sm text-neutral-500">
                        LINE: {p.line_id}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-neutral-500">
                    เดิมจองรอบ{" "}
                    <b className="text-neutral-700">
                      {from ? thaiDateLabel(from.shoot_date) : "-"} · {p.hour} น.
                      · Package {p.package}
                    </b>
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {back ? (
                      <>
                        {p.matchKind === "sure" ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            ✅ กลับมาจองแล้ว
                          </span>
                        ) : (
                          // เบอร์ตรงแต่ชื่อไม่ตรง — ครอบครัวเดียวกันใช้เบอร์
                          // ร่วมกันบ่อยมาก (ข้อมูลจริงมี 8 เบอร์แบบนี้)
                          // ไม่ฟันธงให้ ให้แอดมินกดดูแล้วตัดสินเอง
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                            🤔 น่าจะกลับมาแล้ว — เบอร์เดียวกันแต่คนละชื่อ
                            (อาจเป็นพี่น้อง) กดดูให้ชัวร์
                          </span>
                        )}
                        <Link
                          href={`/admin/shoots/${backDay?.id}#b-${back.id}`}
                          className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                        >
                          {back.full_name}
                          {" · "}
                          {backDay ? thaiDateLabel(backDay.shoot_date) : ""} ·{" "}
                          {back.hour} น. → เปิดดู
                        </Link>
                      </>
                    ) : (
                      <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                        ⏳ ยังไม่กลับมาจอง
                      </span>
                    )}
                    <Link
                      href={`/admin/shoots/${p.shoot_day_id}?bs=postponed#b-${p.id}`}
                      className="ml-auto text-xs text-neutral-400 hover:text-[#1D4ED8]"
                    >
                      ดูคิวเดิม →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
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
