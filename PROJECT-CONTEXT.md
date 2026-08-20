# PROJECT-CONTEXT — gamdang-app

> แผนที่โครงสร้างโปรเจกต์ (สแกนจากโค้ดจริง 2026-08-05) — ไว้ให้คน/AI ที่เพิ่งเข้ามา
> เข้าใจระบบเร็วๆ ว่ามีอะไรอยู่ตรงไหน · **ความคืบหน้า/สิ่งที่ทำไปแล้ว อ่านที่ `PROGRESS.md`**
>
> ⚠️ ไฟล์นี้อยู่บน GitHub — **ห้ามใส่ค่า key/secret/ข้อมูลส่วนตัวของ talent เด็ดขาด**
> (ในนี้มีแค่ "ชื่อ" ตัวแปร ไม่มีค่าจริง)

ระบบหลังบ้าน + LIFF ของ **GAMDANG AGENCY** (เอเจนซี่ Model / Influencer)
Production: `app.gamdangagency.com` (Vercel) · เว็บหน้าบ้าน WordPress แยกอีกตัว

---

## 1. Tech stack

อ่านจาก `package.json`

| ด้าน | ใช้อะไร | เวอร์ชัน |
|---|---|---|
| Framework | **Next.js** (App Router, Server Actions, Turbopack) | 16.2.10 |
| React | react / react-dom | 19.2.4 |
| ภาษา | TypeScript | ^5 |
| Database + Storage | **Supabase** — `@supabase/supabase-js` + `@supabase/ssr` | ^2.110.2 / ^0.12.0 |
| Auth (แอดมิน) | **Supabase Auth** (email/password) ผ่าน `@supabase/ssr` cookie client | — |
| Auth (talent) | **LINE Login + LIFF** → เซสชันเอง (JWT ด้วย **jose**) | `@line/liff` ^2.29.1 / jose ^6.2.3 |
| UI | **Tailwind CSS v4** + **shadcn/ui** (Radix) | tailwindcss ^4 / radix-ui ^1.6.2 |
| ไอคอน / toast | lucide-react · sonner | ^1.24.0 / ^2.0.7 |
| รูปภาพ | **sharp** (ฝั่ง server) · browser-image-compression (ฝั่ง client) | ^0.35.3 / ^2.0.2 |
| อื่นๆ | server-only, clsx, tailwind-merge, class-variance-authority, next-themes | — |

**ไม่มี ORM** — เรียก Supabase client ตรงๆ (`supabase.from(...)`) ไม่มี Prisma/Drizzle
**ไม่มี middleware.ts** — การกันสิทธิ์แอดมินทำที่ `app/admin/(protected)/layout.tsx`

Scripts: `npm run dev` · `build` · `start` · `lint`

---

## 2. โครงสร้างโฟลเดอร์ (ลึก 3 ชั้น)

### `app/`
```
app/
├── (liff)/                    # หน้าที่เปิดในแอป LINE (LIFF)
│   └── apply/
│       ├── page.tsx           # จุด login LINE
│       ├── edit/              # wizard สมัคร/แก้โปรไฟล์ 3 ขั้น
│       └── profiles/          # โปรไฟล์ทั้งหมดของบัญชี LINE นี้
├── admin/
│   ├── (protected)/           # ต้องล็อกอินแอดมิน (layout เช็ค auth)
│   │   ├── layout.tsx · page.tsx      # nav + Dashboard
│   │   ├── talents/ · projects/ · shoots/
│   │   ├── photos/ · approvals/
│   │   ├── compcards/         # คิว "รอคอมการ์ด"
│   │   └── duplicates/        # ตรวจข้อมูลซ้ำ + คนยังไม่ผูก LINE
│   └── login/
├── api/                       # route handlers (ดูข้อ 3)
│   ├── booking/{route,dates,profiles}
│   ├── line/{verify,webhook,webhook-notify,webhook-casting}
│   ├── upload · slot-upload · single-photo · compcard-upload
│   ├── casting-upload · casting-apply-photo · inbox-upload
│   ├── project-cover-upload · talent-photos-zip
├── talents/ · casting/[id]/ · booking/    # หน้าสาธารณะ
├── p/[token]/ · job/[token]/ · submit/[token]/   # ลิงก์เฉพาะกิจ (JWT)
├── photo/[...path]/           # image proxy (WebP→JPEG + resize)
├── images/                    # ไฟล์โลโก้ต้นฉบับ (ที่โค้ดใช้จริงอยู่ public/)
├── layout.tsx · page.tsx · globals.css · style-guide/
```

