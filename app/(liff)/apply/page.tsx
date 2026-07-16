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

    async function run() {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error("ระบบยังตั้งค่า LIFF ไม่ครบ");

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("ไม่พบข้อมูลยืนยันตัวตนจาก LINE");

        // liff.login() carries the current URL (including this) through
        // the redirect back here, so a link sent by an admin to bind this
        // login to a specific existing talent record survives the login
        // round-trip.
        const linkToken = new URLSearchParams(window.location.search).get("link");

        const res = await fetch("/api/line/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, linkToken }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
        }

        if (!cancelled) router.replace("/apply/profiles");
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
      <div className="text-center text-neutral-600">
        <p>{message}</p>
        {isError && (
          <p className="mt-2 text-sm text-red-600">
            กรุณาเปิดลิงก์นี้จากแอป LINE เท่านั้น
          </p>
        )}
      </div>
    </div>
  );
}
