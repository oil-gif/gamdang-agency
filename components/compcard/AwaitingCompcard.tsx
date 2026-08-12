"use client";

import { useEffect, useState } from "react";
import { setAwaitingCompcard } from "@/actions/talents";
import { SinglePhotoUpload } from "@/components/compcard/SinglePhotoUpload";

// ตัวเลือกที่ 3 ของ Model: "รอคอมการ์ดจากแก้มแดง" — คนที่เพิ่งจองถ่ายโปรไฟล์
// ยังไม่มีคอมการ์ด → อัพรูปหลัก 1 รูปพอ แล้วเข้าคิวให้แอดมินอัพคอมการ์ดให้ทีหลัง
export function AwaitingCompcard({
  talentId,
  initialSinglePath,
}: {
  talentId: string;
  initialSinglePath?: string | null;
}) {
  const [noted, setNoted] = useState(false);

  // เลือกโหมดนี้ = แจ้งเข้าคิวรอคอมการ์ดทันที (แอดมินจะเห็นในหน้า "รอคอมการ์ด")
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await setAwaitingCompcard(talentId, true);
      if (!cancelled && res.ok) setNoted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [talentId]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
        <p className="font-bold">⏳ รอคอมการ์ดจากแก้มแดง (Waiting for your comp card)</p>
        <p className="mt-1 text-[13px]">
          เหมาะกับคนที่<b>เพิ่งจองถ่ายโปรไฟล์กับแก้มแดง</b> แต่ยังไม่ได้รับคอมการ์ด —
          ตอนนี้อัพแค่ <b>รูปหลัก 1 รูป</b> ก็สมัครได้เลย
          เมื่อถ่ายเสร็จทีมงานจะทำคอมการ์ดแล้ว<b>อัพเข้าโปรไฟล์ให้อัตโนมัติ</b>
        </p>
        {noted && (
          <p className="mt-1.5 text-xs font-medium text-emerald-700">
            ✓ แจ้งทีมงานแล้ว — โปรไฟล์นี้อยู่ในคิวรอคอมการ์ด
          </p>
        )}
      </div>

      <SinglePhotoUpload
        talentId={talentId}
        initialPath={initialSinglePath}
        heading="🖼️ รูปหลักสำหรับการ์ด (Main Photo) *"
        subheading="รูปเดี่ยว 1 รูป — ใช้โชว์เป็นการ์ดหน้าเว็บระหว่างรอคอมการ์ด"
        note="เลือกรูปหน้าชัด สวย เป็นตัวคุณที่สุด (มือถือถ่ายก็ได้)"
      />
    </div>
  );
}
