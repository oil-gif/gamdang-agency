"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// อัพรูปหลายไฟล์พร้อมกัน (batch) เข้า photo inbox — ย่อรูปฝั่ง browser ก่อน
// แล้วส่ง base64 ทีละไฟล์ (server ย่อซ้ำ + webp ให้ไฟล์เล็กเสมอ)
export function InboxUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);

    const { default: imageCompression } = await import("browser-image-compression");
    let done = 0;
    let failed = 0;
    for (const file of files) {
      setProgress(`กำลังอัพโหลด ${done + failed + 1}/${files.length}...`);
      try {
        const compressed = await imageCompression(file, {
          maxWidthOrHeight: 2000,
          maxSizeMB: 2,
          useWebWorker: true,
        });
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
          reader.readAsDataURL(compressed);
        });
        const res = await fetch("/api/inbox-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: dataUrl }),
        });
        if (!res.ok) throw new Error();
        done++;
      } catch {
        failed++;
      }
    }
    setProgress(null);
    if (failed > 0) setError(`อัพโหลดสำเร็จ ${done} ไฟล์, ล้มเหลว ${failed} ไฟล์`);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        disabled={progress !== null}
        onClick={() => inputRef.current?.click()}
      >
        {progress ?? "⬆️ อัพโหลดรูปหลายไฟล์"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
