import type { MetadataRoute } from "next";

// ไฟล์นี้ทำให้มือถือ/แท็บเล็ตรู้จักชื่อ + ไอคอน ตอนผู้ใช้กด "เพิ่มไปยังหน้าจอโฮม"
// (พี่เจ้าของขอ 2026-09-18) · iOS อ่านจาก app/apple-icon.png เป็นหลัก
// ส่วน Android/Chrome อ่านจากไฟล์นี้
//
// display: "browser" = เปิดแล้วอยู่ในเบราว์เซอร์ตามปกติ (มีแถบที่อยู่เว็บ)
// ⚠️ ไม่ใช้ "standalone" เพราะบน iOS โหมดนั้นแยกที่เก็บคุกกี้ออกจาก Safari
// การล็อกอิน LINE / แอดมิน อาจต้องล็อกอินใหม่และเด้งออกไป Safari กลางทาง
// ถ้าอยากได้แบบเต็มจอเหมือนแอปจริง ค่อยเปลี่ยนทีหลังแล้วทดสอบบนเครื่องจริง
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gamdang Agency",
    short_name: "GAMDANG", // ชื่อใต้ไอคอนบนหน้าจอโฮม
    description: "Gamdang Modeling & Influencer Agency",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#1D4ED8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable", // Android ครอบตัดเป็นวงกลม/สี่เหลี่ยมมน ต้องเผื่อขอบ
      },
    ],
  };
}
