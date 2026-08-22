"use client";

import { Volume2 } from "lucide-react";
import { useReviewStore } from "@/lib/stores/review-store";
import { calculateSM2 } from "@/lib/utils/sm2";
import { createClient } from "@/lib/supabase/client";
import { LevelBadge } from "@/components/ui";
import { FaceRating, type FaceRatingEntry } from "@/components/ui/face-rating";
import type { Flashcard } from "@/lib/types";

export function ReviewBack({ card }: { card: Flashcard }) {
  const { rateCard, nextCard } = useReviewStore();

  function handleSpeak() {
    const utterance = new SpeechSynthesisUtterance(card.word);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  }

  function handleRate(rating: FaceRatingEntry) {
    const quality = rating.quality;
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

    // Update store stats + advance immediately
    rateCard(rating.key, isCorrect);
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
        mode: "card",
        quality,
        is_correct: isCorrect,
      }),
    ]).catch(() => {});
  }

  const firstMeaning = card.definition?.meanings?.[0];

  return (
    <>
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="glass-card flex w-full flex-col items-center gap-3 rounded-card-lg p-6">
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 cursor-pointer"
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

          {/* Level */}
          {card.level && <LevelBadge level={Number(card.level)} showLabel />}
        </div>
      </div>

      {/* Bottom: 5段階フェイス評価 */}
      <div className="space-y-3 px-page pb-7 pt-2">
        <p className="text-center text-[11px] text-text-muted">
          覚えていましたか？
        </p>
        <FaceRating onRate={handleRate} />
      </div>
    </>
  );
}
