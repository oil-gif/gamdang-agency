# Gamdang App — Progress / Handoff

> อ่านไฟล์นี้ก่อนเริ่ม session ใหม่ — สรุปว่าทำอะไรไปแล้ว ทำอะไรค้างอยู่ และต้องทำอะไรต่อ
> Full architecture plan: `.claude/plans/snuggly-drifting-fiddle.md` (ในเครื่อง ไม่ได้ commit ขึ้น git)

## Stack & โครงสร้าง
- Next.js 16 (App Router, TypeScript, Tailwind v4, Turbopack) + Supabase (Postgres + Storage) + shadcn/ui
- โฟลเดอร์โปรเจกต์: `~/Documents/gamdang-app`
- GitHub: `github.com/oil-gif/gamdang-agency` (เชื่อม Vercel อัตโนมัติแล้ว — push ขึ้น `main` = deploy prod ทันที)
- Production URL: **https://gamdang-app.vercel.app**
- Supabase project: `xwhubbybwfrdepipszoy` (region Singapore), เก็บ credentials ใน `.env.local` (gitignored) และตั้งไว้ใน Vercel env vars แล้ว (production + preview)
- Admin login: `admin@gamdangagency.com` / `gamdang2026` (ควรเปลี่ยนก่อนขึ้นระบบจริง)

## สถาปัตยกรรมหลัก (สรุปจาก plan file)
- **Auth 2 ระบบแยกกัน**: Admin ใช้ Supabase Auth (email/password จริง) ผ่าน `lib/supabase/auth-server.ts` + `proxy.ts` (Next 16 เปลี่ยนชื่อจาก middleware.ts). Talent (model/influ) ใช้ LINE LIFF ID token verify เอง ไม่ผ่าน Supabase Auth เลย — เก็บ session เป็น JWT cookie ของเราเอง (ยังไม่ได้เขียนไฟล์นี้ — ดูหัวข้อ "ค้างอยู่" ด้านล่าง)
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

## ค้างอยู่ (เฟสถัดไป): หน้าบ้านสาธารณะ 3 Tab + AI Model
สเปคจากพี่เจ้าของ (ยังไม่เริ่ม):
- หน้าแรก `/` (ตอนนี้ยังเป็น template Next.js เปล่า) ทำเป็นการ์ดโชว์ talent: ดึงรูปเดี่ยว + ชื่อ + อายุ
- แบ่ง 3 Tab: **Model (สีน้ำเงิน #1D4ED8) / Influencer (สีแดง #B82233) / AI Model (gradient)** — ถ้า talent เป็นทั้ง model+influ ขึ้นทั้ง 2 tab
- **AI Model = ประเภทใหม่** ต้องเพิ่ม schema `is_ai_model boolean` + `character text` (เช่น "Energetic / Fun") ในตาราง talents + ช่องกรอกใน TalentForm (เฉพาะ admin) — AI model ไม่มี LINE/followers เป็นตัวละครที่ admin สร้าง
- ออกแบบให้สวย ดู pro

## Polish รอบสุดท้าย (ยังไม่เริ่ม)
- เปลี่ยนรหัส admin, ลบหน้า /style-guide ถ้าไม่ใช้, ฯลฯ

## ตัวช่วยที่ตั้งไว้แล้ว ไม่ต้องตั้งใหม่
- `gh` CLI login เป็น account `oil-gif` แล้ว
- `vercel` CLI login เป็น account `oil-9318` แล้ว, project linked (`gamdang/gamdang-app`)
- `psql` ติดตั้งแล้วที่ `/opt/homebrew/opt/libpq/bin/psql` (เชื่อม Supabase Postgres ตรงได้ถ้าต้องรัน SQL migration เพิ่ม)
