"use client";

import { useRouter } from "next/navigation";
import { useReviewStore } from "@/lib/stores/review-store";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";

interface PuzzleInfo {
  puzzleName: string;
  piecesRevealed: number;
  totalPieces: number;
  gridCols: number;
  gridRows: number;
  newPieceIndex: number;
}

export function ReviewComplete() {
  const router = useRouter();
  const { sessionStats, reset } = useReviewStore();
  const savedRef = useRef(false);
  const [puzzleInfo, setPuzzleInfo] = useState<PuzzleInfo | null>(null);

  const { total, correct, ratings } = sessionStats;
  const accuracyPercent =
    total > 0 ? Math.round((correct / total) * 100) : 0;

  // Save session + reveal puzzle piece
  useEffect(() => {
    if (savedRef.current || total === 0) return;
    savedRef.current = true;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Save session
      await supabase.from("review_sessions").insert({
        user_id: user.id,
        cards_reviewed: total,
        correct_count: correct,
        total_count: total,
      });

      // Reveal puzzle piece for active puzzle
      const { data: activePuzzle } = await supabase
        .from("user_puzzles")
        .select("*, puzzle:puzzles(*)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (activePuzzle?.puzzle) {
        const puzzle = activePuzzle.puzzle as {
          name: string;
          total_pieces: number;
          grid_cols: number;
          grid_rows: number;
        };
        const newRevealed = Math.min(
          activePuzzle.pieces_revealed + 1,
          puzzle.total_pieces
        );

        await supabase
          .from("user_puzzles")
          .update({
            pieces_revealed: newRevealed,
            completed_at:
              newRevealed >= puzzle.total_pieces
                ? new Date().toISOString()
                : null,
          })
          .eq("id", activePuzzle.id);

        setPuzzleInfo({
          puzzleName: puzzle.name,
          piecesRevealed: newRevealed,
          totalPieces: puzzle.total_pieces,
          gridCols: puzzle.grid_cols,
          gridRows: puzzle.grid_rows,
          newPieceIndex: newRevealed - 1,
        });
      }
    })();
  }, [total, correct]);

  function handleRestart() {
    reset();
    router.refresh();
  }

  const goodEasy = (ratings.good ?? 0) + (ratings.easy ?? 0);
  const hard = ratings.hard ?? 0;
  const again = ratings.again ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex h-14 items-center px-page">
        <button
          onClick={() => {
            reset();
            router.push("/");
          }}
          className="text-text-muted cursor-pointer"
          aria-label="閉じる"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-7">
        {/* Title */}
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-2xl font-bold text-text-primary">お疲れ様！</h1>
          {puzzleInfo ? (
            <p className="text-sm font-semibold text-primary">
              新しいピースが開放されました！
            </p>
          ) : (
            <p className="text-[15px] text-text-secondary">
              {total}枚復習しました
            </p>
          )}
        </div>

        {/* Puzzle preview (if active) */}
        {puzzleInfo && (
          <div className="w-full overflow-hidden rounded-card border-2 border-primary bg-surface p-3 space-y-2">
            <div
              className="grid gap-[3px]"
              style={{
                gridTemplateColumns: `repeat(${puzzleInfo.gridCols}, 1fr)`,
              }}
            >
              {Array.from({
                length: puzzleInfo.gridRows * puzzleInfo.gridCols,
              }).map((_, i) => {
                const isNew = i === puzzleInfo.newPieceIndex;
                const isRevealed = i < puzzleInfo.piecesRevealed;
                return (
                  <div
                    key={i}
                    className={`flex aspect-[4/3] items-center justify-center rounded-[4px] text-[8px] font-bold transition-all ${
                      isNew
                        ? "bg-primary text-white animate-pulse"
                        : isRevealed
                          ? "bg-blue-100 dark:bg-primary-dark"
                          : "border border-surface-border"
                    }`}
                  >
                    {isNew && "NEW"}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">
                {puzzleInfo.puzzleName}
              </span>
              <span className="text-xs font-semibold text-primary">
                {puzzleInfo.piecesRevealed} / {puzzleInfo.totalPieces} ピース
              </span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex w-full gap-3">
          <div className="flex flex-1 flex-col items-center gap-0.5 rounded-button border border-surface-border bg-surface p-3.5">
            <span className="text-lg font-bold text-text-primary">
              {total}枚
            </span>
            <span className="text-[11px] text-text-muted">復習数</span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-0.5 rounded-button border border-surface-border bg-surface p-3.5">
            <span className="text-lg font-bold text-good">
              {accuracyPercent}%
            </span>
            <span className="text-[11px] text-text-muted">正解率</span>
          </div>
        </div>

        {/* Breakdown (only when no puzzle or compact) */}
        {!puzzleInfo && (
          <div className="w-full overflow-hidden rounded-card border border-surface-border bg-surface">
            <BreakdownRow color="bg-good" label="Easy / Good" count={goodEasy} />
            <div className="h-px bg-slate-100 dark:bg-slate-700" />
            <BreakdownRow color="bg-hard" label="Hard" count={hard} />
            <div className="h-px bg-slate-100 dark:bg-slate-700" />
            <BreakdownRow color="bg-again" label="Again" count={again} />
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="space-y-3 px-page pb-8 pt-4">
        <button
          onClick={handleRestart}
          className="flex h-12 w-full items-center justify-center rounded-button bg-primary text-base font-semibold text-white shadow-button-glow cursor-pointer"
        >
          もう一度復習する
        </button>
        <button
          onClick={() => {
            reset();
            router.push("/");
          }}
          className="flex h-12 w-full items-center justify-center rounded-button border border-surface-border bg-surface text-base font-medium text-text-primary cursor-pointer"
        >
          ホームに戻る
        </button>
      </div>
    </div>
  );
}

function BreakdownRow({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-sm ${color}`} />
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <span className="text-sm font-medium text-text-primary">{count}枚</span>
    </div>
  );
}
