"use client";

import { useState } from "react";
import { saveTalent } from "@/actions/talents";
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
import { CATEGORIES } from "@/lib/constants";

type Talent = {
  id?: string;
  nickname_th?: string | null;
  nickname_en?: string | null;
  full_name?: string | null;
  gender?: string | null;
  dob?: string | null;
  ethnicity?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  measurements?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_line_or_whatsapp?: string | null;
  note?: string | null;
  is_model?: boolean;
  is_influencer?: boolean;
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

export function TalentForm({ talent }: { talent?: Talent }) {
  const [isInfluencer, setIsInfluencer] = useState(talent?.is_influencer ?? false);

  return (
    <form action={saveTalent} className="max-w-3xl space-y-6">
      {talent?.id && <input type="hidden" name="id" value={talent.id} />}

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลส่วนตัว</CardTitle>
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
            <Label htmlFor="full_name">ชื่อ-นามสกุลจริง</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={talent?.full_name ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">เพศ</Label>
            <Select name="gender" defaultValue={talent?.gender ?? undefined}>
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
            <Label htmlFor="dob">วันเกิด</Label>
            <Input
              id="dob"
              name="dob"
              type="date"
              defaultValue={talent?.dob ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ethnicity">เชื้อชาติ</Label>
            <Input
              id="ethnicity"
              name="ethnicity"
              defaultValue={talent?.ethnicity ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height_cm">ส่วนสูง (ซม.)</Label>
            <Input
              id="height_cm"
              name="height_cm"
              type="number"
              defaultValue={talent?.height_cm ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weight_kg">น้ำหนัก (กก.)</Label>
            <Input
              id="weight_kg"
              name="weight_kg"
              type="number"
              defaultValue={talent?.weight_kg ?? ""}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="measurements">
              รอบอก/เอว/สะโพก, ไซส์รองเท้า (พิมพ์อิสระ)
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
          <CardTitle>ติดต่อ</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="phone">เบอร์โทร</Label>
            <Input id="phone" name="phone" defaultValue={talent?.phone ?? ""} />
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

      <Card>
        <CardHeader>
          <CardTitle>บทบาท & สถานะ</CardTitle>
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
          </div>
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
        </CardContent>
      </Card>

      {isInfluencer && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Expertise</CardTitle>
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
              <CardTitle>Social & Followers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

      <div className="flex gap-3">
        <Button type="submit">บันทึก</Button>
      </div>
    </form>
  );
}
