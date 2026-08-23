"use client";

import { useSettings } from "@/lib/contexts/settings-context";

type LevelStyle = { label: string; dot: string };

// クラスは静的文字列で列挙する（Tailwind がソース走査でクラスを検出するため）
const config5: Record<number, LevelStyle> = {
  1: { label: "初級", dot: "bg-level-1" },
  2: { label: "初中級", dot: "bg-level-2" },
  3: { label: "中級", dot: "bg-level-3" },
  4: { label: "中上級", dot: "bg-level-4" },
  5: { label: "上級", dot: "bg-level-5" },
};

const config3: Record<number, LevelStyle> = {
  1: { label: "初級", dot: "bg-level-1" },
  2: { label: "中級", dot: "bg-level-3" },
  3: { label: "上級", dot: "bg-level-5" },
};

function mapTo3(level: number): number {
  if (level <= 2) return 1;
  if (level === 3) return 2;
  return 3;
}

interface LevelBadgeProps {
  level: number;
  showLabel?: boolean;
  /** ドットの下に Lv.n を縦積み表示（リスト行用） */
  stacked?: boolean;
}

/** 難易度表示: 小さな色ドット + 控えめな「Lv.n」表記（難易度は強調しない方針） */
export function LevelBadge({ level, showLabel = false, stacked = false }: LevelBadgeProps) {
  const { level_system, show_level } = useSettings();

  // 設定で難易度表示オフ、または level が数値でないカードは表示しない
  if (!show_level) return null;
  if (!Number.isFinite(level) || level < 1) return null;

  let displayLevel: number;
  let style: LevelStyle;

  if (level_system === "3") {
    displayLevel = mapTo3(level);
    style = config3[displayLevel] ?? config3[2];
  } else {
    displayLevel = level;
    style = config5[level] ?? config5[3];
  }

  if (stacked) {
    return (
      <span className="inline-flex flex-col items-center gap-1">
        <span className={`h-[7px] w-[7px] rounded-full ${style.dot}`} />
        <span className="text-[9px] font-medium leading-none text-text-muted">
          Lv.{displayLevel}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${style.dot}`} />
      <span className="text-[10px] font-medium text-text-muted">
        Lv.{displayLevel}
        {showLabel && ` ${style.label}`}
      </span>
    </span>
  );
}