### `components/`
```
components/
├── admin/          # AdminNav, TalentRowCard, TalentProfileHeader,
│                   # CollapsibleSection (กล่องพับหน้าโปรเจกต์),
│                   # DragOrderList (ลากวางจัดลำดับ Talent/Role),
│                   # TalentExtraInfo (ข้อมูลเพิ่มเติมให้ลูกค้า),
│                   # TalentFilterPanel, DangerConfirmButton, ProjectForm,
│                   # LineLinkButton, InboxUploader, BookingSearch ...
├── compcard/       # CompcardStudio, CompcardGenerator (วาดการ์ดบน canvas),
│                   # CompcardSlots, CropperModal, ConfirmStep,
│                   # ModelPhotoStep, LegacyCompcard, AwaitingCompcard,
│                   # SinglePhotoUpload
├── talent/         # TalentForm, TalentPhotos, ProfileCard, PhotoUploader,
│                   # TalentGridCard, AddProfileButton, CastingPhotoUploader
├── booking/        # BookingWizard
├── casting/        # CastingApply
├── public/         # TalentCards (ModelCard/InfluCard/PrintMiniCard), PrintButton
├── ui/             # shadcn: button, card, input, select, dialog, table ...
└── Pagination.tsx · SocialIcon.tsx · BackToHome.tsx · LiffBackButton.tsx
```

### `lib/` และ `actions/` (ตรรกะหลัก)
```
lib/
├── auth/talent-session.ts    # JWT เซสชัน talent + token (job/submit/link)
├── supabase/server.ts        # service-role client (server-only)
├── supabase/auth-server.ts   # cookie client ของแอดมิน + isAdminAuthed()
├── line-messaging.ts · line-verify.ts · admin-notify.ts
├── compcard.ts               # สเปคคอมการ์ด (ขนาด/กรอบ/สี/CTA)
├── booking.ts · casting.ts · public-link.ts · public-talents.ts
├── danger.ts                 # รหัสยืนยันชั้นที่ 2 ก่อนลบถาวร
├── datetime.ts               # ⚠️ ต้องใช้แทน toLocale* (ล็อก Asia/Bangkok)
├── extra-details.ts          # ข้อมูลเพิ่มเติมที่ลูกค้าถาม (ติ๊กโชว์เอง)
├── age.ts · social.ts · tier.ts · storage.ts · site.ts · constants.ts · zip.ts

actions/   (Server Actions — "use server")
talents.ts · projects.ts · shoots.ts · casting-apply.ts · photos.ts ·
photo-inbox.ts · submission.ts · job-notify.ts · job-response.ts ·
client-selection.ts · project-links.ts · public-link.ts · talent-link.ts · auth.ts
```

---

## 3. Route ทั้งหมด

### 🌐 Public (ใครก็เข้าได้)
| Route | ทำอะไร |
|---|---|
| `/` | หน้าแรก 3 แท็บ (Model / Influencer / AI Model) |
| `/talents` | แกลเลอรีทาเลนต์ (เฉพาะ status=active) + ตัวกรอง |
| `/casting` | ประกาศงานที่เปิดรับสมัคร |
| `/casting/[id]` | รายละเอียดงาน + ฟอร์มสมัคร (สมาชิก / กรอกเอง) |
| `/booking` | จองคิวถ่ายโปรไฟล์ |
| `/photo/[...path]` | image proxy — เสิร์ฟรูปเป็น JPEG (`?w=` ย่อ, `?dl=` ดาวน์โหลด) |
| `/style-guide` | หน้า dev-only (ลบได้ ไม่กระทบระบบ) |

### 🔗 ลิงก์เฉพาะกิจ (เข้าได้ด้วย JWT ในลิงก์ ไม่ต้องล็อกอิน)
| Route | ใคร | อายุ token |
|---|---|---|
| `/p/[token]` | **ลูกค้า** — ดู proposal + กด "สนใจ" | ตั้งวันหมดอายุต่อลิงก์ (เก็บใน `project_links`) |
| `/job/[token]` | talent — ดูงานที่ถูกเสนอ + ตอบรับ/ปฏิเสธ | 14 วัน |
| `/submit/[token]` | talent — ส่งรูป/ลิงก์ผลงาน | 60 วัน |

