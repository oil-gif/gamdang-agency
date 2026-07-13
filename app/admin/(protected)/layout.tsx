import { redirect } from "next/navigation";
import { signOutAdmin } from "@/actions/auth";
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

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-brand-navy flex items-center justify-between px-6 py-4 text-white">
        <span className="font-semibold">Gamdang Admin</span>
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
