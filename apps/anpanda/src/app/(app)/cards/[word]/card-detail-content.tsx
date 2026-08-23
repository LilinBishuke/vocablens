"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Volume2, Check, PlayCircle, ExternalLink, Sparkles } from "lucide-react";
import { Header } from "@/components/layout";
import { LevelBadge, Button } from "@/components/ui";
import type { Flashcard } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { speakWord } from "@/lib/utils/speak";
import { AddToFolderSheet } from "@/components/add-to-folder-sheet";
import { useT } from "@/lib/contexts/settings-context";

interface CardDetailContentProps {
  card: Flashcard;
  reviewCount: number;
  accuracy: number;
}

export function CardDetailContent({
  card,
  reviewCount,
  accuracy,
}: CardDetailContentProps) {
  const router = useRouter();
  const t = useT();
  const [enriching, setEnriching] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [enrichError, setEnrichError] = useState("");
  const triedRef = useRef(false);

  const def = card.definition;
  const needsEnrich =
    !def?.etymology ||
    !card.translation ||
    !Number.isFinite(Number(card.level));

  // 情報が不足していれば自動でAI取得（マウントごとに1回）
  useEffect(() => {
    if (!needsEnrich || triedRef.current) return;
    triedRef.current = true;
    (async () => {
      setEnriching(true);
      try {
        const res = await fetch("/api/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word: card.word }),
        });
        if (res.status === 501) {
          setAiUnavailable(true);
        } else if (res.ok) {
          router.refresh();
        } else {
          setEnrichError("情報の生成に失敗しました。時間をおいて再度開いてください");
        }
      } catch {
        setEnrichError("通信エラーが発生しました");
      }
      setEnriching(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.word]);

  async function handleDelete() {
    if (!confirm("このカードを削除しますか？")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("flashcards")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", card.id);
    if (error) {
      alert("削除に失敗しました。もう一度お試しください。");
      return;
    }
    router.push("/cards");
    router.refresh();
  }

  function handleSpeak() {
    speakWord(card.word);
  }

  const nextReview = new Date(card.sm2_next_review);
  const diffDays = Math.ceil(
    (nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const nextLabel =
    diffDays <= 0
      ? t("detail.today")
      : diffDays === 1
        ? t("detail.tomorrow")
        : t("detail.daysLater", { n: diffDays });

  const meanings = (def?.meanings ?? []).filter((m) => m.en && m.en.trim());
  const examples: { en: string; ja?: string }[] = (def?.examples ?? []).filter(
    (e) => e.en && e.en.trim()
  );
  const legacyExamples: { en: string; ja?: string }[] =
    examples.length === 0
      ? meanings.flatMap((m) => (m.examples ?? []).map((en) => ({ en })))
      : [];
  const allExamples = examples.length > 0 ? examples : legacyExamples;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header（stickyは共通Headerが担う。入れ子スクロールは廃止） */}
      <Header variant="detail" title="" />

      {/* Hero */}
      <div className="bg-gradient-to-b from-primary/15 to-background dark:from-primary/10 dark:to-background px-6 pb-5 pt-2 space-y-2">
        <h1 className="text-[32px] font-bold text-text-primary">{card.word}</h1>

        <div className="flex items-center gap-3">
          {card.phonetic && (
            <span className="text-base text-text-secondary">
              {card.phonetic}
            </span>
          )}
          <button
            onClick={handleSpeak}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 cursor-pointer"
            aria-label="発音を再生"
          >
            <Volume2 size={17} className="text-primary" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {card.level && <LevelBadge level={Number(card.level)} showLabel />}
          {card.learned && (
            <span className="inline-flex items-center gap-1 rounded-badge bg-progress-bar px-2.5 py-0.5 text-[11px] text-text-muted">
              <Check size={12} />
              覚えた
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 px-6 py-5">
        {/* AI生成ステータス */}
        {enriching && (
          <div className="glass-card flex items-center gap-2.5 rounded-button px-4 py-3">
            <Sparkles size={16} className="animate-pulse text-primary" />
            <span className="text-[13px] text-text-secondary">
              {t("detail.generating")}
            </span>
          </div>
        )}
        {aiUnavailable && needsEnrich && (
          <p className="glass-card rounded-button px-4 py-3 text-xs text-text-secondary">
            AI取得が未設定のため、一部の情報を表示できません
          </p>
        )}
        {/* コンテンツが空のときだけエラーを見せる（既に情報があるなら静かに） */}
        {enrichError && !card.translation && meanings.length === 0 && (
          <p className="text-xs text-again">{enrichError}</p>
        )}

        {/* 意味 */}
        {(card.translation || meanings.length > 0) && (
          <section className="space-y-2">
            <SectionLabel>{t("detail.meaning")}</SectionLabel>
            {card.translation && (
              <p className="text-lg font-semibold text-text-primary">
                {card.translation}
                {def?.pos && (
                  <span className="ml-2 text-[12px] font-normal text-text-muted">
                    {def.pos}
                  </span>
                )}
              </p>
            )}
            {meanings.length > 0 && (
              <div className="space-y-2">
                {meanings.map((m, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium leading-relaxed text-text-primary">
                      {meanings.length > 1 ? `${i + 1}. ` : ""}
                      {m.en}
                    </p>
                    {m.ja && (
                      <p className="text-[13px] leading-relaxed text-text-secondary">
                        {m.ja}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 語源 / 文法 / スラング */}
        {def?.etymology && <InfoCard label={t("review.etymology")} text={def.etymology} />}
        {def?.grammar && <InfoCard label={t("review.grammar")} text={def.grammar} />}
        {def?.slang && <InfoCard label={t("review.slang")} text={def.slang} />}

        {/* 例文 */}
        {allExamples.length > 0 && (
          <section className="space-y-2">
            <SectionLabel>{t("review.examples")}</SectionLabel>
            <div className="rounded-[14px] bg-primary/10 px-4 py-3 space-y-2.5">
              {allExamples.map((ex, i) => (
                <div key={i}>
                  <p className="text-[13px] font-medium leading-relaxed text-text-primary">
                    {ex.en}
                  </p>
                  {ex.ja && (
                    <p className="text-[12px] leading-relaxed text-text-secondary">
                      {ex.ja}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 類語 */}
        {card.synonyms && card.synonyms.length > 0 && (
          <p className="text-[13px] text-text-muted">
            {t("detail.synonyms")}:{" "}
            <span className="text-text-primary">
              {card.synonyms.join(", ")}
            </span>
          </p>
        )}

        {/* フォルダ */}
        <AddToFolderSheet cardId={card.id} />

        {/* 学習記録（コンパクト 2×2） */}
        <section className="space-y-2">
          <SectionLabel>{t("detail.record")}</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat
              label={t("detail.addedOn")}
              value={new Date(card.created_at).toLocaleDateString("ja-JP")}
            />
            <MiniStat label={t("detail.reviews")} value={`${reviewCount}`} />
            <MiniStat label={t("home.accuracy")} value={`${accuracy}%`} />
            <MiniStat label={t("detail.nextReview")} value={nextLabel} highlight />
          </div>
        </section>

        {/* Source */}
        {card.source_url && (
          <a
            href={card.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 glass-card rounded-button px-4 py-3"
          >
            <PlayCircle
              size={20}
              className={
                card.source_type === "video"
                  ? "shrink-0 text-again"
                  : "shrink-0 text-primary"
              }
            />
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="truncate text-[13px] font-medium text-text-primary">
                {card.source_title ?? card.source_url}
              </p>
              <p className="text-[11px] text-text-muted">
                {card.source_type === "video" ? "YouTube" : "Webページ"}
                {card.source_timestamp && ` · ${card.source_timestamp}`}
              </p>
            </div>
            <ExternalLink size={16} className="shrink-0 text-text-muted" />
          </a>
        )}

        {/* Delete */}
        <Button variant="danger" className="w-full" onClick={handleDelete}>
          {t("detail.delete")}
        </Button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold text-text-muted">{children}</span>
  );
}

function InfoCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="glass-card rounded-button px-4 py-3">
      <p className="text-[10px] font-semibold text-primary-strong">{label}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-text-primary">
        {text}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="glass-card flex flex-col gap-0.5 rounded-button px-3.5 py-2.5">
      <span className="text-[10px] text-text-muted">{label}</span>
      <span
        className={`text-sm font-semibold ${
          highlight ? "text-primary" : "text-text-primary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
