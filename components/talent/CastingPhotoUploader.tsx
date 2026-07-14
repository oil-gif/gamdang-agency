"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_PHOTOS = 3;

// อัพรูปเพิ่ม 3 รูปในฟอร์ม casting (งาน Model) — auth ด้วย submit token
// ส่งเป็น base64 JSON (เว็บวิว LINE ทำ multipart เพี้ยน — gotcha เดิม)
export function CastingPhotoUploader({
  token,
  photos,
}: {
  token: string;
  photos: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const { default: imageCompression } = await import("browser-image-compression");
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 2000,
        maxSizeMB: 2,
        useWebWorker: true,
      });
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
        reader.readAsDataURL(compressed);
      });
      const res = await fetch("/api/casting-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, data: dataUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "อัพโหลดไม่สำเร็จ");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัพโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(path: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/casting-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, op: "delete", path }),
      });
      if (!res.ok) throw new Error("ลบรูปไม่สำเร็จ");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบรูปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
          const path = photos[i];
          return path ? (
            <div
              key={path}
              className="relative aspect-[3/4] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/photo/${path}`}
                alt=""
                className="size-full object-cover object-top"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDelete(path)}
                aria-label="ลบรูป"
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/55 text-xs text-white backdrop-blur-sm"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              key={`empty-${i}`}
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-2xl text-neutral-300 transition hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
            >
              {busy ? "…" : "+"}
            </button>
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
