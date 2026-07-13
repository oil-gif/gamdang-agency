import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAdmin } from "@/actions/auth";
import { getPendingCount } from "@/actions/talents";
import { createAdminAuthClient } from "@/lib/supabase/auth-server";
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
    { href: "/admin/approvals", label: "รออนุมัติ", badge: pendingCount },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-brand-navy flex items-center justify-between px-6 py-4 text-white">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Gamdang Admin</span>
          <nav className="flex gap-4 text-sm text-white/80">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 hover:text-white"
              >
                {link.label}
                {link.badge > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#B82233] px-1.5 text-xs font-semibold text-white">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/70">{user.email}</span>
          <form action={signOutAdmin}>
            <Button type="submit" variant="secondary" size="sm">
              ออกจากระบบ
            </Button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
