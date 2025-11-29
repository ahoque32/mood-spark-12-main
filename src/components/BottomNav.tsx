"use client";

import { Home, BarChart3, Settings, Activity } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: BarChart3, label: "Insights", path: "/insights" },
  { icon: Activity, label: "Dashboard", path: "/dashboard" },
  { icon: Settings, label: "Settings", path: "/settings" }
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-50">
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex h-16 items-center justify-between gap-2 rounded-2xl border border-border/80 bg-card/90 px-2 shadow-[var(--shadow-card-hover)] backdrop-blur-xl">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300",
                  isActive
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="hidden sm:inline">{item.label}</span>
                {isActive && (
                  <span className="absolute -top-2 h-1 w-10 rounded-full bg-primary/70" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
