"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/contexts/settings-context";
import { House, Layers, Repeat, Settings } from "lucide-react";

const tabs = [
  { href: "/", icon: House, key: "tab.home" },
  { href: "/cards", icon: Layers, key: "tab.cards" },
  { href: "/review", icon: Repeat, key: "tab.review" },
  { href: "/settings", icon: Settings, key: "tab.settings" },
] as const;

interface TabBarProps {
  reviewCount?: number;
}

export function TabBar({ reviewCount }: TabBarProps) {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav
      role="tablist"
      className="flex items-center justify-around rounded-t-card-lg border-t border-border-glass bg-tabbar-bg shadow-tabbar backdrop-blur-xl pt-3 pb-5 pb-safe shrink-0"
    >
      {tabs.map(({ href, icon: Icon, key }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`flex flex-col items-center gap-1.5 px-4 transition-colors ${
              isActive ? "text-tab-active" : "text-tab-inactive"
            }`}
          >
            <span className="relative flex items-center justify-center">
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              {href === "/review" && reviewCount != null && reviewCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
                  {reviewCount}
                </span>
              )}
            </span>
            <span className={`text-[10px] ${isActive ? "font-semibold" : ""}`}>
              {t(key)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
