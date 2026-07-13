"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string; badge: number };

export function AdminNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition ${
              active
                ? "bg-white/15 font-semibold text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {link.label}
            {link.badge > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#B82233] px-1.5 text-xs font-semibold text-white">
                {link.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
