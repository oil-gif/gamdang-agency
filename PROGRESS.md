# Gamdang App — Progress / Handoff

> อ่านไฟล์นี้ก่อนเริ่มทำงานเสมอ — สรุปว่าทำอะไรไปแล้ว ทำอะไรค้างอยู่ และต้องทำอะไรต่อ

## 📌 TODO ถัดไป (เรียงตามลำดับ — อัพเดต 2026-07-14)

**รอพี่เจ้าของทำ (ผู้ช่วยทำแทนไม่ได้):**
- [ ] **รัน migration 003** ใน Supabase SQL Editor (https://supabase.com/dashboard/project/xwhubbybwfrdepipszoy/sql/new): เนื้อหาอยู่ที่ `supabase/migrations/003_ai_model.sql` — จำเป็นก่อนสร้าง AI Model (ถ้าไม่รัน กดบันทึกฟอร์ม talent ฝั่ง admin จะ error เพราะ insert คอลัมน์ `is_ai_model` ที่ยังไม่มี)
- [ ] สร้าง AI Model ตัวแรก: /admin/talents/new → ติ๊ก "เป็น AI Model" → กรอก Character (เช่น `Energetic / Fun`) → อัพรูป → ตั้งสถานะ active → เช็คว่าขึ้น tab AI Model หน้าแรก
- [ ] ทดสอบ flow เชื่อม record เก่ากับ LINE จริงในแอป LINE (ปุ่ม "สร้างลิงก์เชื่อม LINE" ในหน้าแก้ไข talent ที่ยังไม่ผูก LINE → ส่งลิงก์เข้า LINE ตัวเอง → เปิด → ต้องผูกเข้า record เดิมไม่สร้างใหม่)

**งานพัฒนา (ตกลงกันแล้วว่า "ทำหลังบ้านให้จบก่อน แล้วค่อยรวม WordPress"):**
- [ ] Polish ความปลอดภัย: เปลี่ยนรหัสแอดมิน (ตอนนี้ `gamdang2026`), พิจารณาลบหน้า `/style-guide`, (optional) เพิ่มเช็ค admin จริงใน `/api/upload`+`deletePhoto` (ดูหมายเหตุใน Milestone 8)
- [ ] **รวมกับเว็บ WordPress หน้าบ้าน** (ดูหัวข้อ "การรวมกับเว็บ WordPress" ด้านล่าง — เว็บ WP ยังอยู่ Local by Flywheel รอขึ้นโฮสต์จริงก่อน): (1) ปุ่มสมัครบน WP → LIFF URL (2) API `/api/public/talents` + shortcode ใน WP child theme (3) ผูกโดเมนจริง
- [ ] (ตอนรวม WP เสร็จ) ตัดสินใจว่าจะเก็บหรือถอดหน้า 3 tab บน Vercel (`/`)

**ลิงก์/ค่าที่ใช้บ่อย:** Production https://gamdang-app.vercel.app · LIFF `https://liff.line.me/2010689219-wGKbITGb` · LINE Official `@gamdangmodeling` · เว็บ `www.gamdang.com`, `www.gamdangagency.com`

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
