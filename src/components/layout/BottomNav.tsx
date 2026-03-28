"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Daily",    icon: Home },
  { href: "/week",      label: "Roster",   icon: CalendarDays },
  { href: "/people",    label: "People",   icon: Users },
  { href: "/settings",  label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 safe-bottom max-w-lg mx-auto">
      <div className="flex items-center px-2 py-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex items-center justify-center py-1"
            >
              <div className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-all duration-200",
                active ? "bg-brand-50" : ""
              )}>
                <Icon
                  className={cn("w-5 h-5 transition-colors", active ? "text-brand-600" : "text-slate-400")}
                  strokeWidth={active ? 2.5 : 1.75}
                />
                <span className={cn(
                  "text-[10px] font-bold tracking-wide transition-colors",
                  active ? "text-brand-600" : "text-slate-400"
                )}>
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
