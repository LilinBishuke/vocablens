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
      className="flex items-center justify-around rounded-t-card-lg bg-tabbar-bg shadow-tabbar pt-2.5 pb-5 pb-safe"
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
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive
                ? "text-tab-active font-semibold"
                : "text-tab-inactive"
            }`}
          >
            <span className="relative">
              <Icon size={22} />
              {href === "/review" && reviewCount != null && reviewCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {reviewCount}
                </span>
              )}
            </span>
            <span className="text-[10px]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
