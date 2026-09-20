import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { SocialIcon } from "@/components/SocialIcon";
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
  // getPublicShootDates ตัดรอบที่เลยวันไปแล้วออกให้แล้ว (gte วันนี้)
  // แต่ยังเหลือกรณี "รอบยังไม่ถึงวัน แต่ที่นั่งเต็มทุกช่อง" ซึ่งเดิมจะโชว้
  // ตัวเลือกวันให้กดแล้วไปตันเอาข้างใน → เช็คว่ามีช่องว่างจริงอย่างน้อย 1 ช่อง
  const bookable = dates.some(
    (d) =>
      Object.values(d.avail.A).some(Boolean) ||
      Object.values(d.avail.B).some(Boolean),
  );

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

        {bookable ? (
          <BookingWizard dates={dates} />
        ) : (
          /* จองไม่ได้ตอนนี้ — ครอบคลุมทั้ง 3 กรณีด้วยข้อความเดียว เพราะฝั่งลูกค้า
             เห็นผลเหมือนกันหมด: ยังไม่เปิดรอบ · เลยวันถ่ายไปแล้ว · หรือรอบยัง
             เปิดอยู่แต่ที่นั่งเต็มทุกช่อง (พี่เจ้าของแจ้ง 2026-09-20)
             จุดสำคัญคือต้องมีปุ่มทักไลน์ให้กดได้เลย จะได้เก็บคิวคนสนใจไว้ */
          <div className="rounded-2xl border-2 border-[#06C755]/30 bg-white p-8 text-center shadow-sm sm:p-12">
            {/* ไอคอนปฏิทินมีกากบาท — สื่อว่า "ไม่มีรอบให้จอง" ตรงกว่าอีโมจิ
                (เดิมใช้ 🈵 ซึ่งเป็นตัวอักษรญี่ปุ่นแปลว่าเต็ม ดูไม่เข้ากับแบรนด์
                — พี่เจ้าของแจ้ง 2026-09-20) */}
            <span
              aria-hidden
              className="mx-auto flex size-14 items-center justify-center rounded-full bg-neutral-100"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                className="size-7 text-neutral-400"
              >
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M3 10h18M8 3v4M16 3v4" />
                <path d="M9.5 14.5l5 4M14.5 14.5l-5 4" />
              </svg>
            </span>
            <h2 className="mt-3 text-xl font-bold text-neutral-800 sm:text-2xl">
              รอบถ่ายเต็มแล้วค่ะ
            </h2>
            <p className="text-base font-semibold text-neutral-500">
              This round is fully booked
            </p>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-neutral-600">
              กรุณาทักไลน์ Official{" "}
              <span className="font-semibold text-[#06C755]">
                {CONTACT.lineId}
              </span>{" "}
              เพื่อแจ้งเจ้าหน้าที่ไว้ — <b>รอบถัดไปเปิดเมื่อไหร่ เราจะรีบแจ้งให้ทราบก่อนใคร</b>
              <span className="mt-2 block text-neutral-500">
                Message our Official LINE to register your interest — we will
                let you know as soon as the next round opens, before anyone
                else.
              </span>
            </p>

            <a
              href={CONTACT.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#06C755] px-8 py-4 text-base font-bold text-white shadow-md transition hover:opacity-95"
            >
              {/* โลโก้ LINE สีจริงในวงกลมขาว — บนพื้นเขียวของปุ่ม ถ้าใช้โลโก้
                  ขาวล้วนจะเล็กจนดูเหมือนจุด ไม่รู้ว่าเป็นโลโก้อะไร */}
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white">
                <SocialIcon platform="line" size={24} title="LINE" />
              </span>
              <span>ทักไลน์แจ้งความสนใจ (Message us on LINE)</span>
            </a>
            <p className="mt-3 text-xs text-neutral-400">
              LINE Official: {CONTACT.lineId}
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
