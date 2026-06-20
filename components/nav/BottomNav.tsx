"use client";

import { cn } from "@/lib/cn";
import { Compass, Heart, Home, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Tonight", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/watchlist", label: "Watchlist", icon: Heart },
  { href: "/us", label: "Us", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4 pb-4">
      <div className="glass-strong flex items-center justify-around rounded-3xl px-2 py-2 shadow-card">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-medium transition",
                active ? "text-white" : "text-white/45 hover:text-white/70"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition",
                  active && "bg-accent-gradient shadow-glow"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
