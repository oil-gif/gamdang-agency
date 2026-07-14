import Link from "next/link";
import {
  deleteShootDay,
  getShootBookings,
  getShootDay,
  getSlipUrl,
  saveShootDay,
  setBookingStatus,
  toggleShootSlot,
} from "@/actions/shoots";
import { getSlotCounts, slotOpen, thaiDateLabel } from "@/lib/booking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BOOKING } from "@/lib/constants";

const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  pending: { label: "⏳ รอตรวจ", className: "bg-amber-100 text-amber-700" },
  approved: { label: "✅ อนุมัติ", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "❌ ปฏิเสธ", className: "bg-rose-100 text-rose-700" },
};

export default async function ShootDayDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const [day, bookings, counts] = await Promise.all([
    getShootDay(id),
    getShootBookings(id),
    getSlotCounts(id),
  ]);
  const slipUrls = await Promise.all(
    bookings.map((b) => (b.slip_path ? getSlipUrl(b.slip_path) : null)),
  );

  return (
    <div className="space-y-8">
      <Link
        href="/admin/shoots"
        className="inline-block text-sm font-medium text-[#1D4ED8] hover:underline"
      >
        ← กลับรายการรอบถ่าย
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-800">
            รอบถ่าย {thaiDateLabel(day.shoot_date)}
          </h1>
          {day.status === "published" ? (
            <Badge className="bg-emerald-600 text-white">เปิดจอง</Badge>
          ) : (
            <Badge variant="outline">Draft (ซ่อน)</Badge>
          )}
        </div>
        <form action={deleteShootDay}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" size="sm">
            ลบรอบถ่าย
          </Button>
        </form>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* ข้อมูลรอบ */}
      <form
        action={saveShootDay}
        className="grid max-w-3xl grid-cols-1 gap-4 rounded-lg border bg-white p-5 sm:grid-cols-2"
      >
        <input type="hidden" name="id" value={id} />
        <div className="space-y-1.5">
          <Label htmlFor="shoot_date">วันที่ถ่าย *</Label>
          <Input
            id="shoot_date"
            name="shoot_date"
            type="date"
            defaultValue={day.shoot_date}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">สถานะ</Label>
          <select
            id="status"
            name="status"
            defaultValue={day.status}
            className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm shadow-xs"
          >
            <option value="draft">Draft — ซ่อนจากหน้าเว็บ</option>
            <option value="published">เปิดจอง — โชว์หน้าเว็บ</option>
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="location">สถานที่</Label>
          <Input id="location" name="location" defaultValue={day.location ?? ""} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="details">รายละเอียดเพิ่มเติม (โชว์บนการ์ดวัน)</Label>
          <Textarea id="details" name="details" rows={2} defaultValue={day.details ?? ""} />
        </div>
        <div>
          <Button type="submit">บันทึกรอบถ่าย</Button>
        </div>
      </form>

      {/* ตารางเวลา + เปิด/ปิดห้อง (จำนวนจอง admin เห็นคนเดียว) */}
      <section className="max-w-3xl space-y-3">
        <h2 className="text-lg font-semibold text-[#1D4ED8]">
          ตารางเวลา — จำนวนจอง (เฉพาะแอดมินเห็น)
        </h2>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-neutral-50 text-left text-neutral-500">
                <th className="px-3 py-2">รอบ</th>
                <th className="px-3 py-2">📷 ห้องถ่ายภาพ (เต็ม {BOOKING.photoCap})</th>
                <th className="px-3 py-2">🎬 ห้องวิดีโอ (เต็ม {BOOKING.videoCap})</th>
              </tr>
            </thead>
            <tbody>
              {BOOKING.hours.map((hour) => {
                const open = slotOpen(day.slots ?? {}, hour);
                const c = counts[hour] ?? { photo: 0, video: 0 };
                const cell = (
                  room: "photo" | "video",
                  isOpen: boolean,
                  booked: number,
                  cap: number,
                ) => (
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        booked >= cap
                          ? "font-semibold text-rose-600"
                          : "text-neutral-700"
                      }
                    >
                      จองแล้ว {booked} / {cap}
                    </span>
                    <form action={toggleShootSlot}>
                      <input type="hidden" name="id" value={id} />
                      <input type="hidden" name="hour" value={hour} />
                      <input type="hidden" name="room" value={room} />
                      <button
                        type="submit"
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                          isOpen
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-neutral-200 text-neutral-500 hover:bg-neutral-300"
                        }`}
                      >
                        {isOpen ? "เปิดรับ · กดเพื่อปิด" : "ปิดอยู่ · กดเพื่อเปิด"}
                      </button>
                    </form>
                  </div>
                );
                return (
                  <tr key={hour} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono font-semibold">{hour}</td>
                    <td className="px-3 py-2">
                      {cell("photo", open.photo, c.photo, BOOKING.photoCap)}
                    </td>
                    <td className="px-3 py-2">
                      {cell("video", open.video, c.video, BOOKING.videoCap)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* คิวตรวจสลิป */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1D4ED8]">
          การจอง ({bookings.length}) — ตรวจสลิปแล้วกดอนุมัติ/ปฏิเสธ
        </h2>
        <div className="space-y-2">
          {bookings.map((b, i) => {
            const chip = STATUS_CHIP[b.status] ?? STATUS_CHIP.pending;
            return (
              <div key={b.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip.className}`}>
                    {chip.label}
                  </span>
                  <span className="font-semibold text-neutral-800">
                    {b.full_name}
                    {b.nickname ? ` (${b.nickname})` : ""}
                  </span>
                  <span className="rounded bg-[#1D4ED8]/10 px-1.5 py-px text-xs font-bold text-[#1D4ED8]">
                    Package {b.package}
                  </span>
                  <span className="font-mono text-sm text-neutral-600">
                    {b.hour} น.
                  </span>
                  <span className="ml-auto text-xs text-neutral-400">
                    จองเมื่อ{" "}
                    {new Date(b.created_at).toLocaleString("th-TH", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-neutral-500">
                  📞 {b.phone}
                  {b.line_id ? ` · LINE: ${b.line_id}` : ""}
                  {b.email ? ` · ${b.email}` : ""}
                  {b.height ? ` · สูง ${b.height} ซม.` : ""}
                  {b.weight ? ` · หนัก ${b.weight} กก.` : ""}
                </p>
                {b.talents_note && (
                  <p className="mt-1 text-sm text-neutral-500">
                    ความสามารถพิเศษ: {b.talents_note}
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {slipUrls[i] ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={slipUrls[i]!} target="_blank" rel="noopener noreferrer">
                        🧾 ดูสลิปโอนเงิน
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-neutral-400">ไม่มีสลิป</span>
                  )}
                  <span className="flex-1" />
                  {b.status !== "approved" && (
                    <form action={setBookingStatus}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="day_id" value={id} />
                      <input type="hidden" name="status" value="approved" />
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        ✅ อนุมัติ
                      </Button>
                    </form>
                  )}
                  {b.status !== "rejected" && (
                    <form action={setBookingStatus}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="day_id" value={id} />
                      <input type="hidden" name="status" value="rejected" />
                      <Button type="submit" size="sm" variant="outline">
                        ❌ ปฏิเสธ (คืนที่นั่ง)
                      </Button>
                    </form>
                  )}
                  {b.status !== "pending" && (
                    <form action={setBookingStatus}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="day_id" value={id} />
                      <input type="hidden" name="status" value="pending" />
                      <Button type="submit" size="sm" variant="ghost">
                        ↩︎ กลับเป็นรอตรวจ
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
          {bookings.length === 0 && (
            <p className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-neutral-400">
              ยังไม่มีการจองในรอบนี้
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
