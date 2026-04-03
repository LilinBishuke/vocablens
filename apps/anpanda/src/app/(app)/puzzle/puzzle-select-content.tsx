"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Puzzle as PuzzleIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Puzzle, UserPuzzle } from "@/lib/types";

interface Props {
  puzzles: Puzzle[];
  userPuzzles: UserPuzzle[];
  userId: string;
}

export function PuzzleSelectContent({ puzzles, userPuzzles, userId }: Props) {
  const router = useRouter();

  const progressMap = new Map(
    userPuzzles.map((up) => [up.puzzle_id, up])
  );

  const activePuzzle = userPuzzles.find((up) => up.is_active);

  async function handleSelect(puzzleId: string) {
    const supabase = createClient();

    // Deactivate current
    if (activePuzzle) {
      await supabase
        .from("user_puzzles")
        .update({ is_active: false })
        .eq("id", activePuzzle.id);
    }

    const existing = progressMap.get(puzzleId);
    if (existing) {
      await supabase
        .from("user_puzzles")
        .update({ is_active: true })
        .eq("id", existing.id);
    } else {
      await supabase.from("user_puzzles").insert({
        user_id: userId,
        puzzle_id: puzzleId,
        is_active: true,
      });
    }

    router.push(`/puzzle/${puzzleId}`);
    router.refresh();
  }

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
        <h1 className="text-lg font-bold text-text-primary">パズルを選ぶ</h1>
      </header>

      <div className="flex-1 space-y-5 px-page py-5">
        {/* Description */}
        <div className="space-y-1">
          <p className="text-base font-semibold text-text-primary">
            復習を続けてパズルを完成させよう！
          </p>
          <p className="text-[13px] text-text-secondary">
            1セッション完了 = 1ピース開放
          </p>
        </div>

        {/* Grid (2 columns) */}
        <div className="grid grid-cols-2 gap-3">
          {puzzles.map((puzzle) => {
            const progress = progressMap.get(puzzle.id);
            const isActive = activePuzzle?.puzzle_id === puzzle.id;
            const revealed = progress?.pieces_revealed ?? 0;

            return (
              <button
                key={puzzle.id}
                onClick={() => handleSelect(puzzle.id)}
                className={`flex flex-col overflow-hidden rounded-card bg-surface text-left transition-all cursor-pointer ${
                  isActive
                    ? "border-2 border-primary"
                    : "border border-surface-border"
                }`}
              >
                {/* Thumbnail */}
                <div
                  className={`flex h-[110px] w-full items-center justify-center ${
                    isActive ? "bg-blue-50 dark:bg-blue-950/30" : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  <PuzzleIcon
                    size={32}
                    className={isActive ? "text-primary" : "text-text-muted"}
                  />
                </div>

                {/* Info */}
                <div className="space-y-1 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">
                      {puzzle.name}
                    </span>
                    {isActive && (
                      <span className="rounded-badge bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                        進行中
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-text-muted">
                    {revealed} / {puzzle.total_pieces} ピース
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {puzzles.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">
            パズルがまだありません
          </p>
        )}
      </div>
    </div>
  );
}