อายุ token อื่นๆ (ตั้งใน `lib/auth/talent-session.ts`): เซสชัน talent **30 วัน** · ลิงก์ผูกบัญชี `?link=` **30 วัน** (แก้จาก 7 วัน เมื่อ 2026-08-09)

### 📱 Talent (LIFF — ต้อง login LINE)
| Route | ทำอะไร |
|---|---|
| `/apply` | จุดเข้า → verify LINE → สร้างเซสชัน |
| `/apply/profiles` | รายการโปรไฟล์ของบัญชีนี้ (1 LINE = หลายลูก) + ขอลบประวัติ |
| `/apply/edit` | wizard 3 ขั้น: ข้อมูล → รูป/คอมการ์ด → ยืนยัน+ยินยอม |

### 🔐 Admin (ต้องล็อกอิน Supabase Auth)
`/admin/login` · `/admin` (Dashboard) · `/admin/talents` `[id]` `new` ·
`/admin/projects` `[id]` `[id]/print` `[id]/report` `new` ·
`/admin/shoots` `[id]` · `/admin/photos` · `/admin/approvals` ·
`/admin/compcards` (คิวรอคอมการ์ด) · `/admin/duplicates` (ตรวจข้อมูลซ้ำ)

### ⚙️ API (route handlers)
| Route | ทำอะไร |
|---|---|
| `POST /api/line/verify` | ตรวจ LINE id/access token → ออกเซสชัน talent |
| `POST /api/line/webhook` | **OA หลัก** — postback ปุ่มรับงาน/ปฏิเสธ (ตรวจ signature) |
| `POST /api/line/webhook-notify` | OA `gamdangprofile` — ตอบ group id |
| `POST /api/line/webhook-casting` | OA `Gamdang Casting` — ตอบ group id |
| `POST /api/booking` | จองคิว (CORS เปิดให้ WP) → RPC `book_shoot_slot` |
| `GET /api/booking/dates` | วันที่เปิดจอง (คืน boolean ไม่บอกจำนวนที่เหลือ) |
| `POST /api/booking/profiles` | โปรไฟล์ของบัญชี LINE (prefill ฟอร์มจอง) |
| `POST /api/upload` | อัพรูป gallery/compcard (แอดมิน + เจ้าของ) |
| `POST /api/slot-upload` | รูป 1 ช่องของคอมการ์ด → `talents.compcard_slots` |
| `POST /api/single-photo` | รูปหลักรูปเดียว (Influencer / รอคอมการ์ด) |
| `POST /api/compcard-upload` | บันทึกคอมการ์ดที่ canvas วาด (แทนใบเดิม) |
| `POST /api/casting-upload` · `/api/casting-apply-photo` | รูปตอนส่งงาน / ตอนสมัคร casting |
| `POST /api/inbox-upload` | batch upload เข้า photo inbox |
| `POST /api/project-cover-upload` | รูปปกประกาศงาน (1200×630) |
| `GET /api/talent-photos-zip` | **แอดมินเท่านั้น** — ดาวน์โหลดรูปทั้งหมดเป็น ZIP |

---

## 4. ตาราง Supabase ที่โค้ดเรียกจริง

