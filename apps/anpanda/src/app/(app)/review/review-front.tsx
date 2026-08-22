"use client";

import { useEffect } from "react";
import { useReviewStore } from "@/lib/stores/review-store";
import { useSettings } from "@/lib/contexts/settings-context";
import type { Flashcard } from "@/lib/types";

export function ReviewFront({ card }: { card: Flashcard }) {
  const { flipCard } = useReviewStore();
  const { auto_play_audio } = useSettings();

  useEffect(() => {
    if (!auto_play_audio) return;
    const utterance = new SpeechSynthesisUtterance(card.word);
    utterance.lang = "en-US";
    const timer = setTimeout(() => {
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }, 400);
    return () => {
      clearTimeout(timer);
      speechSynthesis.cancel();
    };
  }, [card.id, auto_play_audio]);

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <button
        onClick={flipCard}
        className="flex w-full flex-col items-center justify-center gap-6 rounded-card-lg border border-surface-border bg-surface p-8 shadow-card cursor-pointer"
        style={{ minHeight: 320 }}
        role="button"
        aria-label="タップして答えを見る"
      >
        <span className="text-[32px] font-bold text-text-primary">
          {card.word}
        </span>
        <span className="text-sm text-text-muted">
          タップして答えを見る
        </span>
      </button>
    </div>
  );
}
