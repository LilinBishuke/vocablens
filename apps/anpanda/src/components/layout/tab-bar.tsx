"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Layers, Repeat, Settings } from "lucide-react";

const tabs = [
  { href: "/", icon: House, label: "ホーム" },
  { href: "/cards", icon: Layers, label: "カード" },
  { href: "/review", icon: Repeat, label: "復習" },
  { href: "/settings", icon: Settings, label: "設定" },
] as const;

interface TabBarProps {
  reviewCount?: number;
}

export function TabBar({ reviewCount }: TabBarProps) {
  const pathname = usePathname();

  return (
    <nav
      role="tablist"
      className="sticky bottom-0 z-50 flex items-center justify-around rounded-t-card-lg bg-tabbar-bg shadow-tabbar pt-3 pb-6 safe-pb"
    >
      {tabs.map(({ href, icon: Icon, label }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`flex flex-col items-center gap-1.5 transition-colors ${
              isActive ? "text-tab-active" : "text-tab-inactive"
            }`}
          >
            <span
              className={`relative flex items-center justify-center rounded-full px-5 py-1.5 transition-all ${
                isActive ? "bg-primary/15" : ""
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              {href === "/review" && reviewCount != null && reviewCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {reviewCount}
                </span>
              )}
            </span>
            <span className={`text-[10px] ${isActive ? "font-semibold" : ""}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