| ตาราง | ใช้ทำอะไร | ไฟล์หลักที่เรียก |
|---|---|---|
| **talents** | โปรไฟล์นักแสดง/อินฟลูฯ (แกนกลางของระบบ) | `actions/talents.ts`, `actions/casting-apply.ts`, `actions/projects.ts`, `actions/shoots.ts`, `actions/photos.ts`, `actions/submission.ts`, `actions/photo-inbox.ts`, `api/line/verify`, `api/upload`, `api/slot-upload`, `api/single-photo`, `api/compcard-upload`, `api/talent-photos-zip`, `api/booking/*`, `lib/public-talents.ts` |
| **talent_photos** | รูปทุกชนิด (`kind`: gallery / compcard / casting) | `actions/photos.ts`, `actions/talents.ts`, `actions/projects.ts`, `actions/casting-apply.ts`, `actions/photo-inbox.ts`, `api/upload`, `api/slot-upload`, `api/single-photo`, `api/compcard-upload`, `api/casting-upload`, `api/talent-photos-zip`, `app/(liff)/apply/edit/page.tsx`, `lib/public-talents.ts` |
| **projects** | งาน/โปรเจกต์ + ประกาศ casting | `actions/projects.ts`, `actions/casting-apply.ts`, `lib/casting.ts` |
| **project_talents** | talent ที่อยู่ในงาน (การ์ดเสนอลูกค้า, สถานะตอบรับ, ผลงานที่ส่ง) | `actions/projects.ts`, `actions/job-notify.ts`, `actions/job-response.ts`, `actions/submission.ts`, `actions/client-selection.ts`, `actions/talents.ts`, `api/line/webhook`, `api/casting-upload`, `app/job/[token]`, `app/submit/[token]` |
| **project_roles** | Role ที่เปิดรับในงาน | `actions/projects.ts`, `actions/casting-apply.ts`, `lib/casting.ts` |
| **project_applications** | ใบสมัคร casting (pending/approved/rejected) | `actions/casting-apply.ts`, `actions/projects.ts` |
| **project_links** | ลิงก์ proposal ของลูกค้า (token, T&C, วันหมดอายุ) | `actions/project-links.ts`, `actions/public-link.ts`, `actions/client-selection.ts`, `lib/public-link.ts` |
| **shoot_days** | รอบวันถ่ายโปรไฟล์ + เปิด/ปิดสล็อตรายชั่วโมง | `actions/shoots.ts`, `api/booking`, `lib/booking.ts` |
| **shoot_bookings** | การจองคิวถ่าย + สลิป + เช็คอินหน้างาน | `actions/shoots.ts`, `actions/talents.ts`, `api/booking`, `lib/booking.ts` |
| **photo_inbox** | รูป batch ที่ยังไม่จับคู่กับ talent | `actions/photo-inbox.ts`, `api/inbox-upload` |

**RPC**: `book_shoot_slot` — จองคิวแบบ atomic (advisory lock กันจองชน) → เรียกจาก `api/booking` และ `actions/shoots.ts`
**Storage buckets**: `talent-photos` (สาธารณะผ่าน proxy) · `booking-slips` (**ส่วนตัว** — ดูผ่าน signed URL เท่านั้น)
**Migrations**: `supabase/migrations/` (ล่าสุด `019_talent_rating.sql`) — schema แก้ที่นี่ ไม่มี ORM migrate
**ไฟล์รูปคงที่**: `public/` — `gamdang-logo.png` (โลโก้บนคอมการ์ด), `gamdang-modeling.png`, `gamdang-influencer.png`, `promptpay-gamdang.jpg` (QR จ่ายเงินค่าถ่าย)

---

## 5. ไฟล์ core — แก้ต้องระวังมาก ⚠️

| ไฟล์ | ทำไมห้ามแตะมั่ว |
|---|---|
| `lib/supabase/server.ts` | client ที่ถือ **service-role key** — ถ้าหลุดไปฝั่ง browser = ข้อมูลทั้งระบบเปิดโล่ง (ต้องเป็น server-only เสมอ) |
| `lib/supabase/auth-server.ts` | เซสชันแอดมิน + `isAdminAuthed()` ที่ทุก API ใช้ตัดสินสิทธิ์ |
| `app/admin/(protected)/layout.tsx` | **ประตูเดียว**ที่กันหน้าแอดมินทั้งหมด (ไม่มี middleware) — พังเมื่อไหร่ = หลังบ้านเปิดสาธารณะ |
| `lib/auth/talent-session.ts` | ออก/ตรวจ JWT ของ talent + token ของ `/job` `/submit` `?link=` — แก้ผิด = ลิงก์เก่าใช้ไม่ได้ทั้งหมด หรือคนอื่นเข้าโปรไฟล์ข้ามบัญชีได้ |
| `app/api/line/verify/route.ts` | ทางเข้าเดียวของ talent — เคยพังทั้งระบบมาแล้ว (ดู GOTCHA เรื่อง LIFF scope / `liff.logout()` ใน PROGRESS.md) |
| `app/api/line/webhook*.ts` (3 ไฟล์) | รับ webhook จาก LINE — **ต้องตรวจ `x-line-signature` เสมอ** ห้ามถอดออก |
| `app/api/booking/route.ts` + `supabase/migrations/007_booking.sql` (`book_shoot_slot`) | **เกี่ยวกับเงิน** — จองคิว/รับสลิป · logic กันจองเกิน-จองชนอยู่ใน RPC ห้ามข้ามไป insert ตรงๆ |
| `actions/shoots.ts` | ตรวจสลิป/อนุมัติ/ย้ายรอบ/คืนที่นั่ง + ส่ง LINE ยืนยันลูกค้า |
| `lib/danger.ts` + `components/admin/DangerConfirmButton.tsx` | รหัสยืนยันชั้นที่ 2 ก่อน "ลบถาวร" ทุกจุด — ถอดออก = แอดมินเผลอลบข้อมูลจริงได้ |
| `lib/compcard.ts` | สเปคคอมการ์ด (ขนาด/กรอบ/สี/CTA) — แก้ที่นี่ที่เดียว ทุกใบเปลี่ยนตาม |
| `lib/datetime.ts` | ⚠️ **ต้องใช้แทน `toLocaleString/DateString/TimeString` เสมอ** — Vercel รันเป็น UTC เคยทำเวลาเพี้ยน 7 ชม. |
| `app/photo/[...path]/route.ts` | proxy รูปทั้งเว็บ (WebP→JPEG ให้ LINE webview เปิดได้) — พังคือรูปหายทั้งระบบ |

