import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { LiffBackButton } from "@/components/LiffBackButton";
import { getPublicShootDates } from "@/lib/booking";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "จองถ่ายโปรไฟล์ — GAMDANG AGENCY",
  description:
    "จองคิวถ่าย Comp Card + รูปโปรไฟล์คุณภาพสูง พร้อมเข้าสู่วงการนักแสดง นายแบบ นางแบบ อินฟลูเอนเซอร์",
};

// ข้อมูลรอบ/ที่ว่างเปลี่ยนตลอด — ห้าม cache
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const dates = await getPublicShootDates();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <LiffBackButton liffId={process.env.NEXT_PUBLIC_BOOKING_LIFF_ID} />
            <span className="bg-gradient-to-r from-[#1D4ED8] to-[#B82233] bg-clip-text text-base font-extrabold tracking-widest text-transparent">
              GAMDANG AGENCY
            </span>
          </div>
          <span className="text-sm font-medium text-neutral-600">
            จองถ่ายโปรไฟล์
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Hook banner ตามหน้าบ้านเดิม */}
        <section className="rounded-3xl bg-gradient-to-br from-[#1D4ED8] via-[#5b2b8f] to-[#B82233] p-7 text-white shadow-md">
          <h1 className="text-lg font-bold leading-7 sm:text-xl">
            ✨ เริ่มต้นเข้าสู่วงการนักแสดง นายแบบ นางแบบ อินฟลูเอนเซอร์ —
            เพิ่มความมั่นใจ กล้าแสดงออก
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            Start your journey as an actor, model, or influencer — build
            confidence and stage presence
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/90">
            <li>
              🎬 เปิดโอกาสสู่งานแฟชั่น โฆษณา ละคร ซีรีส์ ภาพยนตร์
              <span className="mt-0.5 block text-xs text-white/60">
                Open doors to fashion, commercials, TV series, and films
              </span>
            </li>
            <li>
              📸 Comp Card พร้อมส่งงาน + รูปคุณภาพสูง 40-50 รูป + วิดีโอโปรไฟล์
              พร้อมส่งงานจริง ไม่ต้องออดิชั่น
              <span className="mt-0.5 block text-xs text-white/60">
                A ready-to-use comp card + 40–50 high-quality photos + a profile
                video — submission-ready, no audition needed
              </span>
            </li>
            <li>
              ❤️ ทีมงานมืออาชีพ ดูแลใกล้ชิด เป็นกันเอง ให้น้อง ๆ สนุก ไม่กดดัน
              <span className="mt-0.5 block text-xs text-white/60">
                A friendly, professional team — so the kids have fun with no
                pressure
              </span>
            </li>
          </ul>
        </section>

        {dates.length > 0 ? (
          <BookingWizard dates={dates} />
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <p className="font-semibold text-neutral-700">
              ยังไม่เปิดรอบถ่ายในช่วงนี้ค่ะ
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              ติดตามประกาศรอบใหม่ได้ทาง LINE Official:{" "}
              <a href={CONTACT.lineUrl} className="font-semibold text-[#06C755]">
                {CONTACT.lineId}
              </a>
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-200 bg-white px-4 py-6 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} GAMDANG AGENCY · LINE Official: {CONTACT.lineId}
      </footer>
    </div>
  );
}
