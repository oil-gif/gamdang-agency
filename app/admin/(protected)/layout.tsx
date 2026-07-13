import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAdmin } from "@/actions/auth";
import { createAdminAuthClient } from "@/lib/supabase/auth-server";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/talents", label: "Talents" },
];

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

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-brand-navy flex items-center justify-between px-6 py-4 text-white">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Gamdang Admin</span>
          <nav className="flex gap-4 text-sm text-white/80">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white">
                {link.label}
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
