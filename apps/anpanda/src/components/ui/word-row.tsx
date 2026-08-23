"use client";

import Link from "next/link";
import { LevelBadge } from "./level-badge";

interface WordRowProps {
  word: string;
  translation?: string | null;
  level?: string | number | null;
  rightLabel?: string | null;
  rightHighlight?: boolean;
}

/**
 * 単語リスト行（Figma Green案の統一カード）
 * 左: 難易度ドット+Lv / 中: 単語+訳の縦積み / 右: 次回復習など
 */
export function WordRow({
  word,
  translation,
  level,
  rightLabel,
  rightHighlight = false,
}: WordRowProps) {
  const levelNum = level == null ? NaN : Number(level);
  return (
    <Link
      href={`/cards/${encodeURIComponent(word)}`}
      className="glass-card flex min-h-[67px] items-center gap-3 rounded-card py-[15px] pl-[18px] pr-4 transition-all duration-150 active:scale-[0.98] hover:border-primary/25"
    >
      {Number.isFinite(levelNum) && (
        <span className="flex w-7 shrink-0 flex-col items-center">
          <LevelBadge level={levelNum} stacked />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-semibold text-text-primary">
          {word}
        </span>
        {translation && (
          <span className="truncate text-xs text-text-secondary">
            {translation}
          </span>
        )}
      </span>
      {rightLabel && (
        <span
          className={`shrink-0 text-[10px] font-medium ${
            rightHighlight ? "text-primary" : "text-text-muted"
          }`}
        >
          {rightLabel}
        </span>
      )}
    </Link>
  );
}
