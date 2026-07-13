import Link from "next/link";
import { deleteTalent, getTalents, type TalentFilters } from "@/actions/talents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TalentFilterPanel } from "@/components/admin/TalentFilterPanel";
import { STATUS_LABEL_TH, TIER_LABEL } from "@/lib/constants";
import { calculateAge } from "@/lib/age";

type RawParams = Record<string, string | undefined>;

function parseFilters(params: RawParams): TalentFilters {
  const num = (key: string) => {
    const v = params[key];
    const n = v ? Number(v) : undefined;
    return n && Number.isFinite(n) ? n : undefined;
  };
  const pick = (key: string) => {
    const v = params[key];
    return v && v !== "any" ? v : undefined;
  };

  return {
    q: params.q || undefined,
    role: pick("role") as TalentFilters["role"],
    gender: pick("gender"),
    status: pick("status"),
    tier: pick("tier"),
    category: pick("category"),
    ethnicity: pick("ethnicity"),
    minHeight: num("min_height"),
    maxHeight: num("max_height"),
    minAge: num("min_age"),
    maxAge: num("max_age"),
  };
}

export default async function TalentsListPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const talents = await getTalents(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">
          Talents ({talents.length})
        </h1>
        <Button asChild>
          <Link href="/admin/talents/new">+ เพิ่ม Talent</Link>
        </Button>
      </div>

      <TalentFilterPanel searchParams={params} />

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>ชื่อเล่น</TableHead>
              <TableHead>บทบาท</TableHead>
              <TableHead>อายุ</TableHead>
              <TableHead>ส่วนสูง</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {talents.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.code}</TableCell>
                <TableCell>{t.nickname_th}</TableCell>
                <TableCell className="space-x-1">
                  {t.is_model && <Badge variant="secondary">Model</Badge>}
                  {t.is_influencer && <Badge variant="secondary">Influencer</Badge>}
                </TableCell>
                <TableCell>{t.dob ? `${calculateAge(t.dob)} ปี` : "-"}</TableCell>
                <TableCell>{t.height_cm ? `${t.height_cm} ซม.` : "-"}</TableCell>
                <TableCell>{TIER_LABEL[t.tier] ?? t.tier}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      t.status === "active"
                        ? "default"
                        : t.status === "rejected"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {STATUS_LABEL_TH[t.status] ?? t.status}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/talents/${t.id}`}>แก้ไข</Link>
                  </Button>
                  <form action={deleteTalent}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      ลบ
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
            {talents.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-neutral-400">
                  ไม่พบ talent ที่ตรงกับตัวกรอง
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
