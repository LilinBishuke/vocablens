"use client";

import { useEffect } from "react";
import { useReviewStore } from "@/lib/stores/review-store";
import { useSettings } from "@/lib/contexts/settings-context";
import { LevelBadge } from "@/components/ui";
import type { Flashcard } from "@/lib/types";

export function ReviewFront({ card }: { card: Flashcard }) {
  const { flipCard } = useReviewStore();
  const { auto_play_audio } = useSettings();

  useEffect(() => {
    if (!auto_play_audio) return;
    const t = setTimeout(() => {
      const u = new SpeechSynthesisUtterance(card.word);
      u.lang = "en-US";
      speechSynthesis.speak(u);
    }, 400);
    return () => {
      clearTimeout(t);
      speechSynthesis.cancel();
    };
  }, [card.word, auto_play_audio]);

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      {/* カード束: 背面に少し傾いた2枚目 */}
      <div className="relative w-full">
        <div
          className="absolute inset-x-4 top-3 bottom-[-10px] rounded-card-lg bg-surface/50"
          style={{ transform: "rotate(-3deg)" }}
          aria-hidden
        />
        <button
          onClick={flipCard}
          className="animate-flip-in glass-card relative flex w-full flex-col items-center justify-center gap-5 rounded-card-lg p-8 cursor-pointer transition-transform active:scale-[0.99]"
          style={{ minHeight: 340 }}
          aria-label="タップして答えを見る"
        >
          {card.level && <LevelBadge level={Number(card.level)} showLabel />}
          <span className="text-[32px] font-bold text-text-primary">
            {card.word}
          </span>
          {card.phonetic && (
            <span className="text-[15px] text-text-muted">{card.phonetic}</span>
          )}
          <span className="pt-4 text-sm text-text-muted">
            タップして答えを見る
          </span>
        </button>
      </div>
    </div>
  );
}
