"use client";

import { Volume2, ArrowLeft, ArrowRight } from "lucide-react";
import { useReviewStore } from "@/lib/stores/review-store";
import { calculateSM2, QUALITY_MAP, type QualityLabel } from "@/lib/utils/sm2";
import { createClient } from "@/lib/supabase/client";
import { LevelBadge } from "@/components/ui";
import type { Flashcard } from "@/lib/types";

const RATING_BUTTONS: {
  label: QualityLabel;
  display: string;
  color: string;
  border: string;
}[] = [
  { label: "again", display: "Again", color: "text-again", border: "border-again" },
  { label: "hard", display: "Hard", color: "text-hard", border: "border-hard" },
  { label: "good", display: "Good", color: "text-good", border: "border-good" },
  { label: "easy", display: "Easy", color: "text-easy", border: "border-easy" },
];

export function ReviewBack({ card }: { card: Flashcard }) {
  const { rateCard, nextCard } = useReviewStore();

  function handleSpeak() {
    const utterance = new SpeechSynthesisUtterance(card.word);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  }

  async function handleRate(label: QualityLabel) {
    const quality = QUALITY_MAP[label];
    const isCorrect = quality >= 3;

    // Calculate SM-2
    const result = calculateSM2(
      {
        repetitions: card.sm2_repetitions,
        interval: card.sm2_interval,
        easeFactor: card.sm2_ease_factor,
      },
      quality
    );

    // Update store stats
    rateCard(label, isCorrect);

    // Persist to Supabase
    const supabase = createClient();
    await Promise.all([
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
        mode: "card",
        quality,
        is_correct: isCorrect,
      }),
    ]);

    nextCard();
  }

  const firstMeaning = card.definition?.meanings?.[0];

  return (
    <>
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="flex w-full flex-col items-center gap-3 rounded-card-lg border border-surface-border bg-surface p-6 shadow-card">
          {/* Word */}
          <span className="font-mono text-[28px] font-bold text-text-primary">
            {card.word}
          </span>

          {/* Phonetic */}
          {card.phonetic && (
            <span className="text-[15px] text-text-muted">{card.phonetic}</span>
          )}

          {/* Audio button */}
          <button
            onClick={handleSpeak}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 cursor-pointer"
            aria-label="発音を再生"
          >
            <Volume2 size={18} className="text-primary" />
          </button>

          <div className="h-px w-full bg-surface-border" />

          {/* Translation */}
          {card.translation && (
            <span className="text-lg font-semibold text-text-primary">
              {card.translation}
            </span>
          )}

          {/* Part of speech */}
          {card.definition?.pos && (
            <span className="text-[13px] text-text-muted">
              {card.definition.pos}
            </span>
          )}

          {/* Definition */}
          {firstMeaning && (
            <p className="text-center text-sm leading-relaxed text-text-secondary">
              {firstMeaning.en}
            </p>
          )}

          {/* Level badge */}
          {card.level && <LevelBadge level={Number(card.level)} showLabel />}
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="space-y-2.5 px-page pb-7 pt-2">
        {/* Swipe hint */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <ArrowLeft size={14} /> Again
          </span>
          <span>スワイプで評価</span>
          <span className="flex items-center gap-1">
            Good <ArrowRight size={14} />
          </span>
        </div>

        {/* Rating buttons */}
        <div className="flex gap-2">
          {RATING_BUTTONS.map(({ label, display, color, border }) => (
            <button
              key={label}
              onClick={() => handleRate(label)}
              className={`flex h-12 flex-1 items-center justify-center rounded-chip border-[1.5px] bg-surface text-sm font-semibold transition-all active:scale-95 cursor-pointer ${color} ${border}`}
            >
              {display}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
