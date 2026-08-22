"use client";

import { useSettings } from "@/lib/contexts/settings-context";

type LevelStyle = { label: string; bgLight: string; color: string };

const config5: Record<number, LevelStyle> = {
  1: { label: "初級",  color: "text-level-1", bgLight: "bg-level-1/10" },
  2: { label: "初中級", color: "text-level-2", bgLight: "bg-level-2/10" },
  3: { label: "中級",  color: "text-level-3", bgLight: "bg-level-3/10" },
  4: { label: "中上級", color: "text-level-4", bgLight: "bg-level-4/10" },
  5: { label: "上級",  color: "text-level-5", bgLight: "bg-level-5/10" },
};

const config3: Record<number, LevelStyle> = {
  1: { label: "初級", color: "text-level-1", bgLight: "bg-level-1/10" },
  2: { label: "中級", color: "text-level-3", bgLight: "bg-level-3/10" },
  3: { label: "上級", color: "text-level-5", bgLight: "bg-level-5/10" },
};

// Static dark mode bg classes so Tailwind includes them in the bundle
const darkBg5: Record<number, string> = {
  1: "dark:bg-level-bg-1",
  2: "dark:bg-level-bg-2",
  3: "dark:bg-level-bg-3",
  4: "dark:bg-level-bg-4",
  5: "dark:bg-level-bg-5",
};

const darkBg3: Record<number, string> = {
  1: "dark:bg-level-bg-1",
  2: "dark:bg-level-bg-3",
  3: "dark:bg-level-bg-5",
};

function mapTo3(level: number): number {
  if (level <= 2) return 1;
  if (level === 3) return 2;
  return 3;
}

interface LevelBadgeProps {
  level: number;
  showLabel?: boolean;
}

export function LevelBadge({ level, showLabel = false }: LevelBadgeProps) {
  const { level_system } = useSettings();

  let displayLevel: number;
  let style: LevelStyle;
  let darkBgClass: string;

  if (level_system === "3") {
    displayLevel = mapTo3(level);
    style = config3[displayLevel] ?? config3[2];
    darkBgClass = darkBg3[displayLevel] ?? darkBg3[2];
  } else {
    displayLevel = level;
    style = config5[level] ?? config5[3];
    darkBgClass = darkBg5[level] ?? darkBg5[3];
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-semibold ${darkBgClass} ${style.bgLight} ${style.color}`}
    >
      Lv.{displayLevel}
      {showLabel && <span>{style.label}</span>}
    </span>
  );
}