**GOTCHA สำคัญ** (รายละเอียดเต็มใน `PROGRESS.md`)
- ⚠️ **`sharp` ต้องปักหมุด binary ของ linux เอง** — `package.json` มี
  `optionalDependencies`: `@img/sharp-linux-x64` + `@img/sharp-libvips-linux-x64`
  และ `next.config.ts` มี `serverExternalPackages` + `outputFileTracingIncludes`
  **ห้ามลบทิ้ง** ลบเมื่อไหร่ = รูปพังทั้งเว็บ (เคยเกิดจริง 2026-08-19 นาน 6 ชม.)
- อัพไฟล์ขึ้น Supabase Storage ต้องห่อเป็น **Blob** ไม่ใช่ Node Buffer (บน Vercel ไฟล์จะเสีย)
- ไฟล์ `"use server"` **export ได้เฉพาะ async function** (ค่าคงที่ต้องย้ายไป `lib/`)
- รูปทุก route เก็บที่ **ด้านยาว ≤1600px + WebP q80** — ห้ามเก็บไฟล์ต้นฉบับ

---

## 6. Environment variables (ชื่อเท่านั้น — ไม่มีค่าจริงในไฟล์นี้)

ตั้งที่ **Vercel → Settings → Environment Variables** และ `.env.local` (ซึ่ง gitignore ไว้)

### Supabase
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` — service role, **server-only**

### LINE — เข้าสู่ระบบ / LIFF
- `LINE_CHANNEL_ID` — ใช้ verify id/access token
- `LINE_SESSION_SECRET` — เซ็น JWT เซสชัน talent
- `NEXT_PUBLIC_LIFF_ID` — LIFF สมัคร/โปรไฟล์ (endpoint `/apply`)
- `NEXT_PUBLIC_BOOKING_LIFF_ID` — LIFF จองถ่าย (endpoint `/booking`)

### LINE — OA หลัก (คุยกับ talent)
- `LINE_MESSAGING_ACCESS_TOKEN`
- `LINE_MESSAGING_CHANNEL_SECRET`

### LINE — OA แจ้งเตือนแอดมิน (`gamdangprofile`, โควตาแยก)
- `NOTIFY_LINE_ACCESS_TOKEN`
- `NOTIFY_LINE_CHANNEL_SECRET`
- `ADMIN_LINE_NOTIFY_ID` — group id ที่รับแจ้งเตือน
- `ADMIN_LINE_USER_ID` — fallback ถ้าไม่ได้ตั้ง group

### LINE — OA งาน Casting (`Gamdang Casting`, โควตาแยก)
- `CASTING_LINE_ACCESS_TOKEN`
- `CASTING_LINE_CHANNEL_SECRET`
- `CASTING_LINE_GROUP_ID`

### เว็บ / ความปลอดภัย
- `NEXT_PUBLIC_SITE_URL` — โดเมนแอป (ลิงก์แชร์/OG/token ทั้งหมดอิงตัวนี้)
- `NEXT_PUBLIC_MAIN_SITE_URL` — เว็บหลัก WordPress (ปุ่ม "กลับหน้าหลัก")
- `ADMIN_DANGER_CODE` — รหัสยืนยันก่อน "ลบถาวร"
- `NODE_ENV` — ตั้งโดย Next.js เอง

> ⚠️ `NEXT_PUBLIC_*` ถูกฝังลงไฟล์ที่ browser โหลดได้ → **ห้ามใส่ความลับใน prefix นี้**
> และค่าเหล่านี้ถูก bake ตอน build → แก้แล้วต้อง **redeploy**
