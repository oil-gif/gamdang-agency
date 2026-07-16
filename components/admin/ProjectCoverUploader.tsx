"use client";

import { useRef, useState } from "react";

// อัพรูปปกงาน (1200×630) — เก็บ path ไว้ใน hidden input ให้ saveProject
export function ProjectCoverUploader({
  name,
  defaultPath,
}: {
  name: string;
  defaultPath?: string | null;
}) {
  const [path, setPath] = useState<string | null>(defaultPath ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { default: imageCompression } = await import("browser-image-compression");
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 2000,
        maxSizeMB: 2,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(compressed);
      });
      const res = await fetch("/api/project-cover-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "อัพโหลดไม่สำเร็จ");
      setPath(body.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัพโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={path ?? ""} />
      <div className="aspect-[1200/630] w-full max-w-md overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
        {path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/photo/${path}`} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-center text-xs text-neutral-400">
            รูปปกงาน 1200 × 630 px
            <br />
            (สำหรับ preview ตอนแชร์ FB/LINE)
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
        >
          {busy ? "กำลังอัพโหลด..." : path ? "เปลี่ยนรูปปก" : "อัพโหลดรูปปก"}
        </button>
        {path && (
          <button
            type="button"
            onClick={() => setPath(null)}
            className="text-sm text-neutral-400 hover:text-rose-600"
          >
            ลบรูป
          </button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
