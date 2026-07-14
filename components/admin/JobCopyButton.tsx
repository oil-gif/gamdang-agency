"use client";

import { useState, useTransition } from "react";
import { markJobNotified } from "@/actions/job-notify";
import { Button } from "@/components/ui/button";

// คัดลอกข้อความแจ้งงาน (สำหรับ talent ที่ไม่ได้ผูก LINE — แอดมินวางส่งเอง
// ทาง LINE/WhatsApp) แล้ว mark ว่าแจ้งแล้ว (talent_response = pending)
export function JobCopyButton({ text, ptId }: { text: string; ptId: string }) {
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        startTransition(() => markJobNotified(ptId));
      }}
    >
      {copied ? "คัดลอกแล้ว ✓" : "📋 คัดลอกข้อความแจ้งงาน"}
    </Button>
  );
}
