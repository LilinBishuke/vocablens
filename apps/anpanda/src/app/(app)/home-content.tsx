"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { WordRow } from "@/components/ui";
import { useT } from "@/lib/contexts/settings-context";
import { AddWordFab } from "@/components/add-word-fab";
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

/** created_at からの相対時刻ラベル */
function relativeTime(iso: string, t: ReturnType<typeof useT>): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return t("home.justNow");
  if (min < 60) return `${min}${t("home.minAgo")}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}${t("home.hourAgo")}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}${t("home.dayAgo")}`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}${t("home.monthAgo")}`;
  return `${Math.floor(mo / 12)}${t("home.yearAgo")}`;
}

export function HomeContent({
  stats,
  recentWords,
  activePuzzle,
}: HomeContentProps) {
  const t = useT();
  return (
    <div className="flex-1 space-y-[18px] px-page pb-6 pt-1">
      {/* 統計行（グループ化・学習サマリーへ） */}
      <Link
        href="/summary"
        className="glass-card flex items-center gap-1 rounded-card px-3 py-2.5 transition-all active:scale-[0.98]"
        aria-label="学習サマリーを見る"
      >
        <StatChip value={String(stats.learnedCount)} label={t("home.learned")} />
        <StatChip value={`${stats.accuracyPercent}%`} label={t("home.accuracy")} />
        <StatChip value={String(stats.totalCards)} label={t("home.cards")} />
        <ChevronRight size={16} className="shrink-0 text-text-muted" />
      </Link>

      {/* 今日 */}
      <div className="space-y-2">
        <h2 className="text-[13px] font-semibold text-text-secondary">{t("home.today")}</h2>
        <div className="rounded-card-lg bg-gradient-to-br from-hero-from to-hero-to p-[22px]">
          <p className="text-[13px] font-medium text-white/85">{t("home.todayReview")}</p>
          <div className="mt-3 flex items-center justify-between gap-3.5">
            <p className="text-[30px] font-bold leading-none text-white">
              {stats.dueCount}{t("common.cardsUnit")}
            </p>
            <Link
              href="/review"
              className="inline-flex shrink-0 items-center justify-center rounded-chip bg-white px-[18px] py-2.5 text-[13px] font-semibold text-hero-to transition-transform active:scale-95"
            >
              {t("home.startReview")}
            </Link>
          </div>
        </div>
      </div>

      {/* パズル */}
      {activePuzzle && (
        <Link
          href="/puzzle"
          className="glass-card flex items-center gap-3 rounded-card px-4 py-3 transition-all active:scale-[0.98]"
        >
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-primary">
            {t("home.puzzle")}: {activePuzzle.name}
          </span>
          <span className="shrink-0 text-xs font-semibold text-primary">
            {activePuzzle.piecesRevealed} / {activePuzzle.totalPieces}
          </span>
        </Link>
      )}

      {/* Recent Words */}
      <div className="space-y-2.5">
        <h2 className="text-[13px] font-semibold text-text-secondary">
          {t("home.recentWords")}
        </h2>
        {recentWords.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">
            {t("home.noWords")}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentWords.map((w) => (
              <WordRow
                key={w.id}
                word={w.word}
                translation={w.translation}
                level={w.level}
                rightLabel={relativeTime(w.created_at, t)}
              />
            ))}
          </div>
        )}
      </div>

      <AddWordFab />
    </div>
  );
}

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="text-[17px] font-bold text-text-primary">{value}</span>
      </div>
      <span className="text-[10px] text-text-muted">{label}</span>
    </div>
  );
}
