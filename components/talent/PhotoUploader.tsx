"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PhotoUploader({
  talentId,
  kind,
  label,
}: {
  talentId: string;
  kind: "gallery" | "compcard";
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      // Pre-resize in the browser first — phone camera photos can be
      // 8-15MB, and serverless functions cap request bodies well below
      // that. This also makes uploads faster on mobile.
      const { default: imageCompression } = await import("browser-image-compression");
      // Keep well under Vercel's ~4.5MB request cap: base64 inflates the
      // body by ~33%, so cap the compressed image at 2MB (→ ~2.7MB body).
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 2000,
        maxSizeMB: 2,
        useWebWorker: true,
      });

      // Send as base64 JSON, NOT multipart/FormData: the LINE in-app
      // browser mangles binary multipart bodies (bytes get UTF-8 replaced),
      // which stored corrupt, unopenable images. base64 is pure ASCII, so
      // it survives the webview intact; the server decodes it back.
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
        reader.readAsDataURL(compressed);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talent_id: talentId, kind, data: dataUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "อัพโหลดไม่สำเร็จ");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัพโหลดไม่สำเร็จ");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? "กำลังอัพโหลด..." : label}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
