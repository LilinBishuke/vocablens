"use client";

import { Volume2 } from "lucide-react";
import { useReviewStore } from "@/lib/stores/review-store";
import { speakWord } from "@/lib/utils/speak";
import { useT } from "@/lib/contexts/settings-context";
import { LevelBadge } from "@/components/ui";
import { FaceRating } from "@/components/ui/face-rating";
import type { Flashcard } from "@/lib/types";

export function ReviewFront({ card }: { card: Flashcard }) {
  const { flipCard } = useReviewStore();
  const t = useT();

  function speak() {
    speakWord(card.word, card.language);
  }

  return (
    <>
      {/* min-h-0: 内容が多くてもカードを画面内にクランプ（裏面と同一ジオメトリ） */}
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-3 pt-3">
        <div className="relative min-h-0 flex-1">
          <div
            className="absolute inset-x-4 top-3 bottom-[-10px] rounded-card-lg bg-surface/50"
            style={{ transform: "rotate(-3deg)" }}
            aria-hidden
          />
          <div
            onClick={flipCard}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && flipCard()}
            className="animate-flip-in glass-card relative flex h-full w-full flex-col items-center justify-center gap-4 rounded-card-lg p-8 cursor-pointer transition-transform active:scale-[0.99]"
            aria-label={t("aria.reveal")}
          >
            {card.level && <LevelBadge level={Number(card.level)} showLabel />}
            <span className="text-[32px] font-bold text-text-primary">
              {card.word}
            </span>
            {card.phonetic && (
              <span className="text-[15px] text-text-muted">{card.phonetic}</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                speak();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 cursor-pointer"
              aria-label={t("aria.speak")}
            >
              <Volume2 size={18} className="text-primary" />
            </button>
            <span className="pt-3 text-sm text-text-muted">
              {t("review.tapToReveal")}
            </span>
          </div>
        </div>
      </div>

      {/* 評価エリアの場所だけ確保（フリップ後と同じ高さ・非表示） */}
      <div className="invisible shrink-0 space-y-2 px-page pb-6 pt-2" aria-hidden>
        <p className="text-center text-[14px] font-medium">{t("review.remembered")}</p>
        <FaceRating onRate={() => {}} disabled />
      </div>
    </>
  );
}
