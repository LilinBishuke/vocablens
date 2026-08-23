"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout";
import { SearchBar, FilterChips, WordRow } from "@/components/ui";
import { GroupsView } from "./groups-view";

export interface CardItem {
  id: string;
  word: string;
  translation: string | null;
  level: string | null;
  learned: boolean;
  sm2_next_review: string;
  created_at: string;
  source_title?: string | null;
  source_type?: string | null;
}

const FILTERS = ["全て", "グループ", "復習待ち", "覚えた"];

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

    // Filter（1=グループは別ビュー）
    if (filterIndex === 2) {
      const now = new Date().toISOString();
      list = list.filter((c) => !c.learned && c.sm2_next_review <= now);
    } else if (filterIndex === 3) {
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
      <Header
        variant="page"
        title="カード一覧"
        right={<span className="text-sm text-text-muted">{totalCount}枚</span>}
      />

      {/* Body */}
      <div className="flex-1 space-y-4 px-page">
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

        {filterIndex === 1 ? (
          <GroupsView cards={cards} />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            カードがありません
          </p>
        ) : (
          <div className="flex flex-col gap-2 pb-4">
            {filtered.map((card) => (
              <CardRow key={card.id} card={card} />
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

  let nextLabel: string | null = null;
  let highlight = false;
  if (card.learned) {
    nextLabel = "覚えた";
  } else if (diffDays <= 0) {
    nextLabel = "次: 今日";
    highlight = true;
  } else if (diffDays === 1) {
    nextLabel = "次: 明日";
  } else {
    nextLabel = `次: ${diffDays}日後`;
  }

  return (
    <WordRow
      word={card.word}
      translation={card.translation}
      level={card.level}
      rightLabel={nextLabel}
      rightHighlight={highlight}
    />
  );
}
