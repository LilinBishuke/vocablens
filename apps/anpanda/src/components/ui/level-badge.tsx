"use client";

import { useSettings, useT } from "@/lib/contexts/settings-context";

type LevelStyle = { labelKey: "level.1" | "level.2" | "level.3" | "level.4" | "level.5"; dot: string };

// クラスは静的文字列で列挙する（Tailwind がソース走査でクラスを検出するため）
const config5: Record<number, LevelStyle> = {
  1: { labelKey: "level.1", dot: "bg-level-1" },
  2: { labelKey: "level.2", dot: "bg-level-2" },
  3: { labelKey: "level.3", dot: "bg-level-3" },
  4: { labelKey: "level.4", dot: "bg-level-4" },
  5: { labelKey: "level.5", dot: "bg-level-5" },
};

const config3: Record<number, LevelStyle> = {
  1: { labelKey: "level.1", dot: "bg-level-1" },
  2: { labelKey: "level.3", dot: "bg-level-3" },
  3: { labelKey: "level.5", dot: "bg-level-5" },
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

// 日本語モードは JLPT 表記（1=N5 ... 5=N1）
const JLPT_LABEL: Record<number, string> = {
  1: "N5",
  2: "N4",
  3: "N3",
  4: "N2",
  5: "N1",
};

/** 難易度表示: 小さな色ドット + 控えめな「Lv.n」表記（難易度は強調しない方針） */
export function LevelBadge({ level, showLabel = false, stacked = false }: LevelBadgeProps) {
  const { level_system, show_level, learning_language } = useSettings();
  const t = useT();
  const isJa = learning_language === "ja";

  // 設定で難易度表示オフ、または level が数値でないカードは表示しない
  if (!show_level) return null;
  if (!Number.isFinite(level) || level < 1) return null;

  let displayLevel: number;
  let style: LevelStyle;

  if (!isJa && level_system === "3") {
    displayLevel = mapTo3(level);
    style = config3[displayLevel] ?? config3[2];
  } else {
    displayLevel = level;
    style = config5[level] ?? config5[3];
  }

  // 日本語モードは常に JLPT の N 表記（3段階設定は英語のみの概念）
  const levelText = isJa ? (JLPT_LABEL[level] ?? "N3") : `Lv.${displayLevel}`;

  if (stacked) {
    return (
      <span className="inline-flex flex-col items-center gap-1">
        <span className={`h-[7px] w-[7px] rounded-full ${style.dot}`} />
        <span className="text-[9px] font-medium leading-none text-text-muted">
          {levelText}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${style.dot}`} />
      <span className="text-[10px] font-medium text-text-muted">
        {levelText}
        {showLabel && !isJa && ` ${t(style.labelKey)}`}
      </span>
    </span>
  );
}
