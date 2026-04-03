"use client";

import Link from "next/link";
import { Play, Sparkles } from "lucide-react";
import { LevelBadge } from "@/components/ui";
import type { UserStats } from "@/lib/types";

interface RecentWord {
  id: string;
  word: string;
  translation: string | null;
  level: string | null;
  created_at: string;
}

interface ActivePuzzle {
  name: string;
  piecesRevealed: number;
  totalPieces: number;
}

interface HomeContentProps {
  stats: UserStats;
  recentWords: RecentWord[];
  activePuzzle: ActivePuzzle | null;
}

export function HomeContent({
  stats,
  recentWords,
  activePuzzle,
}: HomeContentProps) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-page py-5">
      {/* Puzzle Preview */}
      {activePuzzle && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">
              パズル
            </h2>
            <Link
              href="/puzzle"
              className="text-[13px] text-primary"
            >
              詳細 →
            </Link>
          </div>
          <Link
            href="/puzzle"
            className="flex items-center gap-3 rounded-card border border-surface-border bg-surface p-3.5"
          >
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-text-primary">
                {activePuzzle.name}
              </span>
            </div>
            <span className="text-xs font-semibold text-primary">
              {activePuzzle.piecesRevealed} / {activePuzzle.totalPieces}
            </span>
          </Link>
        </div>
      )}

      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-card-lg bg-gradient-to-br from-primary to-primary-dark p-0">
        {/* Decorative */}
        <div className="absolute right-3 -top-2.5 h-[50px] w-[50px] rounded-full bg-white/6" />
        <div className="absolute -left-4 bottom-2 h-[70px] w-[70px] rounded-full bg-white/5" />
        <Sparkles
          size={14}
          className="absolute left-[190px] top-3 text-white/15"
        />

        <div className="relative p-5">
          <p className="text-[13px] text-white/80">今日の復習</p>
          <p className="mt-1 text-[30px] font-bold text-white">
            {stats.dueCount}枚
          </p>

          <div className="mt-4 flex items-center justify-between">
            <Link
              href="/review"
              className="inline-flex h-[34px] items-center justify-center rounded-chip bg-white px-5 text-xs font-semibold text-primary"
            >
              復習を始める
            </Link>
            <Link
              href="/review"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20"
              aria-label="復習を始める"
            >
              <Play size={22} className="text-white" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Chips */}
      <div className="flex justify-center gap-2">
        <StatChip value={String(stats.learnedCount)} label="覚えた" />
        <StatChip
          value={`${stats.accuracyPercent}%`}
          label="正解率"
          valueColor="text-good"
        />
        <StatChip value={String(stats.totalCards)} label="カード" />
      </div>

      {/* Recent Words */}
      <div className="space-y-2.5">
        <h2 className="text-base font-semibold text-text-primary">
          最近追加した単語
        </h2>
        {recentWords.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">
            まだ単語がありません
          </p>
        ) : (
          <div className="overflow-hidden rounded-card border border-surface-border bg-surface">
            {recentWords.map((w, i) => (
              <div key={w.id}>
                {i > 0 && <div className="h-px bg-slate-100 dark:bg-slate-700" />}
                <Link
                  href={`/cards/${encodeURIComponent(w.word)}`}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-[15px] font-medium text-text-primary">
                    {w.word}
                  </span>
                  <div className="flex items-center gap-2">
                    {w.translation && (
                      <span className="text-xs text-text-muted">
                        {w.translation}
                      </span>
                    )}
                    {w.level && <LevelBadge level={Number(w.level)} />}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({
  value,
  label,
  valueColor = "text-text-primary",
}: {
  value: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-chip border border-surface-border bg-surface px-3 py-1.5">
      <span className={`text-sm font-bold ${valueColor}`}>{value}</span>
      <span className="text-[11px] text-text-secondary">{label}</span>
    </div>
  );
}
