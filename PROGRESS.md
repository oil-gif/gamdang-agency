# Gamdang App — Progress / Handoff

> อ่านไฟล์นี้ก่อนเริ่มทำงานเสมอ — สรุปว่าทำอะไรไปแล้ว ทำอะไรค้างอยู่ และต้องทำอะไรต่อ

## 🚀 เตรียมขึ้นโดเมนจริง www.gamdangagency.com (checklist — อัพเดต 2026-07-19)

> เว็บ WordPress หน้าบ้านจะขึ้น `www.gamdangagency.com` — แอป Next.js นี้เป็นระบบหลังบ้าน/LIFF/หน้าสาธารณะ (talents, casting) เชื่อมจาก WP

**ขั้นตอนตอนพร้อมขึ้นจริง (ทำครั้งเดียว):**
1. **ผูกซับโดเมนกับ Vercel**: แนะนำ `app.gamdangagency.com` (หรือ `casting.gamdangagency.com`) → Vercel project settings → Domains → add → ตั้ง DNS record (CNAME → cname.vercel-dns.com) ที่ผู้ให้บริการโดเมน
2. **ตั้ง env ใน Vercel** (Production) แล้ว redeploy:
   - `NEXT_PUBLIC_SITE_URL=https://app.gamdangagency.com` (ลิงก์แชร์/OG/job/submit/casting เปลี่ยนตามทั้งระบบ — ดู `lib/site.ts`)
   - `NEXT_PUBLIC_MAIN_SITE_URL=https://www.gamdangagency.com` (ปุ่ม "← Back to Home")
3. **เมนู/ปุ่มในเว็บ WP** (มีตาราง URL ใน TODO ด้านล่าง): Talent→`/talents` · Casting→`/casting` · สมัคร→LIFF wGKbITGb · จองถ่าย→LIFF ciPMtS8K · Admin→`/admin/login`
4. **Rich menu ใน LINE OA** (URL พร้อมใน TODO ด้านล่าง)
5. **อัปเดต OG/hardcoded** ที่ยังชี้ vercel.app: `app/api/booking/route.ts` (ข้อความแจ้งเตือน admin) + `app/casting/[id]/page.tsx` BASE_URL อ่านจาก env แล้ว ✓ · LINE webhook URL ใน console ยังใช้ vercel.app ได้ (ไม่ต้องเปลี่ยนก็ได้)
6. **Polish ก่อนเปิดจริง**: เปลี่ยนรหัส admin (`gamdang2026`), (optional) ลบหน้า `/style-guide`

**หมายเหตุ LIFF**: endpoint ของ LIFF 2 ตัวยังชี้ vercel.app (`/apply`, `/booking`) — ถ้าย้ายโดเมนต้องอัปเดต Endpoint URL ใน LINE Developers Console ด้วย (ไม่งั้น login redirect พัง) หรือคง vercel.app ไว้สำหรับ LIFF ก็ได้ (แยกจากหน้าเว็บสาธารณะ)

## 🗂️ Import Influencer จากระบบเก่า (Google Sheet) — เสร็จแล้ว 2026-07-19
- **นำเข้า 142 คน** จากไฟล์ `~/Downloads/Influencer Library - Influencers (1).csv` (148 แถว, ซ้ำในชีต 6 คน — Riya/Joseph Choo/Metal/Shekel/Vela/Momoko กรอก 2 รอบ, กัน dedup ด้วย (ชื่อ,เบอร์))
- ทุกคน **status=active, is_influencer=true, source=admin**, รหัส GD-xxxx อัตโนมัติ · tier คำนวณใหม่จาก follower (ไม่ใช้ค่าจากชีต) · Name→nickname_th(ไทย)/nickname_en(อังกฤษ) · Age→dob โดยประมาณ (จากอายุ+CreatedAt, string-parse เดือน เช่น "6.11"=6ปี11ด.) · LINE handle เก็บที่ contact_line_or_whatsapp (ไม่ใส่ line_user_id) · Category→categories (Other→Others) · Expertise+Note→note
- **รูป 126/142 คน** ดึงจาก Google Drive (`lh3.googleusercontent.com/d/FILEID`) → อัปเข้า storage `{id}/gallery/{uuid}.{ext}` + talent_photos · 17 คนไม่มีรูป (ไม่มีลิงก์ในชีต หรือ Drive ล็อกไฟล์คืน HTML) — เติมทีหลังผ่าน /admin/photos ได้
- สคริปต์ import อยู่ใน scratchpad (import_infl.py / import_photos.py) — ใช้ Supabase REST + service key จาก .env.local · **วิธี import ครั้งหน้า**: export ชีตเป็น CSV → อ่าน UTF-8 → map → REST insert เป็น batch (mojibake ที่เห็นในแชทเป็นแค่การ render ไฟล์จริง UTF-8 ปกติ)
- แก้ dob + ติ๊ก Model เพิ่มให้ 4 คนแล้ว (Kani/Shekel/Moji/MONO) — เจ้าของส่งวันเกิด พ.ศ. มา แปลง −543

