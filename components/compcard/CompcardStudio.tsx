"use client";

import { useState } from "react";
import {
  CompcardGenerator,
  type CompcardTalent,
} from "@/components/compcard/CompcardGenerator";
import { CompcardSlots } from "@/components/compcard/CompcardSlots";
import { REQUIRED_SLOTS } from "@/lib/compcard";

// Comp Card Studio ฝั่ง admin: อัพรูป 8 ช่อง (crop ในกรอบ) + สร้าง/บันทึก
// การ์ดในหน้าเดียว — ถ้ามีคอมการ์ดจากระบบเก่า ใช้ช่องอัพโหลด Comp Card
// เดิมในส่วน "รูปภาพ" ได้เหมือนเดิม
export function CompcardStudio({
  talent,
  initialSlots,
}: {
  talent: CompcardTalent;
  initialSlots: Record<string, string>;
}) {
  const [slots, setSlots] = useState<Record<string, string>>(initialSlots ?? {});
  const ready = REQUIRED_SLOTS.every((k) => slots[k]);

  return (
    <div className="space-y-5">
      <CompcardSlots
        talentId={talent.id}
        initialSlots={initialSlots}
        onChange={setSlots}
      />
      {ready && (
        <div>
          <p className="mb-2 text-sm font-bold text-neutral-700">
            🪪 ตัวอย่าง Comp Card
          </p>
          <CompcardGenerator talent={talent} slots={slots} />
        </div>
      )}
    </div>
  );
}
