"use client";

import { useState } from "react";
import { getTalentLinkUrl } from "@/actions/talent-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LineLinkButton({ talentId }: { talentId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      setUrl(await getTalentLinkUrl(talentId));
      setCopied(false);
    } catch {
      setError("สร้างลิงก์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="space-y-2">
      {!url ? (
        <Button type="button" variant="outline" onClick={generate} disabled={loading}>
          {loading ? "กำลังสร้างลิงก์..." : "สร้างลิงก์เชื่อม LINE"}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={url}
            className="text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button type="button" size="sm" onClick={copy}>
            {copied ? "คัดลอกแล้ว" : "คัดลอก"}
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-neutral-400">
        ส่งลิงก์นี้ให้ talent ทาง LINE เพื่อผูกบัญชี LINE เข้ากับ record นี้ (ลิงก์หมดอายุใน 7 วัน)
      </p>
    </div>
  );
}
