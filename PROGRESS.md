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

## กำลังทำอยู่ — Milestone 8: LIFF apply/edit flow (ยังไม่เสร็จ)

**ทำไปแล้ว:**
- Deploy ขึ้น Vercel สำเร็จ (`https://gamdang-app.vercel.app`) เพื่อให้มี HTTPS URL จริงไว้ผูกกับ LIFF (LIFF เปิดจาก localhost ไม่ได้)
- อ่าน `actions/talents.ts` เตรียม refactor แต่ **ยังไม่ได้แก้ไฟล์จริง**

**ค้างอยู่ (ต้องทำต่อ):**
1. รอพี่ไปที่ **LINE Developers Console** (https://developers.line.biz/console/) → หา Provider/Channel เดิมของระบบเก่า (มี Channel ID/Secret อยู่แล้ว) → เพิ่ม **LIFF app ใหม่** ใต้ channel เดิม:
   - Endpoint URL: `https://gamdang-app.vercel.app/apply`
   - Scope: `profile`, `openid`
   - Size: Full
   - ได้ **LIFF ID** (รูปแบบ `1234567890-AbCdEfGh`) กับ **Channel ID** มาให้ผม
2. เขียนโค้ด (ยังไม่ได้ทำ):
   - `lib/auth/talent-session.ts` — sign/verify JWT cookie ด้วย `jose` (ต้อง `npm install jose`, ต้องตั้ง `LINE_SESSION_SECRET` ใน `.env.local` + Vercel)
   - `app/api/line/verify/route.ts` — รับ LINE ID token, verify ผ่าน `POST https://api.line.me/oauth2/v2.1/verify`, upsert แถวใน `talents` (`source='self', status='pending'`), set session cookie
   - `app/(liff)/apply/page.tsx` — client component, init `@line/liff` (ต้อง `npm install @line/liff`), login, ส่ง ID token ไป verify, แล้ว redirect ไป `/apply/edit`
   - `app/(liff)/apply/edit/page.tsx` — server component อ่าน session cookie, render `TalentForm` โหมด self (ซ่อนช่อง "สถานะ" ที่มีแต่ admin ควรเห็น)
   - ปรับ `components/admin/TalentForm.tsx` ให้รับ prop `mode: "admin" | "self"` แล้วอาจย้ายไปไว้ที่ `components/talent/TalentForm.tsx` เพราะใช้ร่วมกันทั้ง admin และ talent แล้ว (ตาม pattern shared component ที่วางแผนไว้)
   - เพิ่ม `saveTalentSelf(formData)` ใน `actions/talents.ts` — อ่าน talentId จาก session cookie เอง (ห้ามรับ id จาก formData เพื่อกันคนหนึ่งแก้ข้อมูลอีกคน), ไม่ให้แก้ `status`/`source`

## Milestone ที่เหลือ (ยังไม่เริ่ม)
9. Admin approval queue (approve/reject คนที่สมัครผ่าน LINE ให้ `status: pending → active`)
10. Project system (สร้าง/แก้/ลบ project, เพิ่ม-ลบ-เรียงลำดับ talent, เลือก compcard/influcard)
11. Public project link `/p/[token]` — **ใช้ T&C gate ไม่ใช้รหัสผ่าน** (ยืนยันกับพี่แล้ว, เก็บ IP+timestamp)
12. Polish + deploy รอบสุดท้าย (ตอนนี้ deploy พื้นฐานเสร็จแล้วจาก milestone 8)

## ตัวช่วยที่ตั้งไว้แล้ว ไม่ต้องตั้งใหม่
- `gh` CLI login เป็น account `oil-gif` แล้ว
- `vercel` CLI login เป็น account `oil-9318` แล้ว, project linked (`gamdang/gamdang-app`)
- `psql` ติดตั้งแล้วที่ `/opt/homebrew/opt/libpq/bin/psql` (เชื่อม Supabase Postgres ตรงได้ถ้าต้องรัน SQL migration เพิ่ม)
