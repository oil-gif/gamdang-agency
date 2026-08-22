"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

export type ReorderItem = {
  id: string;
  /** ลากได้เฉพาะภายในกลุ่มเดียวกัน · ใส่ null ทั้งหมด = ลากได้ทั้งลิสต์ */
  roleTitle: string | null;
  node: ReactNode;
};

// ลากวางจัดลำดับ Talent ในโปรเจกต์
//
// ทำไมเขียนเอง ไม่ใช้ไลบรารี: dnd-kit/react-beautiful-dnd หนักหลายสิบ KB และ
// หน้านี้โหลดข้อมูลเยอะอยู่แล้ว · ที่นี่ใช้ Pointer Events ล้วน ~3KB ได้ทั้งเมาส์
// และนิ้วบนมือถือ (HTML5 drag-and-drop ใช้บนมือถือไม่ได้ เลยไม่เลือก)
//
// วิธีทำงาน: ลากแล้วสลับลำดับใน state ทันที (เห็นผลลื่นๆ ไม่ต้องมีเงาลอย)
// ปล่อยนิ้วค่อยยิงบันทึกครั้งเดียวทั้งชุด — ไม่โหลดหน้าใหม่
//
// ข้อจำกัดที่ตั้งใจ: ลากข้าม Role ไม่ได้ (พี่เจ้าของเลือกไว้) เพราะลากผิดกลุ่ม
// โดยไม่ตั้งใจง่ายมาก · จะเปลี่ยน Role ให้ใช้ dropdown "ย้าย" ในการ์ด
export function DragOrderList({
  items,
  saveAction,
  showGroupHeaders = true,
}: {
  items: ReorderItem[];
  /** ยิงครั้งเดียวตอนปล่อยนิ้ว — ผูก projectId มาแล้วด้วย .bind() */
  saveAction: (orderedIds: string[]) => Promise<void>;
  showGroupHeaders?: boolean;
}) {
  // ⚠️ เก็บไว้ใน state แค่ "ลำดับ" (id) เท่านั้น ห้ามเก็บ node
  //
  // ของเดิมเก็บ items ทั้งก้อน (รวม node ที่ render มาแล้ว) ไว้ใน state แล้ว sync
  // ต่อเมื่อ "รายชื่อ" เปลี่ยน · พอกดปุ่มในการ์ด (ลูกค้าสนใจ / รับงาน / ฯลฯ)
  // server action อัพเดต DB แล้ว revalidate ส่งการ์ดใบใหม่มา แต่ id ชุดเดิม
  // → ไม่เข้าเงื่อนไข sync → หน้าจอยังโชว์การ์ดใบเก่าค้างไว้ กดแล้วเหมือนไม่มี
  // อะไรเกิดขึ้นทั้งที่บันทึกสำเร็จ (พี่เจ้าของแจ้ง 2026-08-22)
  //
  // ตอนนี้ render จาก items ล่าสุดเสมอ แล้วใช้ orderIds จัดแค่ลำดับ
  const [orderIds, setOrderIds] = useState<string[]>(() => items.map((i) => i.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  // ลำดับที่บันทึกไปแล้ว — กันยิงซ้ำเมื่อลากแล้ววางที่เดิม
  const [savedIds, setSavedIds] = useState(items.map((i) => i.id).join(","));

  // เทียบแบบ "ชุดของ id" (เรียงแล้ว) — ลำดับต่างได้หลังลาก ไม่ถือว่าเปลี่ยน
  const incomingKey = items
    .map((i) => i.id)
    .slice()
    .sort()
    .join(",");
  const [seenKey, setSeenKey] = useState(incomingKey);
  if (incomingKey !== seenKey) {
    // มีคนถูกเพิ่ม/เอาออก → ยึดลำดับจาก server ใหม่
    setSeenKey(incomingKey);
    setOrderIds(items.map((i) => i.id));
    setSavedIds(items.map((i) => i.id).join(","));
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  const order = orderIds
    .map((id) => byId.get(id))
    .filter((i): i is ReorderItem => Boolean(i));
  const setOrder = (next: ReorderItem[]) => setOrderIds(next.map((i) => i.id));

  // ให้ event handler อ่านลำดับล่าสุดได้ตอนปล่อยนิ้ว (อ่าน state ตรงๆ ไม่ได้
  // เพราะ closure ของ handler จับค่าเก่าไว้)
  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  function commit(next: ReorderItem[]) {
    const ids = next.map((i) => i.id).join(",");
    if (ids === savedIds) return;
    setSavedIds(ids);
    startSaving(() => {
      void saveAction(next.map((i) => i.id));
    });
  }

  // ย้าย from → to โดยห้ามข้าม Role
  function moveTo(from: number, to: number, list: ReorderItem[]) {
    if (to < 0 || to >= list.length || from === to) return list;
    if (list[from].roleTitle !== list[to].roleTitle) return list;
    const next = list.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  function onHandleDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    setDragId(id);
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);

    // อ่าน/เขียนผ่าน orderRef ตัวเดียว เพื่อให้ตอนปล่อยนิ้วได้ลำดับล่าสุดแน่ๆ
    // (ถ้าใช้ setOrder แบบ updater ค่าใน ref จะตามหลังอยู่ 1 จังหวะ)
    const onMove = (ev: PointerEvent) => {
      const cur = orderRef.current;
      const from = cur.findIndex((x) => x.id === id);
      if (from < 0) return;
      // แถวที่นิ้ว/เมาส์อยู่ตรงนั้น
      const el = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest("[data-reorder-id]") as HTMLElement | null;
      if (!el) return;
      const to = cur.findIndex((x) => x.id === el.dataset.reorderId);
      if (to < 0 || to === from) return;
      const next = moveTo(from, to, cur);
      if (next === cur) return; // ข้าม Role → moveTo คืนตัวเดิม
      orderRef.current = next;
      setOrder(next);
    };
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      setDragId(null);
      commit(orderRef.current);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  // ปุ่มลัด: ขึ้นบนสุด / ลงล่างสุด "ของ Role ตัวเอง"
  function jump(id: string, edge: "top" | "bottom") {
    const cur = orderRef.current;
    const from = cur.findIndex((x) => x.id === id);
    if (from < 0) return;
    const role = cur[from].roleTitle;
    const first = cur.findIndex((x) => x.roleTitle === role);
    let last = first;
    for (let k = first; k < cur.length && cur[k].roleTitle === role; k++) last = k;
    const next = moveTo(from, edge === "top" ? first : last, cur);
    orderRef.current = next;
    setOrder(next);
    commit(next);
  }

  return (
    <div className="space-y-2">
      {saving && (
        <p className="text-center text-[11px] font-medium text-[#1D4ED8]">
          กำลังบันทึกลำดับ…
        </p>
      )}
      {order.map((item, i) => {
        const prevRole = i > 0 ? order[i - 1].roleTitle : undefined;
        const showHeader = showGroupHeaders && item.roleTitle !== prevRole;
        const roleCount = order.filter((x) => x.roleTitle === item.roleTitle).length;
        const roleFirst = order.findIndex((x) => x.roleTitle === item.roleTitle);
        const roleLast = roleFirst + roleCount - 1;
        return (
          <div key={item.id}>
            {showHeader && (
              <div className="flex items-center gap-2 pt-2">
                <span className="rounded-full bg-[#B82233]/10 px-3 py-1 text-sm font-bold text-[#B82233]">
                  🎭 {item.roleTitle ?? "ไม่ระบุ Role"}
                </span>
                <span className="text-xs text-neutral-400">{roleCount} คน</span>
                <span className="text-[10px] text-neutral-300">
                  — ลากได้เฉพาะในกลุ่มนี้
                </span>
              </div>
            )}
            <div
              data-reorder-id={item.id}
              className={`mt-2 flex items-start gap-1.5 rounded-xl transition ${
                dragId === item.id
                  ? "opacity-90 ring-2 ring-[#1D4ED8] ring-offset-1"
                  : ""
              }`}
            >
              {/* แถบจับลาก + ปุ่มลัด */}
              <div className="flex shrink-0 flex-col items-center gap-0.5 pt-3">
                <button
                  type="button"
                  onPointerDown={(e) => onHandleDown(e, item.id)}
                  title="ลากเพื่อจัดลำดับ (ในกลุ่ม Role เดียวกัน)"
                  aria-label="ลากเพื่อจัดลำดับ"
                  className="cursor-grab touch-none rounded-md px-1.5 py-1 text-neutral-400 select-none hover:bg-neutral-100 hover:text-neutral-700 active:cursor-grabbing"
                >
                  ⠿
                </button>
                <span className="font-mono text-[10px] text-neutral-400">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => jump(item.id, "top")}
                  disabled={i === roleFirst}
                  title="ขึ้นบนสุดของกลุ่มนี้"
                  className="px-1 text-[10px] text-neutral-400 hover:text-[#1D4ED8] disabled:opacity-25"
                >
                  ⤒
                </button>
                <button
                  type="button"
                  onClick={() => jump(item.id, "bottom")}
                  disabled={i === roleLast}
                  title="ลงล่างสุดของกลุ่มนี้"
                  className="px-1 text-[10px] text-neutral-400 hover:text-[#1D4ED8] disabled:opacity-25"
                >
                  ⤓
                </button>
              </div>
              <div className="min-w-0 flex-1">{item.node}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
