-- คำขอลบประวัติ (self-service PDPA): talent กดขอลบเอง → ตั้ง timestamp
-- โปรไฟล์จะถูกซ่อนจากหน้าสาธารณะทันที แต่ข้อมูลยังอยู่จนแอดมิน approve ลบถาวร
alter table talents add column if not exists deletion_requested_at timestamptz;
