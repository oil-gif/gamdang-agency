import { redirect } from "next/navigation";
import { signOutAdmin } from "@/actions/auth";
import { getPendingCount } from "@/actions/talents";
import { createAdminAuthClient } from "@/lib/supabase/auth-server";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createAdminAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const pendingCount = await getPendingCount();
  const navLinks = [
    { href: "/admin", label: "Dashboard", badge: 0 },
    { href: "/admin/talents", label: "Talents", badge: 0 },
    { href: "/admin/projects", label: "Projects", badge: 0 },
    { href: "/admin/photos", label: "รูปภาพ", badge: 0 },
    { href: "/admin/approvals", label: "รออนุมัติ", badge: pendingCount },
  ];

  return (
    <div className="min-h-screen bg-neutral-100/70">
      <header className="bg-brand-navy border-b-2 border-[#B82233] print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3.5 text-white">
          <div className="flex flex-wrap items-center gap-5">
            <span className="text-sm font-extrabold tracking-widest">
              GAMDANG{" "}
              <span className="rounded bg-[#B82233] px-1.5 py-0.5 text-[10px] font-bold">
                ADMIN
              </span>
            </span>
            <AdminNav links={navLinks} />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/60 sm:inline">
              {user.email}
            </span>
            <form action={signOutAdmin}>
              <Button type="submit" variant="secondary" size="sm">
                ออกจากระบบ
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
