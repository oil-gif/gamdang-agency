"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import liff from "@line/liff";

export default function ApplyPage() {
  const router = useRouter();
  const [message, setMessage] = useState("กำลังเข้าสู่ระบบผ่าน LINE...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // ล็อกอิน LINE ใหม่โดยพา ?relogin=1 กลับมาด้วย (กันลูป: ทำได้ครั้งเดียว)
    // logout ก่อน — บังคับให้ได้ ID token สดจริง (ในแอป LINE liff.login() เฉยๆ
    // อาจคืน token เก่าที่แคชไว้ เช่นตอนเคยเปิดตอน channel ยัง Developing)
    function relogin() {
      const url = new URL(window.location.href);
      url.searchParams.set("relogin", "1");
      try {
        liff.logout();
      } catch {}
      liff.login({ redirectUri: url.toString() });
    }

    async function run() {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error("ระบบยังตั้งค่า LIFF ไม่ครบ");

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const triedRelogin = params.get("relogin") === "1";

        // บนเบราว์เซอร์เดสก์ท็อป/เว็บ ID token ที่แคชไว้อาจหมดอายุ ทั้งที่
        // isLoggedIn() ยัง true (ในแอป LINE จะรีเฟรชให้เอง) → ขอ token สดก่อน
        const decoded = liff.getDecodedIDToken() as { exp?: number } | null;
        const expired = !decoded || (decoded.exp ?? 0) * 1000 < Date.now() + 5000;
        if (expired && !triedRelogin) {
          relogin();
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) {
          if (!triedRelogin) return relogin();
          throw new Error("ไม่พบข้อมูลยืนยันตัวตนจาก LINE");
        }

        // liff.login() carries the current URL (including this) through
        // the redirect back here, so a link sent by an admin to bind this
        // login to a specific existing talent record survives the login
        // round-trip.
        const linkToken = params.get("link");
        // ?next=/casting/xxx → หลัง login เด้งกลับไปหน้านั้น (เฉพาะ path
        // ภายในเว็บ กัน open-redirect) ไม่งั้นไปหน้าจัดการโปรไฟล์ตามเดิม
        const rawNext = params.get("next");
        const next =
          rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
            ? rawNext
            : "/apply/profiles";

        const res = await fetch("/api/line/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, linkToken }),
        });
        if (!res.ok) {
          // 401 = token ไม่ผ่าน (มักเพราะหมดอายุ) → ขอ token สดแล้วลองอีกครั้ง
          if (res.status === 401 && !triedRelogin) return relogin();
          const body = await res.json().catch(() => ({}));
          // แสดงเหตุผลจริงจาก LINE (เช่น IdToken expired) ไว้ diagnose ด้วย
          throw new Error(
            [body.error, body.detail].filter(Boolean).join(" — ") ||
              "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่",
          );
        }

        if (!cancelled) router.replace(next);
      } catch (err) {
        if (!cancelled) {
          setIsError(true);
          setMessage(
            err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่",
          );
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-sm text-center text-neutral-600">
        <p className={isError ? "font-semibold text-neutral-800" : ""}>{message}</p>
        {isError && (
          <>
            <p className="mt-2 text-sm text-neutral-500">
              เซสชัน LINE หมดอายุหรือยังไม่ได้เข้าสู่ระบบ — กดปุ่มด้านล่างเพื่อเข้าสู่ระบบใหม่ค่ะ
            </p>
            <button
              type="button"
              onClick={() => {
                // logout ก่อน login — ล้าง token เก่าที่ค้าง แล้วขอสดใหม่
                try {
                  liff.logout();
                } catch {}
                try {
                  liff.login();
                } catch {
                  window.location.reload();
                }
              }}
              className="mt-4 rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              เข้าสู่ระบบด้วย LINE อีกครั้ง
            </button>
          </>
        )}
      </div>
    </div>
  );
}
