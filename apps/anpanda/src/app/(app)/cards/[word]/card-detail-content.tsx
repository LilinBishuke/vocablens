"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Volume2,
  Check,
  PlayCircle,
  ExternalLink,
} from "lucide-react";
import { LevelBadge, Button } from "@/components/ui";
import type { Flashcard } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const levelLabels: Record<string, string> = {
  "1": "初級",
  "2": "初中級",
  "3": "中級",
  "4": "中上級",
  "5": "上級",
};

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

  async function handleDelete() {
    if (!confirm("このカードを削除しますか？")) return;

    const supabase = createClient();
    await supabase
      .from("flashcards")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", card.id);

    router.push("/cards");
    router.refresh();
  }

  function handleSpeak() {
    const utterance = new SpeechSynthesisUtterance(card.word);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  }

  const nextReview = new Date(card.sm2_next_review);
  const now = new Date();
  const diffDays = Math.ceil(
    (nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  let nextLabel: string;
  if (diffDays <= 0) nextLabel = "今日";
  else if (diffDays === 1) nextLabel = "明日";
  else nextLabel = `${diffDays}日後`;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex h-14 items-center gap-3 px-page shrink-0">
        <button
          onClick={() => router.back()}
          className="text-text-primary hover:text-text-secondary transition-colors cursor-pointer"
          aria-label="戻る"
        >
          <ArrowLeft size={22} />
        </button>
        <span className="text-base text-text-primary">戻る</span>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-blue-100 to-background dark:from-blue-950 dark:to-background px-6 py-5 space-y-2">
        <h1 className="font-mono text-[32px] font-bold text-text-primary">
          {card.word}
        </h1>

        {card.phonetic && (
          <div className="flex items-center gap-3">
            <span className="text-base text-text-secondary">
              {card.phonetic}
            </span>
            <button
              onClick={handleSpeak}
              className="text-primary cursor-pointer"
              aria-label="発音を再生"
            >
              <Volume2 size={20} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          {card.level && (
            <LevelBadge level={Number(card.level)} showLabel />
          )}
          {card.learned && (
            <span className="inline-flex items-center gap-1 rounded-badge bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-[11px] text-text-muted">
              <Check size={12} />
              覚えた
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5 px-6 py-6">
        {/* Translation */}
        {card.translation && (
          <Section label="翻訳">
            <p className="text-base text-text-primary">{card.translation}</p>
          </Section>
        )}

        <Separator />

        {/* Definition */}
        {card.definition && (
          <div className="space-y-3">
            <p className="text-base font-bold text-text-primary">
              {card.definition.pos}
            </p>
            {card.definition.meanings.map((m, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-sm font-medium text-text-primary leading-relaxed">
                  {i + 1}. {m.en}
                </p>
                <p className="text-[13px] text-text-secondary leading-relaxed">
                  → {m.ja}
                </p>
                {m.examples.length > 0 && (
                  <div className="rounded-[10px] bg-slate-100 dark:bg-slate-700/50 px-3.5 py-2.5">
                    {m.examples.map((ex, j) => (
                      <p
                        key={j}
                        className="text-[13px] italic text-text-primary leading-[1.7]"
                      >
                        &ldquo;{ex}&rdquo;
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {card.synonyms && card.synonyms.length > 0 && (
              <p className="text-[13px] text-text-muted">
                <span className="text-text-muted">類語: </span>
                <span className="text-text-primary">
                  {card.synonyms.join(", ")}
                </span>
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Learning Record */}
        <div className="space-y-2.5">
          <h3 className="text-[15px] font-semibold text-text-primary">
            学習記録
          </h3>
          <div className="overflow-hidden rounded-button border border-surface-border bg-surface">
            <RecordRow
              label="追加日"
              value={new Date(card.created_at).toLocaleDateString("ja-JP")}
            />
            <div className="h-px bg-slate-100 dark:bg-slate-700" />
            <RecordRow label="復習回数" value={`${reviewCount}回`} />
            <div className="h-px bg-slate-100 dark:bg-slate-700" />
            <RecordRow label="正解率" value={`${accuracy}%`} />
            <div className="h-px bg-slate-100 dark:bg-slate-700" />
            <RecordRow label="次の復習" value={nextLabel} highlight />
          </div>
        </div>

        <Separator />

        {/* Source */}
        {card.source_url && (
          <>
            <div className="space-y-2">
              <span className="text-xs font-medium text-text-muted">出典</span>
              <a
                href={card.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-button border border-surface-border bg-surface px-4 py-3"
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
            </div>
            <Separator />
          </>
        )}

        {/* Delete */}
        <Button
          variant="danger"
          className="w-full"
          onClick={handleDelete}
        >
          カードを削除
        </Button>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
    </div>
  );
}

function Separator() {
  return <div className="h-px bg-surface-border" />;
}

function RecordRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-[13px] text-text-muted">{label}</span>
      <span
        className={`text-[13px] ${highlight ? "font-medium text-primary" : "text-text-primary"}`}
      >
        {value}
      </span>
    </div>
  );
}
