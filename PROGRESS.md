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

**ค้างอยู่:**
1. **ยังไม่เคยทดสอบ end-to-end จริงผ่านแอป LINE** — ต้องเอา LIFF URL (`https://liff.line.me/2010689219-wGKbITGb`) เปิดจากในแอป LINE จริง (เปิดจาก browser ธรรมดาจะค้างที่หน้า loading เพราะ LIFF SDK ต้องรันในแอป LINE เท่านั้น)
2. เช็คว่า record เก่าที่ admin สร้างไว้ (ไม่มี `line_user_id`) ผูกกับ LINE account ยังไง ถ้า talent คนเดิมสมัครผ่าน LINE ซ้ำ จะกลายเป็นสร้าง record ใหม่ (เพราะ upsert match ด้วย `line_user_id` ที่ยังไม่มี ไม่ใช่ผูกกับ record admin สร้างไว้) — ยังไม่ได้คุยกับพี่ว่าต้องมี flow เชื่อม record เก่ากับ LINE login ไหม
3. หมายเหตุความปลอดภัยที่ค้างจากก่อนหน้านี้ (ไม่ใช่ของใหม่): `/api/upload` และ `deletePhoto` ยังไม่เช็คว่าเป็น admin จริงๆ (อาศัยแค่ middleware กัน `/admin/:path*`) — ตอนนี้เพิ่มเช็คฝั่ง talent session แล้ว แต่ฝั่ง admin ยังเปิดกว้างอยู่เหมือนเดิม ถ้าจะ harden เพิ่มค่อยทำทีหลังได้

## Milestone ที่เหลือ (ยังไม่เริ่ม)
9. Admin approval queue (approve/reject คนที่สมัครผ่าน LINE ให้ `status: pending → active`)
10. Project system (สร้าง/แก้/ลบ project, เพิ่ม-ลบ-เรียงลำดับ talent, เลือก compcard/influcard)
11. Public project link `/p/[token]` — **ใช้ T&C gate ไม่ใช้รหัสผ่าน** (ยืนยันกับพี่แล้ว, เก็บ IP+timestamp)
12. Polish + deploy รอบสุดท้าย (ตอนนี้ deploy พื้นฐานเสร็จแล้วจาก milestone 8)

## ตัวช่วยที่ตั้งไว้แล้ว ไม่ต้องตั้งใหม่
- `gh` CLI login เป็น account `oil-gif` แล้ว
- `vercel` CLI login เป็น account `oil-9318` แล้ว, project linked (`gamdang/gamdang-app`)
- `psql` ติดตั้งแล้วที่ `/opt/homebrew/opt/libpq/bin/psql` (เชื่อม Supabase Postgres ตรงได้ถ้าต้องรัน SQL migration เพิ่ม)
