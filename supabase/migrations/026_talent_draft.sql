-- สถานะใหม่: "draft" = ใบร่างที่แอดมินสร้างจากคอมการ์ด ยังไม่มีข้อมูลครบ
--
-- ปัญหาที่แก้ (พี่เจ้าของแจ้ง 2026-09-08): บาง talent เรามีแต่คอมการ์ด ไม่รู้
-- วันเกิด/ส่วนสูง → เดิมต้องกรอกฟอร์มเต็มทีละคนถึงจะเอาเข้าโปรเจกต์ไปเสนอ
-- ลูกค้าได้ · ตอนนี้อัพคอมการ์ดทีเดียวหลายใบ ใส่แค่ชื่อ แล้วเข้าโปรเจกต์ได้เลย
-- พอข้อมูลครบค่อยกด "ย้ายเข้าระบบ Talent" → กลายเป็น pending เข้าคิวรออนุมัติ
--
-- ทำไมใช้ตาราง talents เดิม ไม่สร้างตารางใหม่: ใบเสนอ PDF / Report / การลาก
-- จัดลำดับ / picker อ่านจาก talents ที่เดียวกันหมด ถ้าแยกตารางต้องแก้ทุกจุด
--
-- ⚠️ draft ต้องไม่หลุดออกหน้าเว็บ Public — หน้า /talents กรอง status='active'
-- อยู่แล้ว (lib/public-talents.ts) จึงปลอดภัยโดยอัตโนมัติ

alter table talents drop constraint if exists talents_status_check;
alter table talents add constraint talents_status_check
  check (status in ('active', 'pending', 'rejected', 'draft'));
