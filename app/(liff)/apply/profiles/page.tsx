import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyTalents } from "@/actions/talents";
import { LiffBackButton } from "@/components/LiffBackButton";
import { getTalentSession } from "@/lib/auth/talent-session";
import { getPhotoProxyUrl } from "@/lib/storage";

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-700" },
  active: { label: "อนุมัติแล้ว", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "ไม่ผ่าน", className: "bg-rose-100 text-rose-700" },
  inactive: { label: "พักการใช้งาน", className: "bg-neutral-200 text-neutral-600" },
};

export default async function ApplyProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getTalentSession();
  if (!session) redirect("/apply");
  const { error } = await searchParams;
  const talents = await getMyTalents();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-gradient-to-br from-[#1D4ED8] to-[#B82233] px-4 pb-8 pt-5 text-white">
        <div className="mx-auto max-w-3xl">
          <LiffBackButton liffId={process.env.NEXT_PUBLIC_LIFF_ID} tone="onDark" />
          <div className="mt-3 flex items-center gap-4">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-full border-2 border-white/70 bg-white/20">
            {session.linePicture ? (
              <Image
                src={session.linePicture}
                alt=""
                fill
                sizes="3.5rem"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xl font-semibold">
                {(session.lineName ?? "?").charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white/80">โปรไฟล์ของฉัน (My Profiles)</p>
            <h1 className="truncate text-xl font-bold">
              {session.lineName ?? "ยินดีต้อนรับ"}
            </h1>
          </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-16 pt-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        <p className="text-sm text-neutral-500">
          เลือกโปรไฟล์เพื่อแก้ไข หรือเพิ่มโปรไฟล์ใหม่ (สมัครให้ลูกได้หลายคนด้วยบัญชี LINE เดียว)
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {talents.map((t) => {
            const status = STATUS[t.status] ?? STATUS.pending;
            return (
              <Link
                key={t.id}
                href={`/apply/edit?id=${t.id}`}
                className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#1D4ED8]/40 hover:shadow-md"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
                  {t.photo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPhotoProxyUrl(t.photo_path, 320)}
                      alt=""
                      className="size-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-neutral-400">
                      ยังไม่มีรูป
                    </div>
                  )}
                  <span
                    className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="truncate text-sm font-semibold text-neutral-800">
                    {t.nickname_th || t.nickname_en || "ยังไม่ตั้งชื่อ"}
                  </p>
                  <p className="font-mono text-[10px] text-neutral-400">{t.code}</p>
                </div>
              </Link>
            );
          })}

          {/* เพิ่มลูกอีกคน — เปิดฟอร์มเปล่า ยังไม่สร้าง row จนกว่าจะกดบันทึก */}
          <Link
            href="/apply/edit"
            className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#1D4ED8]/40 bg-white text-[#1D4ED8] transition hover:bg-[#1D4ED8]/5"
          >
            <span className="text-3xl">+</span>
            <span className="px-2 text-center text-sm font-medium">
              เพิ่มโปรไฟล์
              <span className="block text-xs font-normal text-neutral-400">
                (Add Profile)
              </span>
            </span>
          </Link>
        </div>

        {talents.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-400">
            ยังไม่มีโปรไฟล์ — กด &quot;+ เพิ่มโปรไฟล์&quot; เพื่อเริ่มสมัครค่ะ
          </p>
        )}
      </main>
    </div>
  );
}
