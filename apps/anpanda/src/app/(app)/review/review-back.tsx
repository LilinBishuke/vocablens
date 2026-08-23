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

  return (
    <>
      <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-3">
        <div className="animate-flip-in glass-card flex w-full flex-col items-center gap-3 rounded-card-lg px-6 py-6">
          {/* Lv */}
          {card.level && <LevelBadge level={Number(card.level)} showLabel />}

          {/* Word */}
          <span className="text-[26px] font-bold text-text-primary">
            {card.word}
          </span>

          {/* Phonetic + audio */}
          <div className="flex items-center gap-3">
            {card.phonetic && (
              <span className="text-sm text-text-muted">{card.phonetic}</span>
            )}
            <button
              onClick={handleSpeak}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 cursor-pointer"
              aria-label="発音を再生"
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
                例文
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

          {/* 語源 */}
          {def?.etymology && (
            <InfoBlock label="語源" text={def.etymology} />
          )}
          {/* 文法・使い方 */}
          {def?.grammar && (
            <InfoBlock label="文法・使い方" text={def.grammar} />
          )}
          {/* スラング */}
          {def?.slang && <InfoBlock label="スラング・口語" text={def.slang} />}
        </div>
      </div>

      {/* Bottom: 5段階フェイス評価 */}
      <div className="shrink-0 space-y-3 px-page pb-7 pt-2">
        <p className="text-center text-[11px] text-text-muted">
          覚えていましたか？
        </p>
        <FaceRating onRate={handleRate} />
      </div>
    </>
  );
}

function InfoBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="w-full rounded-[14px] border border-border-glass bg-surface px-4 py-3 text-left">
      <p className="text-[10px] font-semibold text-primary-strong">{label}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-text-primary">
        {text}
      </p>
    </div>
  );
}
