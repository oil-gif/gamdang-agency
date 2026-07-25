"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ตัวปรับรูปให้พอดีกรอบ (Comp Card Studio) — ลากเลื่อน + ซูม (slider/ลูกกลิ้ง/
// pinch สองนิ้ว) แล้ว export ตามขนาดกรอบจริงของการ์ด (WYSIWYG)
export function CropperModal({
  file,
  title,
  outW,
  outH,
  onDone,
  onCancel,
}: {
  file: File;
  title: string;
  outW: number;
  outH: number;
  onDone: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  // offset มุมซ้ายบนของรูป (หน่วย px ของ output) — clamp ให้รูปคลุมกรอบเสมอ
  const offRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef(0);

  // ขนาด preview: กว้างสุด 340 ตามจอ
  const previewW = Math.min(340, typeof window !== "undefined" ? window.innerWidth - 48 : 340);
  const previewH = Math.round((previewW * outH) / outW);
  const k = previewW / outW; // สเกล preview → output

  const metrics = useCallback(() => {
    const img = imgRef.current!;
    const s0 = Math.max(outW / img.naturalWidth, outH / img.naturalHeight);
    const s = s0 * zoomRef.current;
    return { dw: img.naturalWidth * s, dh: img.naturalHeight * s };
  }, [outW, outH]);

  const clamp = useCallback(() => {
    const { dw, dh } = metrics();
    const o = offRef.current;
    o.x = Math.min(0, Math.max(outW - dw, o.x));
    o.y = Math.min(0, Math.max(outH - dh, o.y));
  }, [metrics, outW, outH]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    const { dw, dh } = metrics();
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offRef.current.x * k, offRef.current.y * k, dw * k, dh * k);
    // เส้นตาราง 3x3 ช่วยจัดองค์ประกอบ
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo((canvas.width / 3) * i, 0);
      ctx.lineTo((canvas.width / 3) * i, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (canvas.height / 3) * i);
      ctx.lineTo(canvas.width, (canvas.height / 3) * i);
      ctx.stroke();
    }
  }, [metrics, k]);

  // โหลดรูปจากไฟล์
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      zoomRef.current = 1;
      setZoom(1);
      // เริ่มกึ่งกลาง
      const s0 = Math.max(outW / img.naturalWidth, outH / img.naturalHeight);
      offRef.current = {
        x: (outW - img.naturalWidth * s0) / 2,
        y: (outH - img.naturalHeight * s0) / 2,
      };
      setReady(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, outW, outH]);

  useEffect(() => {
    if (ready) draw();
  }, [ready, draw]);

  function setZoomAnchored(newZoom: number, anchorPreviewX?: number, anchorPreviewY?: number) {
    const z = Math.min(3.5, Math.max(1, newZoom));
    const ax = (anchorPreviewX ?? previewW / 2) / k; // จุดยึดใน output px
    const ay = (anchorPreviewY ?? previewH / 2) / k;
    const ratio = z / zoomRef.current;
    // เลื่อน offset ให้จุดใต้นิ้วอยู่ที่เดิมตอนซูม
    offRef.current.x = ax - (ax - offRef.current.x) * ratio;
    offRef.current.y = ay - (ay - offRef.current.y) * ratio;
    zoomRef.current = z;
    setZoom(z);
    clamp();
    draw();
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    if (pointers.current.size === 2) {
      pointers.current.set(e.pointerId, cur);
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current > 0) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const midX = (a.x + b.x) / 2 - rect.left;
        const midY = (a.y + b.y) / 2 - rect.top;
        setZoomAnchored(zoomRef.current * (d / pinchDist.current), midX, midY);
      }
      pinchDist.current = d;
      return;
    }
    // ลากเลื่อน
    offRef.current.x += (cur.x - prev.x) / k;
    offRef.current.y += (cur.y - prev.y) / k;
    pointers.current.set(e.pointerId, cur);
    clamp();
    draw();
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinchDist.current = 0;
  }

  async function handleSave() {
    const img = imgRef.current;
    if (!img || saving) return;
    setSaving(true);
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext("2d")!;
    const { dw, dh } = metrics();
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, offRef.current.x, offRef.current.y, dw, dh);
    out.toBlob(
      (blob) => {
        if (blob) onDone(blob);
        setSaving(false);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      {/* แถบบน: ชื่อช่อง + ยกเลิก/ยืนยัน */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-neutral-800">{title}</p>
          <p className="text-xs text-neutral-400">
            ลากเลื่อน · ถ่าง/บีบสองนิ้วเพื่อซูม ให้พอดีกรอบ
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex size-10 items-center justify-center rounded-xl border border-neutral-300 text-lg text-neutral-500"
            aria-label="ยกเลิก"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!ready || saving}
            className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#B82233] text-lg text-white disabled:opacity-50"
            aria-label="ยืนยัน"
          >
            ✓
          </button>
        </div>
      </div>

      {/* พื้นที่ crop */}
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <canvas
          ref={canvasRef}
          width={previewW}
          height={previewH}
          style={{ width: previewW, height: previewH, touchAction: "none" }}
          className="max-h-full rounded-lg bg-neutral-200 shadow-2xl"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(e) => {
            const rect = canvasRef.current!.getBoundingClientRect();
            setZoomAnchored(
              zoomRef.current * (e.deltaY < 0 ? 1.08 : 0.93),
              e.clientX - rect.left,
              e.clientY - rect.top,
            );
          }}
        />
      </div>

      {/* ซูม slider */}
      <div className="bg-white px-6 py-4">
        <div className="mx-auto flex max-w-sm items-center gap-3">
          <span className="text-lg text-neutral-400">－</span>
          <input
            type="range"
            min={1}
            max={3.5}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomAnchored(Number(e.target.value))}
            className="flex-1 accent-[#1D4ED8]"
          />
          <span className="text-lg text-neutral-400">＋</span>
          <button
            type="button"
            onClick={() => {
              zoomRef.current = 1;
              setZoom(1);
              const img = imgRef.current!;
              const s0 = Math.max(outW / img.naturalWidth, outH / img.naturalHeight);
              offRef.current = {
                x: (outW - img.naturalWidth * s0) / 2,
                y: (outH - img.naturalHeight * s0) / 2,
              };
              draw();
            }}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
