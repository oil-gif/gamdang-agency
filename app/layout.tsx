import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Gamdang Agency",
  description: "Gamdang Modeling & Influencer Agency",
  // ชื่อที่โชว์ใต้ไอคอนตอนกด "เพิ่มไปยังหน้าจอโฮม" บน iPhone/iPad
  // (ถ้าไม่ตั้ง iOS จะเอา title เต็มมาใช้แล้วโดนตัดเหลือ "Gamdang Ag…")
  // capable: false = เปิดแล้วอยู่ใน Safari ตามปกติ — ดูเหตุผลใน app/manifest.ts
  appleWebApp: { title: "GAMDANG", capable: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${kanit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
