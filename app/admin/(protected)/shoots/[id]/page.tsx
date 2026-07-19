import Link from "next/link";
import {
  createTalentFromBooking,
  deleteShootDay,
  getShootBookings,
  getShootDay,
  getSlipUrl,
  saveShootDay,
  setBookingArrival,
  setBookingStatus,
  toggleShootSlot,
} from "@/actions/shoots";
import { getSlotCounts, slotOpen, thaiDateLabel } from "@/lib/booking";
import { ageLabel } from "@/lib/age";
import { BookingSearch } from "@/components/admin/BookingSearch";
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

      {/* เช็คอินหน้างาน — ค้นหาคนจองในรอบนี้ (อยู่บนสุด กดเข้ามาแล้วหาได้เลย) */}
      {bookings.length > 0 && (
        <div className="rounded-2xl border border-[#1D4ED8]/20 bg-[#1D4ED8]/5 p-4">
          <p className="mb-2 text-sm font-semibold text-[#1D4ED8]">
            🏁 เช็คอินหน้างาน — ค้นหาคนจองในรอบนี้ ({bookings.length} คิว)
          </p>
          <BookingSearch total={bookings.length} />
        </div>
      )}

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

      {/* ===== Photoshoot Overview: ทุกคิวเป็นช่อง คลิกดูข้อมูล/เช็คชื่อ =====
          Package A โผล่ทั้ง 2 ห้อง (กินที่นั่งทั้ง Photo และ Video) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1D4ED8]">
          Photoshoot Overview — {thaiDateLabel(day.shoot_date)}
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-sm bg-sky-400" /> มาถึงแล้ว
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-sm bg-neutral-400" /> อนุมัติแล้ว ยังไม่มา
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-sm bg-amber-300" /> รอตรวจสลิป
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-sm bg-neutral-100 ring-1 ring-neutral-200" /> ที่ว่าง
          </span>
          <span className="text-neutral-400">· คลิกช่องเพื่อดูข้อมูลคนจอง</span>
        </div>

        {(
          [
            ["photo", "📷 ห้องถ่ายภาพ", BOOKING.photoCap],
            ["video", "🎬 ห้องวิดีโอ (Package A)", BOOKING.videoCap],
          ] as const
        ).map(([room, roomLabel, cap]) => (
          <div key={room} className="overflow-x-auto rounded-lg border bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-neutral-700">
              {roomLabel} — เต็ม {cap}/ชม.
            </p>
            <div className="space-y-1.5">
              {BOOKING.hours.map((hour) => {
                const roomBookings = bookings
                  .filter(
                    (b) =>
                      b.hour === hour &&
                      b.status !== "rejected" &&
                      (room === "photo" || b.package === "A"),
                  )
                  .sort((a, b) => a.created_at.localeCompare(b.created_at));
                const open = slotOpen(day.slots ?? {}, hour)[room];
                return (
                  <div key={hour} className="flex items-center gap-2">
                    <span
                      className={`w-14 shrink-0 font-mono text-xs ${open ? "text-neutral-600" : "text-neutral-300 line-through"}`}
                    >
                      {hour}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: cap }).map((_, i) => {
                        const b = roomBookings[i];
                        if (!b) {
                          return (
                            <span
                              key={i}
                              className={`size-6 rounded-sm ${open ? "bg-neutral-100 ring-1 ring-neutral-200" : "bg-neutral-50"}`}
                            />
                          );
                        }
                        const color = b.arrived_at
                          ? "bg-sky-400 hover:bg-sky-500"
                          : b.status === "pending"
                            ? "bg-amber-300 hover:bg-amber-400"
                            : "bg-neutral-400 hover:bg-neutral-500";
                        return (
                          <a
                            key={b.id}
                            href={`#b-${b.id}`}
                            title={`${b.full_name}${b.nickname ? ` (${b.nickname})` : ""} · Package ${b.package}${b.arrived_at ? " · มาถึงแล้ว" : ""}`}
                            className={`size-6 rounded-sm transition ${color}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

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
              <div
                key={b.id}
                id={`b-${b.id}`}
                data-b-search={`${b.full_name ?? ""} ${b.nickname ?? ""} ${b.phone ?? ""} ${b.email ?? ""}`.toLowerCase()}
                className="scroll-mt-24 rounded-xl border bg-white p-4 shadow-sm target:border-[#1D4ED8] target:ring-2 target:ring-[#1D4ED8]/30"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip.className}`}>
                    {chip.label}
                  </span>
                  {b.arrived_at && (
                    <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                      🏁 มาถึงแล้ว{" "}
                      {new Date(b.arrived_at).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
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
                  {b.gender
                    ? ` · ${b.gender === "male" ? "ชาย" : b.gender === "female" ? "หญิง" : "อื่นๆ"}`
                    : ""}
                  {b.dob ? ` · อายุ ${ageLabel(b.dob)}` : ""}
                  {b.nationality ? ` · ${b.nationality}` : ""}
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

                  {/* เช็คชื่อหน้างาน */}
                  <form action={setBookingArrival}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="day_id" value={id} />
                    <input type="hidden" name="arrived" value={b.arrived_at ? "0" : "1"} />
                    <Button
                      type="submit"
                      size="sm"
                      className={
                        b.arrived_at
                          ? "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                          : "bg-sky-500 text-white hover:bg-sky-600"
                      }
                    >
                      {b.arrived_at ? "↩︎ ยกเลิกเช็คชื่อ" : "🏁 มาถึงแล้ว"}
                    </Button>
                  </form>

                  {/* ดึงเข้าระบบสมัครสมาชิก (talent) */}
                  {b.talent_id ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/talents/${b.talent_id}`}>
                        👤 ดูโปรไฟล์ Talent
                      </Link>
                    </Button>
                  ) : (
                    <form action={createTalentFromBooking}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="day_id" value={id} />
                      <Button type="submit" size="sm" variant="outline">
                        ➕ เพิ่มเข้าระบบ Talent
                      </Button>
                    </form>
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
