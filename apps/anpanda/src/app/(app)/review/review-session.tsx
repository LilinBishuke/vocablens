"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import { useReviewStore } from "@/lib/stores/review-store";
import type { Flashcard } from "@/lib/types";
import { ReviewFront } from "./review-front";
import { ReviewBack } from "./review-back";
import { ReviewComplete } from "./review-complete";
import { WritingMode } from "./writing-mode";

export function ReviewSession({
  initialCards,
}: {
  initialCards: Flashcard[];
}) {
  const router = useRouter();
  const { deck, startSession, isComplete, isFlipped, mode, currentIndex } =
    useReviewStore();

  useEffect(() => {
    if (initialCards.length > 0) {
      startSession(initialCards);
    }
  }, [initialCards, startSession]);

  // No cards due
  if (initialCards.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-page">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl">
          🎉
        </div>
        <p className="text-lg font-semibold text-text-primary">
          復習する単語がありません
        </p>
        <p className="text-sm text-text-secondary text-center">
          新しい単語を追加するか、明日また来てください
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-2 rounded-button bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-button-glow cursor-pointer"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  if (deck.length === 0) return null;

  if (isComplete) {
    return <ReviewComplete />;
  }

  const card = deck[currentIndex];
  if (!card) return null;

  const progress = `${currentIndex + 1} / ${deck.length}`;
  const progressPercent = ((currentIndex + 1) / deck.length) * 100;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <SessionHeader progress={progress} onClose={() => router.push("/")} />

      {/* Progress Bar */}
      <div className="mx-page h-1.5 overflow-hidden rounded-chip bg-progress-bar">
        <div
          className="h-full rounded-chip bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Mode Tabs */}
      <ModeTabs />

      {/* Content */}
      {mode === "writing" ? (
        <WritingMode card={card} />
      ) : isFlipped ? (
        <ReviewBack card={card} />
      ) : (
        <ReviewFront card={card} />
      )}
    </div>
  );
}

function SessionHeader({
  progress,
  onClose,
}: {
  progress: string;
  onClose: () => void;
}) {
  const { currentIndex, deck, nextCard } = useReviewStore();
  const canSkip = currentIndex < deck.length - 1;
  return (
    <Header
      variant="review"
      progress={progress}
      onClose={onClose}
      onSkip={canSkip ? nextCard : undefined}
    />
  );
}

function ModeTabs() {
  const { mode, switchMode } = useReviewStore();

  return (
    <div className="flex justify-center px-page py-2">
      <div className="glass-card flex rounded-chip p-1">
        <button
          onClick={() => switchMode("card")}
          className={`rounded-chip px-4 py-1.5 text-[13px] transition-all cursor-pointer ${
            mode === "card"
              ? "bg-primary font-semibold text-on-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          カード
        </button>
        <button
          onClick={() => switchMode("writing")}
          className={`rounded-chip px-4 py-1.5 text-[13px] transition-all cursor-pointer ${
            mode === "writing"
              ? "bg-primary font-semibold text-on-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          ライティング
        </button>
      </div>
    </div>
  );
}
