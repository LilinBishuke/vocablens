"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { LevelBadge, SearchBar, FilterChips } from "@/components/ui";

interface CardItem {
  id: string;
  word: string;
  translation: string | null;
  level: string | null;
  learned: boolean;
  sm2_next_review: string;
  created_at: string;
}

const FILTERS = ["全て", "復習待ち", "覚えた"];

export function CardsContent({
  cards,
  totalCount,
}: {
  cards: CardItem[];
  totalCount: number;
}) {
  const [search, setSearch] = useState("");
  const [filterIndex, setFilterIndex] = useState(0);

  const filtered = useMemo(() => {
    let list = cards;

    // Filter
    if (filterIndex === 1) {
      const now = new Date().toISOString();
      list = list.filter((c) => !c.learned && c.sm2_next_review <= now);
    } else if (filterIndex === 2) {
      list = list.filter((c) => c.learned);
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.word.toLowerCase().includes(q) ||
          (c.translation && c.translation.toLowerCase().includes(q))
      );
    }

    return list;
  }, [cards, search, filterIndex]);

  return (
    <>
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-page shrink-0">
        <h1 className="text-lg font-bold text-text-primary">カード一覧</h1>
        <span className="text-sm text-text-muted">{totalCount}枚</span>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-page">
        <SearchBar
          placeholder="検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <FilterChips
          items={FILTERS}
          activeIndex={filterIndex}
          onChange={setFilterIndex}
        />

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            カードがありません
          </p>
        ) : (
          <div className="overflow-hidden rounded-card border border-surface-border bg-surface">
            {filtered.map((card, i) => (
              <div key={card.id}>
                {i > 0 && (
                  <div className="h-px bg-slate-100 dark:bg-slate-700" />
                )}
                <CardRow card={card} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function CardRow({ card }: { card: CardItem }) {
  const nextReview = new Date(card.sm2_next_review);
  const now = new Date();
  const diffDays = Math.ceil(
    (nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  let nextLabel: string;
  let nextColor = "text-text-muted";
  if (card.learned) {
    nextLabel = "";
  } else if (diffDays <= 0) {
    nextLabel = "次の復習: 今日";
    nextColor = "text-primary";
  } else if (diffDays === 1) {
    nextLabel = "次の復習: 明日";
  } else {
    nextLabel = `次の復習: ${diffDays}日後`;
  }

  return (
    <Link
      href={`/cards/${encodeURIComponent(card.word)}`}
      className="flex items-center justify-between px-4 py-3.5"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-medium text-text-primary">
          {card.word}
        </span>
        {card.translation && (
          <span className="text-xs text-text-muted">{card.translation}</span>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5">
        {card.level && <LevelBadge level={Number(card.level)} />}
        {nextLabel && (
          <span className={`text-[11px] font-medium ${nextColor}`}>
            {nextLabel}
          </span>
        )}
      </div>
    </Link>
  );
}
