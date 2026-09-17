"use client";

import { Volume2 } from "lucide-react";
import { useReviewStore } from "@/lib/stores/review-store";
import { speakWord } from "@/lib/utils/speak";
import { useT } from "@/lib/contexts/settings-context";
import { calculateSM2 } from "@/lib/utils/sm2";
import { createClient } from "@/lib/supabase/client";
import { LevelBadge } from "@/components/ui";
import { FaceRating, type FaceRatingEntry } from "@/components/ui/face-rating";
import type { Flashcard } from "@/lib/types";

export function ReviewBack({ card }: { card: Flashcard }) {
  const { rateCard, nextCard } = useReviewStore();
  const t = useT();

  function handleSpeak() {
    speakWord(card.word, card.language);
  }

  function handleRate(rating: FaceRatingEntry) {
    const quality = rating.quality;
    const isCorrect = quality >= 3;

    const result = calculateSM2(
      {
        repetitions: card.sm2_repetitions,
        interval: card.sm2_interval,
        easeFactor: card.sm2_ease_factor,
      },
      quality
    );

    rateCard(rating.key, isCorrect);
    nextCard();

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

  const def = card.definition;
  // 空の意味は表示しない（en が空のエントリを除外）
  const meanings = (def?.meanings ?? []).filter((m) => m.en && m.en.trim());
  const examples = (def?.examples ?? []).filter((e) => e.en && e.en.trim());
  // 旧形式（meanings[].examples）のフォールバック
  const legacyExamples: { en: string; ja?: string }[] =
    examples.length === 0
      ? meanings.flatMap((m) => (m.examples ?? []).map((en) => ({ en })))
      : [];
  const allExamples: { en: string; ja?: string }[] =
    examples.length > 0 ? examples : legacyExamples;
  const conjugations = (def?.conjugations ?? []).filter(
    (c) => c.label && c.value
  );

  return (
    <>
      {/* min-h-0: 内容が多くてもカードを画面内にクランプし、はみ出しはカード内スクロールにする */}
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-3 pt-3">
        <div className="relative min-h-0 flex-1">
          <div
            className="absolute inset-x-4 top-3 bottom-[-10px] rounded-card-lg bg-surface/50"
            style={{ transform: "rotate(-3deg)" }}
            aria-hidden
          />
          <div
            className="animate-flip-in glass-card relative flex h-full w-full flex-col items-center gap-3 overflow-y-auto rounded-card-lg px-6 py-6"
          >
          {/* Lv */}
          {card.level && <LevelBadge level={Number(card.level)} showLabel />}

          {/* Word */}
          <span className="text-[26px] font-bold text-text-primary">
            {card.word}
          </span>

          {/* Phonetic + audio（タイトルとの余白は詰める） */}
          <div className="-mt-1.5 flex items-center gap-3">
            {card.phonetic && (
              <span className="text-sm text-text-muted">{card.phonetic}</span>
            )}
            <button
              onClick={handleSpeak}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 cursor-pointer"
              aria-label={t("aria.speak")}
            >
              <Volume2 size={16} className="text-primary" />
            </button>
          </div>

          <div className="h-px w-full bg-surface-border" />

          {/* 意味（主訳） */}
          {card.translation && (
            <span className="text-center text-lg font-semibold text-text-primary">
              {card.translation}
            </span>
          )}
          {def?.pos && (
            <span className="text-[12px] text-text-muted">{def.pos}</span>
          )}

          {/* 変化形（時制変化・比較級など） */}
          {conjugations.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {conjugations.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-baseline gap-1 rounded-badge border border-border-glass bg-surface px-2 py-1"
                >
                  <span className="text-[10px] text-text-muted">{c.label}</span>
                  <span className="text-[12px] font-semibold text-text-primary">
                    {c.value}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* 多義 */}
          {meanings.length > 0 && (
            <div className="w-full space-y-1.5">
              {meanings.slice(0, 4).map((m, i) => (
                <div key={i} className="text-left">
                  <p className="text-[13px] leading-relaxed text-text-primary">
                    {meanings.length > 1 ? `${i + 1}. ` : ""}
                    {m.en}
                  </p>
                  {m.ja && (
                    <p className="text-[12px] leading-relaxed text-text-secondary">
                      {m.ja}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 例文 */}
          {allExamples.length > 0 && (
            <div className="w-full rounded-[14px] bg-primary/10 px-4 py-3 text-left">
              <p className="text-[10px] font-semibold text-primary-strong">
                {t("review.examples")}
              </p>
              {allExamples.slice(0, 2).map((ex, i) => (
                <div key={i} className={i > 0 ? "mt-2" : "mt-1"}>
                  <p className="text-[12px] font-medium leading-relaxed text-text-primary">
                    {ex.en}
                  </p>
                  {ex.ja && (
                    <p className="text-[11px] leading-relaxed text-text-secondary">
                      {ex.ja}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 語源・文法・スラングは復習カードでは表示しない（カード詳細のみ） */}
          </div>
        </div>
      </div>

      {/* Bottom: 5段階フェイス評価 */}
      <div className="shrink-0 space-y-2 px-page pb-6 pt-2">
        <p className="text-center text-[14px] font-medium text-text-secondary">
          {t("review.remembered")}
        </p>
        <FaceRating onRate={handleRate} />
      </div>
    </>
  );
}
