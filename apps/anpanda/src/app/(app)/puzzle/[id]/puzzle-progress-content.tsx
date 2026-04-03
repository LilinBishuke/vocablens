"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Puzzle } from "@/lib/types";

interface Props {
  puzzle: Puzzle;
  piecesRevealed: number;
}

export function PuzzleProgressContent({ puzzle, piecesRevealed }: Props) {
  const router = useRouter();

  const totalPieces = puzzle.total_pieces;
  const percent =
    totalPieces > 0 ? Math.round((piecesRevealed / totalPieces) * 100) : 0;
  const remaining = totalPieces - piecesRevealed;

  // Build grid
  const rows = puzzle.grid_rows;
  const cols = puzzle.grid_cols;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex h-14 items-center gap-3 px-page shrink-0">
        <button
          onClick={() => router.back()}
          className="text-text-primary cursor-pointer"
          aria-label="戻る"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-text-primary">{puzzle.name}</h1>
      </header>

      <div className="flex flex-1 flex-col items-center gap-5 px-page py-5">
        {/* Progress info */}
        <div className="flex w-full items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[15px] font-semibold text-text-primary">
              {piecesRevealed} / {totalPieces} ピース開放
            </p>
            <p className="text-xs text-text-secondary">
              あと{remaining}セッションで完成！
            </p>
          </div>
          <span className="text-2xl font-bold text-primary">{percent}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-[4px] bg-progress-bar">
          <div
            className="h-full rounded-[4px] bg-primary transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Puzzle grid */}
        <div className="w-full overflow-hidden rounded-card border border-surface-border bg-surface p-3">
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {Array.from({ length: rows * cols }).map((_, i) => {
              const isRevealed = i < piecesRevealed;
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-[4px] ${
                    isRevealed
                      ? "bg-blue-100 dark:bg-primary-dark"
                      : "border border-surface-border"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-blue-100 dark:bg-primary-dark" />
            <span className="text-xs text-text-secondary">開放済み</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm border border-surface-border" />
            <span className="text-xs text-text-secondary">未開放</span>
          </div>
        </div>

        {/* Change puzzle button */}
        <button
          onClick={() => router.push("/puzzle")}
          className="flex h-11 w-full items-center justify-center rounded-button border border-surface-border bg-surface text-sm font-medium text-text-primary cursor-pointer"
        >
          パズルを変更
        </button>
      </div>
    </div>
  );
}
