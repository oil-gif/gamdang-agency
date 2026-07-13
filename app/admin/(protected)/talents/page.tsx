import Link from "next/link";
import { getTalents } from "@/actions/talents";
import { deleteTalent } from "@/actions/talents";
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
import { STATUS_LABEL_TH, TIER_LABEL } from "@/lib/constants";

export default async function TalentsListPage() {
  const talents = await getTalents();

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

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>ชื่อเล่น</TableHead>
              <TableHead>บทบาท</TableHead>
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
                <TableCell colSpan={6} className="text-center text-neutral-400">
                  ยังไม่มี talent — กด &ldquo;เพิ่ม Talent&rdquo; ด้านบน
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
