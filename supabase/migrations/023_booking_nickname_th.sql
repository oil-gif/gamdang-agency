-- ชื่อเล่นภาษาไทยในฟอร์มจองถ่ายโปรไฟล์
--
-- เดิมฟอร์มบังคับกรอกชื่อเล่นภาษาอังกฤษอย่างเดียว พอแอดมินแปลงคนจองเป็น Talent
-- ระบบต้องเอาชื่ออังกฤษไปใส่ช่อง nickname_th ไว้ก่อน แล้วรอแอดมินมาแก้เองทีหลัง
-- (ดู convertBookingToTalent ใน actions/shoots.ts) — เก็บตั้งแต่ตอนจองเลยดีกว่า
alter table shoot_bookings
  add column if not exists nickname_th text;