## ✅ Pre-launch review 2026-07-19 (ผ่านหมด — commit `d50599a`)
- tsc / lint / build = **สะอาด 100%** · ไม่มี hardcoded secret ใน git · ไม่มี vercel.app ค้างในลิงก์ใช้งาน (อ่านจาก SITE_URL หมด) · ไม่มี TODO/FIXME ค้าง
- **env ที่ตั้งใน Vercel Production แล้ว**: SUPABASE_URL/SECRET_KEY, LINE_CHANNEL_ID/SECRET, LINE_MESSAGING_ACCESS_TOKEN/CHANNEL_SECRET, LINE_SESSION_SECRET, NEXT_PUBLIC_LIFF_ID, NEXT_PUBLIC_BOOKING_LIFF_ID, ADMIN_LINE_USER_ID, ADMIN_LINE_NOTIFY_ID, NOTIFY_LINE_ACCESS_TOKEN, NOTIFY_LINE_CHANNEL_SECRET
- **⚠️ ยังไม่ได้ตั้ง (ตั้งตอนขึ้นโดเมนจริงเท่านั้น)**: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_MAIN_SITE_URL` — ตอนนี้ใช้ fallback (vercel.app / gamdangagency.com) ทำงานได้ปกติ · เซ็ต 2 ตัวนี้ + redeploy เมื่อผูกโดเมน
- **ค้าง (ก่อน public จริง)**: (1) เปลี่ยนรหัส admin `gamdang2026` (ใน Supabase Auth) (2) หน้า `app/style-guide/page.tsx` ยังอยู่ (public, dev-only — ลบได้ ไม่กระทบระบบ) (3) LINE_CHANNEL_SECRET ตั้งไว้แต่โค้ดไม่ได้ใช้ (ไม่เป็นไร)
- **DB/security**: RLS เปิดทุกตาราง 0 policy · เข้าถึงผ่าน service role (server-only) เท่านั้น · ไม่มี anon key public ✓

## 📌 TODO ถัดไป (เรียงตามลำดับ — อัพเดต 2026-07-19)

**เพิ่งทำรอบ 2026-07-19 (รอบ 3, commits `22a7af4`+`a2c3d98`, deploy แล้ว):**
- [x] **Talent picker ในหน้าโปรเจกต์ — pagination + filter**: `getPickerTalents(projectId, filters)` กรองในฐานข้อมูล (tier[]/expertise[]/ช่วงอายุ/role/ค้นหา) + count จริง + แบ่งหน้า 12/หน้า (เลิก slice(12) ที่ทำให้เห็นไม่ครบ) · UI มี checkbox Tier + Expertise เลือกหลายอัน, ช่องอายุต่ำ-สูง, ปุ่มก่อนหน้า/ถัดไป (anchor #picker) · **⚠️ GOTCHA**: ไฟล์ "use server" export ได้เฉพาะ async fn — `PICKER_PAGE_SIZE` ต้องเป็น const ธรรมดา (ไม่ export) ไม่งั้น build พัง
- [x] **แก้ขนาดหน้า PDF** (`/admin/projects/[id]/print`): ต้นเหตุ = เนื้อหา 210mm ใน @page margin 10mm (พิมพ์ได้ 190mm) → Chrome ย่อ · แก้เป็น `@page margin:0` + `.pdf-page` เป็น A4 เป๊ะ (210×297mm, padding 12mm) · หน้าปก gradient เต็มหน้า + padding 18mm (bg เติมทั้งกล่องรวม padding) · เพิ่มไกด์ในหน้า: Destination=Save as PDF, Margins=None, Background graphics=ON · **บันทึกเป็น PDF ต้องตั้ง Margins:None เองในกล่องพิมพ์** (สั่งจากโค้ดไม่ได้)

**เพิ่งทำรอบ 2026-07-17→19 (รอบ 2, commits `2378204`→`d50599a`, deploy แล้ว):**
- [x] **แจ้งเตือนเข้ากลุ่ม LINE + OA ที่ 2** (commits `6180511`→`b56b0e9`): booking + casting apply แจ้งเตือน admin เข้ากลุ่มผ่าน OA **gamdangprofile** (แยกโควตาจาก OA หลัก) · env `NOTIFY_LINE_ACCESS_TOKEN`/`NOTIFY_LINE_CHANNEL_SECRET`/`ADMIN_LINE_NOTIFY_ID` (group id `Cdf97ea2...`) · webhook ที่ 2 `/api/line/webhook-notify` (พิมพ์ "id" ในกลุ่ม → ตอบ group id) · helper `lib/admin-notify.ts` · push/reply รับ token override · **⚠️ แจ้งเตือน apply สมัคร Model/Influencer ยังไม่มี** (เจ้าของบอกยังไม่ต้องทำ)
- [x] **Go-live URL** (commit `901015d`): submission.ts validate ลิงก์ /submit ด้วย SITE_URL (ไม่งั้นปุ่ม "ขอส่งงาน" พังตอนย้ายโดเมน) · ลิงก์ในแจ้งเตือนใช้ SITE_URL หมด · job noti ส่งหา `talent.line_user_id` เอง (ไม่ต้องแก้ตอน go-live)
- [x] **ค้นหาเช็คอินหน้างาน** (commits `db33f2c`+`d50599a`): หน้า detail รอบถ่าย `/admin/shoots/[id]` มีช่องค้นหาบนสุด (client-side filter ทันที + เลื่อนไปการ์ดที่เจอ) — เช็คอินเร็วเมื่อคนเยอะ · ช่องค้นหาข้ามรอบที่ `/admin/shoots` ยังอยู่

**เพิ่งทำรอบ 2026-07-17→19 (รอบ 1, commits `2378204`→`b97b397`, deploy แล้ว):**
- [x] **จองถ่ายจำสมาชิก** (`2378204`): เปิดจอง LIFF จาก LINE (มีโปรไฟล์แล้ว) → step 4 แตะการ์ดลูก → prefill ทุกช่อง + ผูก `shoot_bookings.talent_id` (เช็ค ownership) · API `/api/booking/profiles`
- [x] **ฟอร์ม talent UX ใหม่** (`afe4b04`): social เป็นการ์ดมีไอคอนสีแบรนด์ + label ชัด + placeholder ลิงก์จริง + ไกด์ · role/expertise/ethnicity เป็นชิปกดง่าย responsive
- [x] **หมวดงาน Project เพิ่ม** (`153422a`): Ads Commercial, Lookbook Shooting, Fashionshow
- [x] **แก้ Batch Upload 500** (`03474a5`): ghost inbox row (ไฟล์หาย) → assignInboxPhoto ลบ row ทิ้งแทน throw · แยก `/api/casting-apply-photo` ไม่ให้ casting apply สร้าง photo_inbox · เคลียร์ ghost + orphan ใน prod แล้ว
- [x] **ปุ่มลบ talent ในหน้า list** (`788c45e`): TalentRowCard มีปุ่มถังขยะ + confirm (stretched-link overlay) · ลบโปรไฟล์เปล่า 13 คน (บัญชีทดสอบ Oil)
- [x] **ไม่สร้าง row จนกรอกชื่อ** (`b291bc4`): "เพิ่มโปรไฟล์" → ฟอร์มเปล่า /apply/edit (ไม่มี id) → saveTalentSelf insert ตอนกดบันทึก (บังคับชื่อเล่น+เพศ+dob+เบอร์) · ลบ createTalentForSelf · กันโปรไฟล์เปล่าค้าง
- [x] **สองภาษา/อังกฤษหน้าสาธารณะ** (`7467b67`,`2f875f3`,`b0c2335`,`5287a88`,`72c4d45`,`b97b397`): banner จอง ไทย+อังกฤษ · หน้า `/talents` filter เป็นอังกฤษหมด · ปุ่ม "← Back to Home" ทุกหน้า (BackToHome รับ prop label) · `/casting` list เป็นอังกฤษ (subtitle ไทย+อังกฤษ)

**รอพี่เจ้าของทำ (ผู้ช่วยทำแทนไม่ได้):**
- [ ] **ทำ Rich menu ใน LINE OA** (คุยกันแล้ว 2026-07-16): ปุ่ม Casting = `https://liff.line.me/2010689219-wGKbITGb?next=/casting` (login ผ่าน /apply แล้วเด้งไป casting — ระบบจำสมาชิก) · ปุ่มโปรไฟล์/สมัคร = `https://liff.line.me/2010689219-wGKbITGb` (ไม่มี ?next)
- [ ] **ตั้งเมนูในเว็บ WP (แชท Claude อีกตัว)**: ทาเลนต์ → `/talents` · Casting → `/casting` · สมัคร → LIFF wGKbITGb · จองถ่าย → LIFF ciPMtS8K · Admin → `/admin/login` (ร่างคำสั่งส่งให้พี่แล้ว 2026-07-16)
- [ ] **เทส casting ครบวงจรโหมดสมาชิก**: เปิด /casting ใน LINE (บัญชีที่มีลูกหลายคน) → เห็นการ์ดลูก ติ๊กเลือกหลายคน → "สมัครเลย" → หลังบ้านเห็นผู้สมัคร → "✓ รับเข้า Project" → คนนั้นเข้า proposal (ปุ่ม LINE login จาก browser เทสผ่านแล้ว 2026-07-16 · โหมดกรอกเอง+Compcard ยังไม่เทส)
- [ ] **เทสจองถ่ายแบบสมาชิก (ของใหม่ 2026-07-17)**: เปิดลิงก์จอง LIFF จาก LINE (บัญชีที่มีโปรไฟล์แล้ว) → step 4 ต้องขึ้นแถบเขียว "✓ ระบบจำคุณได้" + การ์ดลูกให้แตะ → แตะแล้วทุกช่องถูกกรอกอัตโนมัติ (แก้ได้) → จองเสร็จ booking ผูก talent เดิมเลย (หลังบ้านขึ้น "👤 ดูโปรไฟล์ Talent" ไม่ใช่ "เพิ่มเข้าระบบ") — flow: `/api/booking/profiles` (id token → โปรไฟล์บัญชีนั้น) + picker ใน BookingWizard + `/api/booking` เช็ค ownership ก่อนผูก `shoot_bookings.talent_id`
- [x] **Casting Calls ทั้งระบบ (commits `1afc936`→`24d3b3a`, migration 013 รันแล้ว, LINE login เทสผ่าน 2026-07-16)**: ดูหัวข้อ "ระบบ Casting Calls" ด้านล่าง
- [x] ~~รัน migration 013~~ **รันแล้ว 2026-07-16** (cover_path/category/is_published/casting_closed + project_roles + project_applications)
- [x] **1 LINE = หลายลูก + จองเชื่อม LINE (commits `c1a4936`+`8ec9255`, migration 011+012 รันแล้ว, e2e ผ่าน 2026-07-16)**: (A) session talent เก็บ **บัญชี LINE** (lineUserId+name/pic) ไม่ใช่ talentId เดียว · `/apply` login → หน้า **`/apply/profiles`** ลิสต์ลูกทุกคน + ปุ่มเพิ่มโปรไฟล์ (`createTalentForSelf`) · `/apply/edit?id=` โหลดผ่าน `getOwnedTalent` (เช็ค line_user_id ตรงบัญชี — กันแก้ข้ามบัญชี) · saveTalentSelf/upload/deletePhoto เช็ค ownership ตามบัญชี LINE · migration 011 drop unique `line_user_id` (talent เก่ากลายเป็นลูกคนแรกอัตโนมัติ) · `/api/line/verify` ไม่ auto-create talent แล้ว (B) จองถ่าย: ถ้าเปิด **ในแอป LINE** wizard เก็บ id token เงียบๆ → `/api/booking` verify → เก็บ `shoot_bookings.line_user_id` → createTalentFromBooking ผูกให้ talent อัตโนมัติ → โผล่ในโปรไฟล์แม่ (browser จองได้ปกติ ไม่เชื่อม) · **⚠️ ต้องมี LIFF app endpoint ชี้ `/booking` แล้วแชร์ลิงก์ใน OA ถึงจะ auto-capture (LIFF เดิมชี้ `/apply`)** · session เปลี่ยนรูปแบบ → คนเก่าต้อง login ใหม่ 1 ครั้ง
- [x] **ฟอร์มจอง v2 (commits `d1ed9a2`+`82b5174`, migration 010 รันแล้ว, e2e ผ่าน 2026-07-15)**: บังคับ **ชื่อเล่น(อังกฤษ)** แทนชื่อจริง (ชื่อจริง optional, DB full_name NOT NULL → fallback = ชื่อเล่น) · บังคับ **อีเมล** · เพิ่มช่อง **สัญชาติ** (booking + talent) · createTalentFromBooking ลงชื่อเล่นที่ `nickname_en` + carry gender/dob/nationality ครบ · **⚠️ GOTCHA ซ้ำรอยเดิม**: เคยเขียน `update({gender,dob,nationality})` ก่อนรัน migration 010 → ทั้ง statement ล้ม เพศ/วันเกิดหายด้วย (การจอง "Noo" เสีย) → แก้เป็น fallback บันทึกเฉพาะ gender/dob ถ้า nationality column ไม่มี · **บทเรียน: อย่า deploy โค้ดที่เขียน column ใหม่ก่อนพี่รัน migration — หรือทำ fallback เสมอ**
- [x] **ฟอร์มจอง+รหัส+สัญชาติ+ค้นหาการจอง (commit `5bca1b8`, migration 009 รันแล้ว, e2e ผ่าน 2026-07-15)**: ฟอร์มจองถ่าย step 4 label 2 ภาษา + guide + เพศ(dropdown) + วันเกิด → เก็บใน booking + ติดไปตอน "เพิ่มเข้าระบบ Talent" (อายุคำนวณจาก dob เสมอ) · **รหัส talent อัตโนมัติ format ระบบเก่า** (2 ตัวอักษร+3เลข+1ตัวอักษร เช่น FF979D ผ่าน `gen_talent_code()`) — GD-xxxx เดิมยังอยู่ · **แอดมินแก้รหัสเองได้** ในฟอร์ม talent (เช็คซ้ำ) ไว้โอนรหัสระบบเก่า · `talents.nationality` แก้ได้ทั้ง admin/self · การ์ด (หน้าบ้าน+หลังบ้าน) โชว์ เพศ·อายุ(เด็ก<10 มีเดือน "3 ปี 0 ด.")·สูง·หนัก·สัญชาติ·รหัส · **ค้นหาการจอง** บน /admin/shoots (ชื่อ/ชื่อเล่น/เบอร์/รหัส talent → คลิกเด้งไปการ์ด)
- [x] ~~รัน migration 008~~ **รันแล้ว + e2e ผ่าน 2026-07-15** (จอง→เช็คชื่อ arrived_at→สร้าง talent GD จาก booking→ผูก talent_id ครบ, ข้อมูลทดสอบลบแล้ว) — เช็คชื่อ/เพิ่ม talent พร้อมใช้
- [x] ~~รัน migration 005~~ **รันแล้ว + ผู้ช่วยเทส e2e ผ่าน** (ฟอร์ม casting render ครบ, อัพรูปได้ไฟล์ valid, /photo เสิร์ฟ casting folder, ลบรูปได้)
- [x] **Photoshoot Overview (commit `d0c01c1`, deploy แล้ว — รอ migration 008 ถึงใช้เช็คชื่อ/เพิ่ม talent ได้)**: หน้ารอบถ่ายมี grid ต่อห้อง (Photo 15 / Video 12 × 10 ชม.) ทุกคิวเป็นช่องสี่เหลี่ยมคลิกได้ (ฟ้า=มาแล้ว, เทา=อนุมัติยังไม่มา, เหลือง=รอตรวจสลิป, ช่องว่าง=ที่ว่าง, ชั่วโมงที่ปิดขีดฆ่า) — **Package A โผล่ทั้ง 2 ห้อง** (กินที่ทั้งคู่ ยืนยันกับพี่แล้ว) · คลิกช่อง → เด้งไปการ์ดคนจอง (:target ring) · ปุ่ม "🏁 มาถึงแล้ว/↩︎ ยกเลิกเช็คชื่อ" (`arrived_at` + เวลา) · ปุ่ม "➕ เพิ่มเข้าระบบ Talent" สร้าง talent pending (prefill ชื่อ/ชื่อเล่น/เบอร์/email/LINE/สูง/หนัก + โน้ตที่มา) ผูก `booking.talent_id` → เปลี่ยนเป็นปุ่ม "👤 ดูโปรไฟล์ Talent" (ต่อด้วย flow สร้างลิงก์เชื่อม LINE เดิมได้)
- [x] **ระบบจองถ่ายโปรไฟล์ (commits `90890b3`+`20ed3a7`, migration 007 รันแล้ว, e2e ผ่านทุกข้อ 2026-07-14)**: ย้ายจาก WP mu-plugin ตามสเปค `~/Local Sites/gamdangagency/app/public/docs/05-booking-system-requirements.md` — ตาราง `shoot_days` (slots jsonb เปิด/ปิดรายชั่วโมง 2 ห้อง) + `shoot_bookings` + ฟังก์ชัน `book_shoot_slot()` จอง atomic (advisory lock ปิด race) · Photo 15/ชม. (A+B กิน), Video 12/ชม. (A กินเพิ่ม), pending+approved ถือที่ rejected คืนที่ · สลิปเก็บ bucket **ส่วนตัว** `booking-slips` (admin ดูผ่าน signed URL, public โดนบล็อก ✓) · Public API มี CORS ให้ WP เรียก: `GET /api/booking/dates` (boolean เท่านั้น ไม่มีจำนวนหลุด ✓) + `POST /api/booking` (base64 slip, honeypot ✓, ที่เต็ม → 409 full + ลบสลิปทิ้ง) · หน้า `/booking` wizard 4 step ตามดีไซน์ WP + ปุ่ม CTA บนหน้าแรก · admin `/admin/shoots` (nav "จองถ่าย" + badge, dashboard tile สลิปรอตรวจ): เปิดรอบ, toggle เปิด/ปิดห้องรายชั่วโมง (เห็นจำนวน x/15 y/12 เฉพาะ admin), คิวตรวจสลิป อนุมัติ/ปฏิเสธ/กลับเป็นรอตรวจ · จองใหม่ push แจ้งเตือน LINE หาแอดมิน (env `ADMIN_LINE_USER_ID`) · ค่าคงที่ (ราคา/ความจุ/บัญชีธนาคาร) รวมที่ `BOOKING` ใน lib/constants — **รอพี่เทสมือ: เปิดรอบจริง + จองจากมือถือ + ตรวจสลิป**
- [x] **UX รอบล่าสุด (commits `9c876b0`→`d28d4b9`, deploy แล้ว, พี่คอนเฟิร์ม Perfect)**: (1) ปุ่มย้อนกลับครบทุกหน้า admin + ฟอร์ม "กรอกแทน" มีแถบกลับหน้าโปรเจกต์ (?from=admin ติดตลอด save/error, talent ไม่เห็น) (2) ตัวกรอง ส่วนสูง/อายุ เป็นชุดเดียว [ต่ำสุด] ถึง [สูงสุด] + หน่วย พร้อม **stepper ▲▼ + หมุน scroll เมาส์** (`components/admin/RangeStepper.tsx`) (3) **Dashboard 6 tiles**: talent ทั้งหมด/active/pending + โปรเจกต์รวม/งาน Model/งาน Influencer (กดเด้งไป list พร้อมกรอง) — เป็น count-only query ทั้งหมด (4) **หน้า Projects ค้นหาได้**: ชื่องาน/ลูกค้า + ประเภท + ปีของงาน (ยึดปีวันถ่าย fallback ปีสร้าง, โชว์ คศ+พศ) + pagination 50/หน้า (`getProjectsPage`/`getProjectCounts`) (5) lint สะอาด 100%
- [x] **Admin ทำแทนได้หมด (commit `d5526b7`, deploy แล้ว)**: แถว talent ในหน้าโปรเจกต์ (1) โชว์ portfolio จากหน้า talent เมื่อยังไม่มี submission ("🗂 ลิงก์จากโปรไฟล์" — แก้ปัญหาแอดมินกรอกลิงก์ Marwin แล้วไม่ขึ้น) (2) ปุ่ม "★ ลูกค้าสนใจ" toggle แทนลูกค้า (`toggleClientInterestAdmin`) (3) ปุ่ม "บันทึกว่ารับงาน/ปฏิเสธ" แทน talent (`setTalentResponseAdmin`) (4) ปุ่ม "✏️ กรอกแทน" เปิดฟอร์ม /submit เดียวกับ talent ให้แอดมินกรอกผลงาน/รูป casting/คลิปแทนได้ · หมายเหตุ: T&C ของลูกค้ายังต้องให้ลูกค้ากดเอง (เก็บ IP เป็นหลักฐาน — by design)
- [x] **Photo-mosaic + ethnicity ใหม่ (commit `7409f81`, ตรวจ live แล้ว)**: การ์ดเป็นตารางรูปล้วนแน่นๆ (3-6 คอลัมน์ gap แคบ) ข้อมูลทั้งหมดเด้งเป็น overlay ตอน hover (ตามตัวอย่างเว็บเอเจนซี่ที่พี่ส่ง) — admin มี chip สถานะเล็กติดรูปตลอด · **Ethnicity เปลี่ยนเป็น 6 ตัวเลือกตามที่พี่กำหนด**: asian / mixed_race / caucasian / south_asian_me / african_black / hispanic_latino (label ไทยในวงเล็บ) — ข้อมูลเก่า 6 คนถูก remap เข้าหมวดใหม่แล้ว (southeast/east/central→asian, white→caucasian, south_asian+middle_eastern→south_asian_me, black_*→african_black)
- [x] **Scale + unify round (commit `37c5241`, ตรวจ live แล้ว)**: (1) saveTalent error ไม่ขึ้นหน้าขาวแล้ว — เด้งกลับฟอร์มพร้อมข้อความ (บั๊กที่พี่เจอคือเซฟก่อน migration 006 เข้า) (2) `/photo?w=320` = thumbnail (เล็กลง ~13 เท่า, 180KB→14KB) ใช้ในทุก grid (3) **การ์ดหน้าบ้าน = หลังบ้าน ใช้ `components/talent/TalentGridCard.tsx` ตัวเดียว** (influ มี icon social + top follower, AI มี character chips, admin มี status chip) (4) photo inbox ใช้ **TalentCombobox ค้นหา** (`searchTalents` top-20) แทน dropdown — รองรับหมื่นคน (5) **pagination 60/หน้า** ทั้ง /admin/talents (คงตัวกรอง) และหน้าแรก (count query ต่อ tab)
- [x] **Admin UX round ตามฟีดแบ็กพี่ (commit `13bd8db`, migration 006 รันแล้ว, inbox e2e ผ่าน)**: (1) ลิงก์ใน report เปิด new tab (2) **portfolio ย้ายมาที่ตัว talent**: `talents.portfolio_links`+`intro_video_url` — แอดมินกรอกเองในการ์ด "Portfolio" ของ TalentForm, casting form ของ talent sync เข้า record + รูป casting เข้า gallery ถาวร, Casting Report อ่านจาก talent ก่อน (3) ปุ่มงาน model เปลี่ยนเป็น "📸 ขอรูปและลิงก์ผลงานเพิ่ม" (4) `/admin/talents` เป็นการ์ดรูป คลิกเข้าหน้าเชิงลึก (ปุ่มลบย้ายไปหน้า detail) (5) **Photo Inbox** `/admin/photos` (เมนู "รูปภาพ"): batch upload → เก็บ `_unassigned/` + ตาราง `photo_inbox` → มอบหมายทีละรูปเลือก talent + Gallery/Comp Card (storage move + แทน compcard เดิม) (6) **Dashboard ใหม่**: stat tiles + 🧹 Cleanup ลิสต์ talent ไม่อัพเดทเกิน 3 ปี ปุ่มเก็บไว้/ลบทิ้ง (ใช้ `updated_at` ที่ trigger เด้งอัตโนมัติ)
- [ ] ทดสอบ casting flow ด้วยมือพี่: สร้าง project ประเภท **งาน Model** → เพิ่ม talent → "📤 ขอส่งงานทาง LINE" (ได้ Flex "ขอข้อมูลเพิ่มเพื่อเสนอลูกค้า 📸") → ฟอร์มอัพรูป 3 รูป + ลิงก์ผลงานเก่า + คลิปแนะนำตัว → หลังบ้านเห็น chips 🖼/🎬 → "📊 Report ผลงาน" = **Casting Report** (การ์ดคนที่ลูกค้าเลือก + รูป 3 + ลิงก์ + คลิป)
- [x] ~~รัน migration 003~~ **รันแล้ว 2026-07-14** (ตกหล่นไปช่วงแรก — คือต้นเหตุ error "บันทึกไม่สำเร็จ: Could not find the 'character' column" ตอนแอดมินเซฟฟอร์ม talent; ใช้ `"character"` แบบมี quote เพราะเป็นคำสงวน Postgres) — ตรวจแล้วเซฟฟอร์มเต็ม payload ผ่าน
- [ ] สร้าง AI Model ตัวแรก: /admin/talents/new → ติ๊ก "เป็น AI Model" → กรอก Character (เช่น `Energetic / Fun`) → อัพรูป → ตั้งสถานะ active → เช็คว่าขึ้น tab AI Model หน้าแรก
- [ ] ทดสอบ flow เชื่อม record เก่ากับ LINE จริงในแอป LINE (ปุ่ม "สร้างลิงก์เชื่อม LINE" ในหน้าแก้ไข talent ที่ยังไม่ผูก LINE → ส่งลิงก์เข้า LINE ตัวเอง → เปิด → ต้องผูกเข้า record เดิมไม่สร้างใหม่)

