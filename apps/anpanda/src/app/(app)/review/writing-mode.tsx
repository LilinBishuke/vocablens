"use client";

import { useReviewStore } from "@/lib/stores/review-store";
import { useT } from "@/lib/contexts/settings-context";
import { calculateSM2, QUALITY_MAP } from "@/lib/utils/sm2";
import { createClient } from "@/lib/supabase/client";
import type { Flashcard } from "@/lib/types";

export function WritingMode({ card }: { card: Flashcard }) {
  const t = useT();
  const {
    writingAnswer,
    setWritingAnswer,
    writingResult,
    submitWritingAnswer,
    showHint,
    toggleHint,
    rateCard,
    nextCard,
  } = useReviewStore();

  const hintText = card.word.slice(0, 2) + "...";

  async function handleSubmit() {
    if (writingResult) {
      // Already submitted — persist and move to next
      const isCorrect = writingResult === "correct";
      const quality = isCorrect ? QUALITY_MAP.good : QUALITY_MAP.again;
      const label = isCorrect ? "good" : "again";

      const result = calculateSM2(
        {
          repetitions: card.sm2_repetitions,
          interval: card.sm2_interval,
          easeFactor: card.sm2_ease_factor,
        },
        quality
      );

      rateCard(label, isCorrect);
      nextCard();

      // Persist to Supabase in background
      const supabase = createClient();
      Promise.all([
        supabase
          .from("flashcards")
          .update({
            sm2_repetitions: result.repetitions,
            sm2_interval: result.interval,
            sm2_ease_factor: result.easeFactor,
            sm2_next_review: result.nextReview.toISOString(),
            sm2_last_review: new Date().toISOString(),
          })
          .eq("id", card.id),
        supabase.from("review_history").insert({
          user_id: card.user_id,
          flashcard_id: card.id,
          mode: "writing",
          quality,
          is_correct: isCorrect,
        }),
      ]).catch(() => {});
      return;
    }

    // First submit — check answer
    submitWritingAnswer();
  }

  const resultBorder =
    writingResult === "correct"
      ? "border-good"
      : writingResult === "incorrect"
        ? "border-again"
        : "border-surface-border";

  return (
    <>
      <div className="flex flex-1 items-center justify-center px-6">
        <div
          className={`flex w-full flex-col items-center gap-4 glass-card rounded-card-lg p-7 ${resultBorder}`}
        >
          <span className="text-[13px] text-text-muted">
            この意味の英単語は？
          </span>

          {/* Japanese meaning */}
          <span className="text-center text-[22px] font-bold text-text-primary">
            {card.translation ?? ""}
          </span>

          {/* POS + character count hint */}
          <span className="rounded-chip bg-progress-bar px-3 py-1 text-xs text-text-muted">
            {card.definition?.pos ?? "Word"} · {card.word.length}
            {t("writing.charsUnit")}
          </span>

          <div className="h-px w-full bg-surface-border" />

          {/* Input */}
          <input
            type="text"
            value={writingAnswer}
            onChange={(e) => setWritingAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={t("writing.placeholder")}
            disabled={writingResult !== null}
            className="h-12 w-full rounded-[12px] border border-surface-border bg-background px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-colors disabled:opacity-60"
            autoFocus
          />

          {/* Hint */}
          {!writingResult && (
            <button
              onClick={toggleHint}
              className="text-[13px] text-primary cursor-pointer"
            >
              {showHint
                ? `${t("writing.hintLabel")}: ${hintText}`
                : t("writing.showHint")}
            </button>
          )}

          {/* Result */}
          {writingResult && (
            <div className="flex w-full flex-col items-center gap-2">
              <span
                className={`rounded-badge px-3 py-1 text-xs font-semibold ${
                  writingResult === "correct"
                    ? "bg-good/10 text-good"
                    : "bg-again/10 text-again"
                }`}
              >
                {writingResult === "correct"
                  ? t("writing.correct")
                  : t("writing.incorrect")}
              </span>
              {writingResult === "incorrect" && (
                <p className="text-sm text-text-secondary">
                  {t("writing.answer")}:{" "}
                  <span className="font-mono font-semibold text-text-primary">
                    {card.word}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submit button */}
      <div className="px-page pb-8 pt-4">
        <button
          onClick={handleSubmit}
          disabled={!writingAnswer.trim() && !writingResult}
          className="flex h-12 w-full items-center justify-center rounded-button bg-primary text-base font-semibold text-on-primary shadow-button-glow transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {writingResult ? t("writing.next") : t("writing.submit")}
        </button>
      </div>
    </>
  );
}
