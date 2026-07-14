"use client";

import { useState } from "react";
import { saveTalent, saveTalentSelf } from "@/actions/talents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, ETHNICITIES } from "@/lib/constants";

type Talent = {
  id?: string;
  nickname_th?: string | null;
  nickname_en?: string | null;
  full_name?: string | null;
  gender?: string | null;
  dob?: string | null;
  ethnicities?: string[] | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  measurements?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_line_or_whatsapp?: string | null;
  note?: string | null;
  is_model?: boolean;
  is_influencer?: boolean;
  is_ai_model?: boolean;
  character?: string | null;
  portfolio_links?: string[] | null;
  intro_video_url?: string | null;
  status?: string;
  ig_handle?: string | null;
  ig_followers?: number;
  tiktok_handle?: string | null;
  tiktok_followers?: number;
  youtube_handle?: string | null;
  youtube_followers?: number;
  facebook_handle?: string | null;
  facebook_followers?: number;
  lemon8_handle?: string | null;
  lemon8_followers?: number;
  categories?: string[];
};

export function TalentForm({
  talent,
  error,
  mode = "admin",
}: {
  talent?: Talent;
  error?: string;
  mode?: "admin" | "self";
}) {
  const [isInfluencer, setIsInfluencer] = useState(talent?.is_influencer ?? false);
  const [isAiModel, setIsAiModel] = useState(talent?.is_ai_model ?? false);
  const action = mode === "self" ? saveTalentSelf : saveTalent;

  return (
    <form action={action} className="max-w-3xl space-y-6">
      {mode === "admin" && talent?.id && (
        <input type="hidden" name="id" value={talent.id} />
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1D4ED8]">
            ข้อมูลส่วนตัว <span className="font-normal text-[#1D4ED8]/60">(Personal Info)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nickname_th">ชื่อเล่น (ไทย) *</Label>
            <Input
              id="nickname_th"
              name="nickname_th"
              defaultValue={talent?.nickname_th ?? ""}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nickname_en">ชื่อเล่น (English)</Label>
            <Input
              id="nickname_en"
              name="nickname_en"
              defaultValue={talent?.nickname_en ?? ""}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="full_name">ชื่อ-นามสกุลจริง (Full Name)</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={talent?.full_name ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">เพศ (Gender) *</Label>
            <Select name="gender" defaultValue={talent?.gender ?? undefined} required>
              <SelectTrigger id="gender" className="w-full">
                <SelectValue placeholder="เลือกเพศ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">หญิง</SelectItem>
                <SelectItem value="male">ชาย</SelectItem>
                <SelectItem value="other">อื่นๆ / LGBTQ+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">วันเกิด (Date of Birth) *</Label>
            <Input
              id="dob"
              name="dob"
              type="date"
              defaultValue={talent?.dob ?? ""}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height_cm">ส่วนสูง (Height, ซม.)</Label>
            <Input
              id="height_cm"
              name="height_cm"
              type="number"
              defaultValue={talent?.height_cm ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weight_kg">น้ำหนัก (Weight, กก.)</Label>
            <Input
              id="weight_kg"
              name="weight_kg"
              type="number"
              defaultValue={talent?.weight_kg ?? ""}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="measurements">
              รอบอก/เอว/สะโพก, ไซส์รองเท้า (Measurements — พิมพ์อิสระ)
            </Label>
            <Input
              id="measurements"
              name="measurements"
              defaultValue={talent?.measurements ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1D4ED8]">
            เชื้อชาติ <span className="font-normal text-[#1D4ED8]/60">(Ethnicity)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ETHNICITIES.map((e) => (
            <label key={e.value} className="flex items-start gap-2 text-sm">
              <Checkbox
                name="ethnicities"
                value={e.value}
                defaultChecked={talent?.ethnicities?.includes(e.value) ?? false}
                className="mt-0.5"
              />
              <span>
                {e.label}
                {"hint" in e && e.hint && (
                  <span className="block text-xs text-neutral-400">{e.hint}</span>
                )}
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1D4ED8]">
            ติดต่อ <span className="font-normal text-[#1D4ED8]/60">(Contact)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="phone">เบอร์โทร (Phone) *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={talent?.phone ?? ""}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={talent?.email ?? ""}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="contact_line_or_whatsapp">LINE ID / WhatsApp</Label>
            <Input
              id="contact_line_or_whatsapp"
              name="contact_line_or_whatsapp"
              defaultValue={talent?.contact_line_or_whatsapp ?? ""}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="note">โน้ต (ภายใน)</Label>
            <Textarea id="note" name="note" defaultValue={talent?.note ?? ""} />
          </div>
        </CardContent>
      </Card>

      {mode === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1D4ED8]">
              ผลงาน &amp; คลิปแนะนำตัว{" "}
              <span className="font-normal text-[#1D4ED8]/60">(Portfolio)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="portfolio_links">
                ลิงก์ผลงาน (บรรทัดละ 1 ลิงก์ สูงสุด 5 — talent ส่งเองผ่านฟอร์ม casting ได้ด้วย)
              </Label>
              <Textarea
                id="portfolio_links"
                name="portfolio_links"
                rows={4}
                placeholder={"https://...\nhttps://..."}
                defaultValue={(talent?.portfolio_links ?? []).join("\n")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intro_video_url">
                ลิงก์คลิปแนะนำตัว (TikTok / YouTube / Drive)
              </Label>
              <Input
                id="intro_video_url"
                name="intro_video_url"
                placeholder="https://..."
                defaultValue={talent?.intro_video_url ?? ""}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1D4ED8]">
            บทบาท{mode === "admin" && " & สถานะ"}{" "}
            <span className="font-normal text-[#1D4ED8]/60">
              ({mode === "admin" ? "Role & Status" : "Role"})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="is_model" defaultChecked={talent?.is_model ?? false} />
              เป็น Model
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                name="is_influencer"
                checked={isInfluencer}
                onCheckedChange={(v) => setIsInfluencer(v === true)}
              />
              เป็น Influencer
            </label>
            {mode === "admin" && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  name="is_ai_model"
                  checked={isAiModel}
                  onCheckedChange={(v) => setIsAiModel(v === true)}
                />
                เป็น AI Model
              </label>
            )}
          </div>
          {mode === "admin" && isAiModel && (
            <div className="space-y-1.5">
              <Label htmlFor="character">
                Character (คั่นด้วย / เช่น Energetic / Fun)
              </Label>
              <Input
                id="character"
                name="character"
                placeholder="Energetic / Fun"
                defaultValue={talent?.character ?? ""}
              />
            </div>
          )}
          {mode === "admin" && (
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="status">สถานะ</Label>
              <Select name="status" defaultValue={talent?.status ?? "pending"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">รออนุมัติ</SelectItem>
                  <SelectItem value="active">อนุมัติแล้ว</SelectItem>
                  <SelectItem value="rejected">ปฏิเสธ</SelectItem>
                  <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {isInfluencer && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1D4ED8]">
                ความเชี่ยวชาญ <span className="font-normal text-[#1D4ED8]/60">(Expertise)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {CATEGORIES.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    name="categories"
                    value={c}
                    defaultChecked={talent?.categories?.includes(c) ?? false}
                  />
                  {c}
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#1D4ED8]">
                โซเชียล & ผู้ติดตาม{" "}
                <span className="font-normal text-[#1D4ED8]/60">(Social & Followers)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-neutral-400">
                สมัครเป็น Influencer ต้องกรอกลิงก์และจำนวนผู้ติดตามอย่างน้อย 1 ช่องทาง
                และมีผู้ติดตามขั้นต่ำ 3,000 คน
                <span className="mt-0.5 block">
                  (To apply as an Influencer, add at least 1 social channel with a
                  minimum of 3,000 followers.)
                </span>
              </p>
              {(
                [
                  ["ig", "Instagram"],
                  ["tiktok", "TikTok"],
                  ["youtube", "YouTube"],
                  ["facebook", "Facebook"],
                  ["lemon8", "Lemon8"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`${key}_handle`}>{label} URL/handle</Label>
                    <Input
                      id={`${key}_handle`}
                      name={`${key}_handle`}
                      defaultValue={
                        (talent?.[`${key}_handle` as keyof Talent] as string) ?? ""
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${key}_followers`}>Followers</Label>
                    <Input
                      id={`${key}_followers`}
                      name={`${key}_followers`}
                      type="number"
                      defaultValue={
                        (talent?.[`${key}_followers` as keyof Talent] as number) ?? 0
                      }
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {mode === "self" ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto max-w-3xl">
            <Button
              type="submit"
              className="h-12 w-full bg-gradient-to-r from-[#1D4ED8] to-[#B82233] text-base font-semibold text-white shadow-sm hover:opacity-95"
            >
              บันทึกข้อมูล
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button type="submit">บันทึก</Button>
        </div>
      )}
    </form>
  );
}