**งานพัฒนา (ตกลงกันแล้วว่า "ทำหลังบ้านให้จบก่อน แล้วค่อยรวม WordPress"):**
- [x] **Milestone 12 — ลูกค้ากดเลือกจาก Port — เสร็จแล้ว (commit `1f78c21`, ตรวจ live แล้ว)**: ปุ่ม "+ สนใจคนนี้ / ✓ เลือกแล้ว" toggle บนการ์ดใน `/p/[token]` → `project_talents.client_interested` (action `actions/client-selection.ts` ตรวจ token+ownership), การ์ดที่เลือกมี ring เขียว + แถบ sticky "เลือกไว้ N คน", banner อธิบายวิธีเลือก, หลังบ้านโชว์ badge "★ ลูกค้าสนใจ" ต่อแถว + chip นับรวม — ปุ่มไม่ render ในหน้า admin/print (ไม่ส่ง selectToken)
- [ ] **⚠️ รอพี่ตั้งค่า Webhook ใน LINE Console (ครั้งเดียว จำเป็นให้ปุ่มในแชททำงาน)**: LINE Developers Console → channel ของ OA @gamdangmodeling → แท็บ **Messaging API** → Webhook settings → Webhook URL = `https://gamdang-app.vercel.app/api/line/webhook` → เปิด **Use webhook** → กด Verify (ควรขึ้น Success) — และปิด Auto-reply messages ใน LINE Official Account Manager ถ้ายังเปิดอยู่
- [x] **Milestone 13 v2 — Flex ตามสเปคระบบเดิม (commit `848635a`, webhook เทสผ่านด้วย signed postback แล้ว)**: ปุ่ม gradient น้ำเงิน→แดง "สนใจ (Interested)" + เทา "ไม่สะดวก" เป็น **postback ตอบในแชทเลย** ผ่าน `/api/line/webhook` (ตรวจ x-line-signature ด้วย `LINE_MESSAGING_CHANNEL_SECRET`) → อัพเดต `talent_response` + ตอบกลับอัตโนมัติ (งาน model = ย้ำให้ล็อกคิววันถ่าย, influ = ขอบคุณทั่วไป) · label อังกฤษ Client/Shooting Date/Budget, วันที่ "23 Jul 2026", ไม่มีข้อมูล = "To Be Confirmed" · ปุ่มเช็คคิวเท่านั้น — ยืนยันจริงด้วย Flex **"Job Confirmed 🎉"** (ปุ่ม "🎉 ส่ง Job Confirmed" โผล่ในแถวที่ตอบรับแล้ว) · `/job/[token]` (ทางสำรองคน非LINE) ปรับ wording เดียวกัน
- [x] **Milestone 13 — แจ้งงานหา talent + รับคำตอบ — เสร็จแล้ว (commit `988d89c`)**: แถบแจ้งงานใต้แต่ละแถว talent ในหน้าโปรเจกต์ — chip สถานะ (ยังไม่แจ้ง/แจ้งแล้ว·รอตอบ/รับงานแล้ว/ปฏิเสธ จาก `talent_response`), ปุ่มเขียว "📨 แจ้งงานทาง LINE" ส่ง Flex (คนที่มี `line_user_id`), ปุ่ม "📋 คัดลอกข้อความแจ้งงาน" (คนไม่ผูก LINE — copy แล้ว mark เป็นรอตอบ) → talent เปิด `/job/[token]` (JWT purpose="job" อายุ 14 วัน scoped ต่อแถว) เห็นรายละเอียดงาน กด รับงาน/ปฏิเสธ ได้โดยไม่ต้อง login. Messaging API creds = env `LINE_MESSAGING_ACCESS_TOKEN`/`LINE_MESSAGING_CHANNEL_SECRET` (.env.local + Vercel, **คนละ channel กับ LIFF** — LINE user id ของพี่เจ้าของไว้เทส: `U8d164ee92db91e2d3f69365b80e4607b`). ทดสอบแล้ว: push จริง 200, Flex จริงส่งถึงพี่แล้ว, หน้า /job render ถูก — **รอพี่กดปุ่มรับงานใน LINE เพื่อปิด loop**
- [x] **Milestone 14 — Form ส่งงาน Influ + Result Report — เสร็จแล้ว (commit `4deb2e2`, migration 004 รันแล้ว, /submit เทส live ผ่าน)**: คอลัมน์ `submission_links text[]`/`submission_note`/`submitted_at` บน project_talents (ลิงก์สูงสุด 5 บังคับในโค้ด) · ฟอร์ม `/submit/[token]` (JWT purpose="submit" อายุ 60 วัน, แก้ซ้ำได้, เติม https:// ให้) · หลังบ้านมีแถบส่งงานต่อแถว: chip สถานะ + ลิงก์ผลงานเป็น chip กดได้ + ปุ่ม "📤 ขอส่งงานทาง LINE" (Flex ปุ่ม gradient เปิดฟอร์ม) + คัดลอกลิงก์สำหรับคน非LINE · ปุ่ม "📊 Report ผลงาน" → `/admin/projects/[id]/report` หน้าปก Result Report gradient (ลูกค้า/จำนวนคน/จำนวนโพสต์/CTA) + บล็อกต่อคน (รูป/tier/follower/ลิงก์เรียงเลขกดได้/โน้ต/วันที่ส่ง) → Save as PDF ลิงก์กดได้ — **รอพี่เทสครบวงจร: ขอส่งงานทาง LINE → กรอกฟอร์ม → ดู Report**
- [ ] Polish ความปลอดภัย: เปลี่ยนรหัสแอดมิน (ตอนนี้ `gamdang2026`), พิจารณาลบหน้า `/style-guide`, (optional) เพิ่มเช็ค admin จริงใน `/api/upload`+`deletePhoto` (ดูหมายเหตุใน Milestone 8)
- [ ] **รวมกับเว็บ WordPress หน้าบ้าน** (ดูหัวข้อ "การรวมกับเว็บ WordPress" ด้านล่าง — เว็บ WP ยังอยู่ Local by Flywheel รอขึ้นโฮสต์จริงก่อน): (1) ปุ่มสมัครบน WP → LIFF URL (2) API `/api/public/talents` + shortcode ใน WP child theme (3) ผูกโดเมนจริง
- [ ] (ตอนรวม WP เสร็จ) ตัดสินใจว่าจะเก็บหรือถอดหน้า 3 tab บน Vercel (`/`)

**ลิงก์/ค่าที่ใช้บ่อย:** Production https://gamdang-app.vercel.app · LINE Official `@gamdangmodeling` · เว็บ `www.gamdang.com`, `www.gamdangagency.com`
- **LIFF สมัคร/จัดการโปรไฟล์** (endpoint `/apply`): `2010689219-wGKbITGb` → `https://liff.line.me/2010689219-wGKbITGb`
- **LIFF จองถ่าย** (endpoint `/booking`, เชื่อม LINE อัตโนมัติ): `2010689219-ciPMtS8K` → `https://liff.line.me/2010689219-ciPMtS8K` (env `NEXT_PUBLIC_BOOKING_LIFF_ID`)
- ⚠️ LIFF 2 ตัว endpoint ต้องไม่สลับกัน (เคยสลับครั้งนึงตอน add ตัวใหม่ — wGKbITGb=/apply, ciPMtS8K=/booking)
- **หน้าสาธารณะ**: `/casting` (ประกาศงาน+สมัคร), `/casting/[id]`, `/talents` (แกลเลอรีทาเลนต์ active)
- **Base URL ตั้งผ่าน env** (`lib/site.ts`): `NEXT_PUBLIC_SITE_URL` = โดเมนแอป (ลิงก์แชร์/OG/job/submit ทั้งหมด) · `NEXT_PUBLIC_MAIN_SITE_URL` = เว็บหลัก WP (ปุ่ม "← กลับหน้าหลัก", default `www.gamdangagency.com`) — วันย้ายโดเมนแก้ 2 ตัวนี้ใน Vercel + redeploy จบ ไม่ต้องแก้โค้ด

## ระบบ Casting Calls + หน้า Talent สาธารณะ (รอบ 2026-07-16→17, commits `1afc936`→`7343afb`)

**Casting Calls (ประกาศงานสาธารณะ + สมัคร + อนุมัติ):**
- **Migration 013 (รันแล้ว)**: `projects` เพิ่ม `cover_path`/`category`/`is_published`/`casting_closed` · ตาราง `project_roles` (หลาย role ต่องาน) · `project_applications` (pending/approved/rejected, unique project+talent)
- **หลังบ้าน**: ProjectForm มีการ์ด "ประกาศรับสมัคร" (อัพรูปปก **1200×630 OG** ผ่าน `/api/project-cover-upload` → `_unassigned` แบบเดียวกัน แต่เก็บ `_project-covers/` + /photo proxy อนุญาต path นี้แล้ว, เลือกหมวด, ติ๊กเผยแพร่/ปิดรับ) · หน้าโปรเจกต์มี: ลิงก์แชร์สาธารณะ+copy, ตัวจัดการ Roles (เพิ่ม/ลบ), รายชื่อผู้สมัคร + ปุ่ม "✓ รับเข้า Project" (→ insert `project_talents` ตาม project_type) / ปฏิเสธ
- **หน้าสาธารณะ `/casting`**: การ์ดสี CI (gradient น้ำเงิน→แดง — พี่สั่งห้ามใช้ส้ม), แท็บกรอง เปิดรับ/ปิดรับ/ทั้งหมด+ตัวนับ, งานปิด = grayscale + ป้ายแดง "SORRY. CASTING CLOSED." · `/casting/[id]`: OG/Twitter meta (รูปปก 1200×630 — แชร์ FB/LINE ขึ้น preview สวย), roles, ปุ่มแชร์ LINE/FB/copy
- **ระบบจำสมาชิก (`components/casting/CastingApply.tsx` + `actions/casting-apply.ts`)**: 3 โหมด — (1) **สมาชิก login แล้ว**: `getMyProfilesForCasting` โชว์การ์ดลูกทุกคน ติ๊กเลือกหลายคน → `applyAsMembers` (upsert ignoreDuplicates กันซ้ำ, เช็ค ownership ตาม line_user_id, คนสมัครแล้วขึ้น badge) (2) **ใน LINE ยังไม่ login**: auto-login เงียบๆ ผ่าน liff.getIDToken → /api/line/verify → refresh (3) **browser/Facebook**: ปุ่ม "เข้าสู่ระบบด้วย LINE" = ลิงก์ `/apply?next=/casting/{id}` — **⚠️ GOTCHA: เรียก liff.login() บนหน้าที่ไม่ใช่ LIFF endpoint = 400 Bad Request** ต้อง login ผ่าน /apply (endpoint จริง) แล้ว `?next` เด้งกลับ (`/apply` รับ ?next เฉพาะ path ภายใน กัน open-redirect)
- **โหมดกรอกเอง (ไม่ผูก LINE)**: บังคับแนบ **รูป Compcard (กรอบแนวนอน 3:2, อัพผ่าน /api/inbox-upload)** + เพศ + ส่วนสูง + น้ำหนัก (พี่สั่ง — เพราะต้องเอารูปไปเสนอลูกค้า) → สร้าง talent pending + talent_photos(compcard) + application

**หน้า `/talents` สาธารณะ (สำหรับเมนู "ทาเลนต์" ใน WP):**
- แท็บ ทั้งหมด/Model/Influencer/**AI Model** (เพิ่ม role "ai" ใน TalentFilters → `is_ai_model`) + ตัวกรอง (ค้นหา/เพศ/เชื้อชาติ/category/สูง/อายุ) + pagination — โชว์เฉพาะ **status=active**, ไม่มีข้อมูลส่วนตัวหลุด (เบอร์/อีเมล/LINE ไม่ออกจาก server) · ใช้ TalentGridCard เดิม (hover เห็นข้อมูล)

**UX รอบเดียวกัน:**
- **ปุ่มย้อนกลับ (commit `1cc6b9b`)**: `components/BackToHome.tsx` ("← กลับหน้าหลัก" → MAIN_SITE_URL) บน /talents, /casting, /casting/[id], admin ทุกหน้า (ผ่าน layout), admin login · `components/LiffBackButton.tsx` ("← กลับ" → `liff.closeWindow()`, fallback เว็บหลัก) บน /booking + /apply/profiles · ลบลิงก์ "📖 อ่านรายละเอียดแพกเกจ" ออกจากหน้าจอง (ลูกค้าอ่านจาก WP มาก่อนแล้ว — flow: WP → กดจอง → LIFF)
- **วันที่เป็น ค.ศ. (commits `64484e3`+`043b747`)**: `<input type="date">` บนเครื่องภาษาไทยขึ้น พ.ศ. 2569 → ใส่ `lang="en-GB"` (ทำใน `components/ui/input.tsx` เมื่อ type=date + raw input 2 จุดใน BookingWizard/CastingApply) + label DOB เขียนกำกับ "กรอกปีเป็น ค.ศ. เช่น 2025" ทั้ง 3 ฟอร์ม
- **หลังบ้าน Talents การ์ดบาร์ยาว (commit `7343afb`)**: `components/admin/TalentRowCard.tsx` แถวนอน 2 คอลัมน์ (xl) เห็นข้อมูลไม่ต้อง hover — รูปวงกลม, ชื่อ+code, อายุ·เพศ·สูง/หนัก·สัญชาติ, badge MODEL/INFLU/AI/tier, Expertise, "50K on Facebook" (top follower), ไอคอน social, ป้ายสถานะ — คลิกทั้งการ์ดเข้าหน้าแก้ไข · **หน้า /talents สาธารณะยังเป็น photo grid เดิม** (เน้นรูปไว้ขาย)

**แผนเชื่อม WP (บันทึกใน memory `gamdang-casting-wp-integration` ด้วย):** WP ยัง local (`gamdangagency.local`) → ตอนขึ้น `www.gamdangagency.com`: ผูกซับโดเมน `casting.gamdangagency.com` ใน Vercel + ตั้ง `NEXT_PUBLIC_SITE_URL` + เมนู WP ลิงก์มา (ตาราง URL อยู่ใน TODO ด้านบน)

## Stack & โครงสร้าง
- Next.js 16 (App Router, TypeScript, Tailwind v4, Turbopack) + Supabase (Postgres + Storage) + shadcn/ui
- โฟลเดอร์โปรเจกต์: `~/Documents/gamdang-app`
- GitHub: `github.com/oil-gif/gamdang-agency` (เชื่อม Vercel อัตโนมัติแล้ว — push ขึ้น `main` = deploy prod ทันที)
- Production URL: **https://gamdang-app.vercel.app**
- Supabase project: `xwhubbybwfrdepipszoy` (region Singapore), เก็บ credentials ใน `.env.local` (gitignored) และตั้งไว้ใน Vercel env vars แล้ว (production + preview)
- Admin login: `admin@gamdangagency.com` / `gamdang2026` (ควรเปลี่ยนก่อนขึ้นระบบจริง)

## สถาปัตยกรรมหลัก (สรุปจาก plan file)
- **Auth 2 ระบบแยกกัน**: Admin ใช้ Supabase Auth (email/password จริง) ผ่าน `lib/supabase/auth-server.ts` + `proxy.ts` (Next 16 เปลี่ยนชื่อจาก middleware.ts). Talent (model/influ) ใช้ LINE LIFF ID token verify เอง ไม่ผ่าน Supabase Auth เลย — เก็บ session เป็น JWT cookie ของเราเอง (`lib/auth/talent-session.ts`, cookie `talent_session`)
- **DB เข้าถึงได้ทางเดียว**: browser ไม่คุย Supabase ตรงเลย ทุกอย่างผ่าน Server Actions/Route Handlers ที่ใช้ service-role key เท่านั้น (`lib/supabase/server.ts`, มี `server-only` guard กันพลาด). RLS เปิดทุกตารางแต่ไม่มี policy ให้ anon/authenticated
- **รูปภาพ**: client-side pre-resize (`browser-image-compression`) → server resize จริงด้วย `sharp` → เก็บ Supabase Storage bucket `talent-photos` (public bucket, path `{talent_id}/{gallery|compcard}/{uuid}.webp`)

## ทำเสร็จแล้ว (Milestone 1-7)
1. ✅ Tooling check
2. ✅ Supabase project + schema (`supabase/schema.sql` — มี `talents`, `talent_photos`, `projects`, `project_talents`, `project_links`) + storage bucket
3. ✅ shadcn/ui + gradient theme (น้ำเงิน `#1D4ED8` → แดง `#B82233`) + font Kanit — ดูตัวอย่างที่ `/style-guide`
4. ✅ Admin auth (Supabase email/password) + protected `/admin/(protected)/**`
5. ✅ Admin Talent CRUD (list/create/edit/delete) — `/admin/talents`
6. ✅ Image upload pipeline (compcard + gallery) ทำงานที่หน้า `/admin/talents/[id]`
7. ✅ Filter system (ค้นหา, บทบาท, เพศ, สถานะ, tier, category, เชื้อชาติ, ส่วนสูง, อายุ)

**Schema เพิ่มเติมที่ปรับจาก plan เดิม** (ทำไปแล้ว ต้องจำไว้ถ้าจะ regenerate schema.sql):
- `ethnicity` (text เดี่ยว) → เปลี่ยนเป็น `ethnicities text[]` (multi-select, fixed list 10 ตัวเลือกใน `lib/constants.ts`)
- เพศ (`gender`) กับวันเกิด (`dob`) บังคับกรอกในฟอร์ม (validate ใน `actions/talents.ts` → `saveTalent()`)

## Milestone 8: LIFF apply/edit flow — โค้ดเสร็จแล้ว, รอทดสอบจริงผ่านแอป LINE

**ทำเสร็จแล้ว (deploy ขึ้น production แล้ว):**
- Channel ID/Secret + LIFF ID ได้จากพี่แล้ว, LIFF app สร้างใน LINE Developers Console แล้ว (Endpoint URL `/apply`, scope `profile openid`, size Full)
- Env vars ตั้งครบทั้ง `.env.local` และ Vercel production: `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `NEXT_PUBLIC_LIFF_ID`, `LINE_SESSION_SECRET`
- `lib/auth/talent-session.ts` — sign/verify JWT cookie ด้วย `jose` (cookie ชื่อ `talent_session`, 30 วัน)
- `app/api/line/verify/route.ts` — verify ID token ผ่าน LINE, upsert `talents` โดย `line_user_id` (ไม่แตะ status/source ของ record เดิม), set session cookie
- `app/(liff)/apply/page.tsx` — LIFF login, ส่ง ID token ไป verify, redirect ไป `/apply/edit`
- `app/(liff)/apply/edit/page.tsx` — อ่าน session cookie, render รูป + ฟอร์มโหมด self
- `TalentForm` ย้ายไป `components/talent/TalentForm.tsx` แล้ว รับ prop `mode: "admin" | "self"` (self mode ซ่อนช่อง "สถานะ")
- `saveTalentSelf(formData)` ใน `actions/talents.ts` — talentId มาจาก session cookie เท่านั้น, แก้ `status`/`source` ไม่ได้
- `TalentPhotos`/`PhotoUploader` ย้ายไป `components/talent/` แล้วเปิดใช้ในหน้า self ด้วย (พี่ขอเพิ่มระหว่างทำ) — ต้องแก้ `app/api/upload/route.ts` และ `deletePhoto()` ให้เช็คว่า talent session ตรงกับ `talent_id` ที่ส่งมาก่อน เพราะตอนนี้ talentId โผล่ใน hidden form field ของหน้า public แล้ว (ก่อนหน้านี้ endpoint พวกนี้ไม่มีการเช็คสิทธิ์เลย อาศัยว่าเข้าถึงได้แค่จากหน้า /admin เท่านั้น)
- **Flow เชื่อม record เก่ากับ LINE (แก้ปัญหา duplicate)** — commit `a851492`:
  - แอดมินกดปุ่ม "สร้างลิงก์เชื่อม LINE" ในหน้า `/admin/talents/[id]` (`components/admin/LineLinkButton.tsx` → `actions/talent-link.ts` → `createTalentLinkToken()`) ได้ลิงก์ `https://liff.line.me/<LIFF_ID>?link=<token>` (JWT อายุ 7 วัน, purpose="link") ส่งให้ talent ทาง LINE
  - talent เปิดลิงก์ในแอป LINE → `/apply` ส่ง `linkToken` ไปด้วย → `/api/line/verify` เอา LINE identity ผูกเข้ากับ record เดิม (ไม่ upsert สร้างใหม่) พร้อมเช็คว่าทั้งสองฝั่งยังไม่ถูกผูกกับคนอื่น
  - แยก JWT session (purpose="session") กับ link (purpose="link") ด้วย claim `purpose` กัน link token ถูกเอาไปใช้เป็น session cookie
  - หน้า admin edit โชว์สถานะ "ผูกบัญชี LINE แล้ว: <ชื่อ>" ถ้ามี `line_user_id` แล้ว ไม่งั้นโชว์ปุ่มสร้างลิงก์

- **ทดสอบจริงผ่านแอป LINE แล้ว (พี่เจ้าของทดสอบเอง)** — สมัครใหม่ผ่าน LINE ได้, จำข้อมูล, แก้ไข+save ได้ + redesign หน้า `/apply/edit` ให้สวย/responsive (header gradient + avatar/สถานะ, sticky save bar, หัวข้อสีน้ำเงิน + วงเล็บอังกฤษ 2 ภาษา, บังคับเบอร์โทร)
- **⚠️ GOTCHA สำคัญมาก — รูปอัพแล้วเปิดไม่ได้ (แก้แล้ว commit `ab6dac3`)**: ต้นตอคือ `supabase.storage.upload()` บน **Vercel serverless ทำ Node `Buffer` เพี้ยน** (ไบต์กลายเป็น UTF-8 replacement char `0xEFBFBD` → ไฟล์ WebP header เสีย เปิดไม่ได้ทั้ง sharp/browser/เว็บวิว). อัพจาก local dev ไม่เจอเพราะ Buffer รอดใน Node ปกติ **→ ต้องห่อเป็น `new Blob([new Uint8Array(buf)])` ก่อน upload เสมอ** (ดู `app/api/upload/route.ts`). ระหว่างไล่บั๊กเพิ่มของประกอบ 2 อย่างที่ยังใช้อยู่: (1) `app/photo/[...path]/route.ts` เสิร์ฟรูป same-origin + transcode เป็น JPEG (กันเว็บวิว LINE render WebP ไม่ได้), (2) upload เปลี่ยนจาก multipart เป็น base64 JSON. รูปเก่าที่อัพก่อน `ab6dac3` เสียถาวร ต้องลบทิ้งอัพใหม่.

**ค้างอยู่:**
1. **flow เชื่อม record เก่า (admin-issued link) ยังไม่ได้ทดสอบจริงผ่านแอป LINE** — สมัครใหม่ทดสอบแล้ว แต่ปุ่ม "สร้างลิงก์เชื่อม LINE" + เปิดลิงก์ `?link=<token>` ในแอป LINE ยังไม่เคยรันจริง
2. หมายเหตุความปลอดภัยที่ค้างจากก่อนหน้านี้ (ไม่ใช่ของใหม่): `/api/upload` และ `deletePhoto` ยังไม่เช็คว่าเป็น admin จริงๆ (อาศัยแค่ middleware กัน `/admin/:path*`) — ตอนนี้เพิ่มเช็คฝั่ง talent session แล้ว แต่ฝั่ง admin ยังเปิดกว้างอยู่เหมือนเดิม ถ้าจะ harden เพิ่มค่อยทำทีหลังได้

## Milestone 9: Admin approval queue — เสร็จแล้ว (commit `588bfb2`)
- หน้า `/admin/approvals` โชว์ talent ที่ `status='pending'` เป็นการ์ด (รูป compcard ผ่าน `/photo` proxy + code/บทบาท/อายุ/ส่วนสูง/tier/เบอร์/สรุป social) พร้อมปุ่ม อนุมัติ/ปฏิเสธ (`approveTalent`/`rejectTalent` → status active/rejected) + ลิงก์ไปหน้าแก้ไขเต็ม
- nav ในแอดมินมีลิงก์ "รออนุมัติ" + badge จำนวน pending (สีแดงแบรนด์) จาก `getPendingCount()`
- ยังไม่ได้ทดสอบกด approve/reject จริงผ่าน UI (auth guard + query + build ผ่านแล้ว, DB มี pending 2 คน) — พี่ล็อกอินแอดมินแล้วลองได้เลย

## Milestone 10 + 11: Project system + Client portfolio link — เสร็จแล้ว (commit `1de4cc3`, ทดสอบ e2e ผ่าน)
- ต้องรัน migration `supabase/migrations/002_project_fields.sql` ก่อน (เพิ่ม `projects.project_type`/`shooting_date`/`budget`) — **รันแล้ว** ใน Supabase
- หลังบ้าน `/admin/projects` (มีเมนูใน nav): สร้าง/แก้ project (ประเภทงาน model/influencer, ลูกค้า, shooting date, budget, สถานะ) + จัดการ talent ในโปรเจกต์ (ค้นหา/filter เฉพาะ active, เพิ่ม/เอาออก, สลับ compcard⇄influcard ต่อคน, เรียง ▲▼) + จัดการลิงก์ลูกค้า (token 30 วัน, copy/ยกเลิก/ต่ออายุ, เห็น view count + สถานะ T&C)
- หน้าลูกค้า `/p/[token]`: T&C gate เก็บ IP+เวลา → หน้าปก gradient + header GAMDANG AGENCY. การ์ด Model = compcard เต็ม (fallback รูป) + อายุ/สูง/หนัก/ethnicity. การ์ด Influencer = รูป gallery + tier + ยอด follower ช่องที่เยอะสุด + expertise + ไอคอน social กดได้ (รองรับ handle หรือ URL เต็ม). ปุ่มลอย print → PDF ลิงก์กดได้
- ไฟล์สำคัญ: `actions/projects.ts`, `actions/project-links.ts`, `actions/public-link.ts`, `lib/social.ts` (topSocial/talentSocials), `lib/public-link.ts`, `app/p/[token]/page.tsx`, `components/admin/ProjectForm.tsx`
- **รอบ polish ตามฟีดแบ็กพี่ (commit `f0a651d`, ตรวจ live แล้ว):**
  - การ์ด Influencer หน้า `/p/[token]` เป็นแบบ compact ตามตัวอย่างระบบเก่า (รูปวงกลม, tier pill, แถว Max Followers/Age, expertise chips, ปุ่ม social วงกลมสีแบรนด์กดได้) จัด grid 2-3 คอลัมน์ — การ์ดกลางใช้ `components/public/TalentCards.tsx` (ModelCard/InfluCard/PrintMiniCard ใช้ร่วม 3 ที่)
  - ใช้ code จริง (GD-xxxx) แทนเลขลำดับ 01/02
  - T&C เพิ่มข้อห้ามติดต่อ Model/Influencer โดยตรง (รวม DM) ไทย+อังกฤษ + ย้ำใน footer
  - **PDF ฝั่ง admin**: `/admin/projects/[id]/print` — ปุ่ม "🖨 สร้าง PDF" ในหน้าโปรเจกต์ → preview → Save as PDF จาก Chrome (ต้อง Chrome ลิงก์ถึงติดไปในไฟล์)
  - Picker เพิ่ม talent โชว์ รูปเล็ก/tier/max follower/expertise/จุด social ครบ
  - ปุ่มเลือก card type เปลี่ยนจาก toggle ⇄ เป็น segmented [Comp Card | Influ Card] — **บั๊ก "social ของ Tammy ไม่ขึ้น" เกิดจาก row เธอค้างเป็น compcard** (layout compcard ไม่โชว์ social โดยดีไซน์) แก้ข้อมูลเป็น influcard แล้ว
  - Admin shell ใหม่: header navy + เส้นแดง, nav pill มี active state (`components/admin/AdminNav.tsx`), เนื้อหา max-w-6xl, ซ่อน chrome ตอน print
- **รอบ polish PDF ที่ 2 (commits `82cb286`,`e52c060`,`82aae4c` — สเปคสุดท้ายที่พี่คอนเฟิร์มแล้ว):**
  - PDF = **หน้าปก Report เต็ม A4** (gradient แบรนด์, ชื่อ project, ลูกค้า, shooting date, จำนวน talent, วันที่จัดทำ) + หน้าการ์ด **10 ใบ/หน้า (2 คอลัมน์ × 5 แถว)**
  - การ์ด influ ใน PDF: รูปกรอบแนวตั้ง 3:4 object-top (เห็นหน้าชัด) + ไอคอน social วงกลมสีแบรนด์เรียงแถวพร้อมยอด follower · การ์ด model: กรอบรูปแนวนอนกว้าง **object-contain เห็นคอมการ์ดเต็มใบ** + ไอคอน+ยอดช่องที่ follower เยอะสุด
  - CTA footer ทุกหน้า PDF + หน้าปก: LINE Official `@gamdangmodeling` + `www.gamdang.com` + `www.gamdangagency.com` — เป็นลิงก์กดได้ใน PDF (Interactive PDF)
  - ข้อมูลติดต่อรวมศูนย์ที่ `CONTACT` ใน `lib/constants.ts` (มี lineUrl แบบ add-friend `line.me/R/ti/p/%40gamdangmodeling`)
  - หน้าลิงก์ลูกค้า `/p/[token]`: **เอาปุ่ม print ออกแล้ว** (PDF เป็นของ admin เท่านั้น) + เพิ่ม **CTA gradient ท้ายหน้า** (ปุ่ม LINE เขียว + เว็บไซต์ 2 ปุ่ม) + ไอคอน social การ์ด influ โชว์ยอด follower ข้างไอคอนเหมือน PDF

## หน้าบ้านสาธารณะ 3 Tab + AI Model — โค้ดเสร็จ deploy แล้ว (commit `e21d2a5`)
- หน้าแรก `/`: nav ติดบน + ปุ่ม LINE, hero gradient, **3 tab pills: Model (น้ำเงิน) / Influencer (แดง) / AI Model (gradient)** พร้อมจำนวนต่อ tab, การ์ดรูป 3:4 grid 2-4 คอลัมน์ (ชื่อ+อายุ overlay ล่าง, tab AI มี character chips), CTA ติดต่อ + footer — เลือก tab ผ่าน `?tab=` (server-rendered)
- โชว์เฉพาะ `status='active'`, คนที่เป็นทั้ง model+influ ขึ้น 2 tab, ข้อมูล public ถูก map เป็น minimal shape ใน `lib/public-talents.ts` (กัน phone/LINE id หลุดใน HTML)
- **AI Model**: migration `003_ai_model.sql` เพิ่ม `talents.is_ai_model` + `character` — checkbox "เป็น AI Model" + ช่อง Character (คั่นด้วย /) ใน TalentForm เฉพาะ admin mode, self-service ตั้งไม่ได้โดยตั้งใจ. โค้ดอ่านแบบ migration-tolerant (deploy ก่อนรัน SQL ได้ tab AI แค่ว่าง)
- **ค้าง**: (1) พี่ต้องรัน migration 003 ใน Supabase SQL Editor (2) สร้าง AI Model ตัวแรกผ่าน /admin/talents/new (ติ๊ก AI Model + กรอก Character + อัพรูป + ตั้ง active) (3) เว็บไซต์จริง www.gamdang.com ยังไม่ได้ผูกโดเมนกับ Vercel — ถ้าจะใช้เป็นหน้าเว็บหลักต้องตั้ง custom domain

## การรวมกับเว็บ WordPress หน้าบ้าน (แผนใหม่ 2026-07-14, ยังไม่เริ่ม)
- **พี่มีเว็บหน้าบ้าน WordPress+Elementor อยู่แล้ว** (โดเมน gamdangagency, ดีไซน์เสร็จ: tab ทั้งหมด/Model/Influencer/AI Model + การ์ด talent + TH/EN + ปุ่ม "สมัคร Model/Influencer" + "Admin Login" + "จองถ่ายโปรไฟล์") — WP จะเป็นหน้าบ้านหลัก, แอป Next.js เป็นระบบหลังบ้าน/LIFF/Port ลูกค้า
- แผนรวมที่ตกลงกัน: (1) ปุ่มสมัครบน WP → LIFF URL, ปุ่ม Admin Login → gamdang-app.vercel.app/admin (2) เปิด JSON API สาธารณะ `/api/public/talents` จากแอป แล้วเขียน shortcode ใน WP child theme ดึงมา render การ์ดอัตโนมัติ (single source of truth = Supabase, แอดมินอนุมัติแล้วขึ้นเว็บเอง)
- หน้า 3 tab บน Vercel (`/`) เก็บไว้เป็น preview ได้ หรือถอดทีหลังเมื่อ WP เป็นหน้าหลัก

## Polish รอบสุดท้าย (ยังไม่เริ่ม)
- เปลี่ยนรหัส admin, ลบหน้า /style-guide ถ้าไม่ใช้, ฯลฯ

## ตัวช่วยที่ตั้งไว้แล้ว ไม่ต้องตั้งใหม่
- `gh` CLI login เป็น account `oil-gif` แล้ว
- `vercel` CLI login เป็น account `oil-9318` แล้ว, project linked (`gamdang/gamdang-app`)
- `psql` ติดตั้งแล้วที่ `/opt/homebrew/opt/libpq/bin/psql` (เชื่อม Supabase Postgres ตรงได้ถ้าต้องรัน SQL migration เพิ่ม)
