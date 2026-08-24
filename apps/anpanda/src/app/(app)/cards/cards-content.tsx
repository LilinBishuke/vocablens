"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout";
import { SearchBar, FilterChips, WordRow } from "@/components/ui";
import { useT } from "@/lib/contexts/settings-context";
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
  type?: string | null;
}

const TYPE_VALUES = [null, "vocab", "idiom", "slang"] as const;



export function CardsContent({
  cards,
  totalCount,
}: {
  cards: CardItem[];
  totalCount: number;
}) {
  const t = useT();
  const FILTERS = [t("cards.all"), t("cards.groups"), t("cards.due"), t("cards.learned")];
  const TYPES = [t("cards.all"), t("cards.typeVocab"), t("cards.typeIdiom"), t("cards.typeSlang")];
  const [search, setSearch] = useState("");
  const [filterIndex, setFilterIndex] = useState(0);
  const [typeIndex, setTypeIndex] = useState(0);

  const filtered = useMemo(() => {
    let list = cards;

    // 種類（vocab / idiom / slang）
    const typeValue = TYPE_VALUES[typeIndex];
    if (typeValue) {
      list = list.filter((c) => (c.type ?? "vocab") === typeValue);
    }

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
  }, [cards, search, filterIndex, typeIndex]);

  return (
    <>
      {/* Header */}
      <Header
        variant="page"
        title={t("cards.title")}
        right={<span className="text-sm text-text-muted">{totalCount}{t("common.cardsUnit")}</span>}
      />

      {/* Body */}
      <div className="flex-1 space-y-4 px-page">
        <SearchBar
          placeholder={t("cards.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <FilterChips
          items={FILTERS}
          activeIndex={filterIndex}
          onChange={setFilterIndex}
        />

        {filterIndex !== 1 && (
          <FilterChips
            items={TYPES}
            activeIndex={typeIndex}
            onChange={setTypeIndex}
          />
        )}

        {filterIndex === 1 ? (
          <GroupsView cards={cards} />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            {t("cards.empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-2 pb-4">
            {filtered.map((card) => (
              <CardRow key={card.id} card={card} t={t} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function CardRow({ card, t }: { card: CardItem; t: ReturnType<typeof useT> }) {
  const nextReview = new Date(card.sm2_next_review);
  const now = new Date();
  const diffDays = Math.ceil(
    (nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  let nextLabel: string | null = null;
  let highlight = false;
  if (card.learned) {
    nextLabel = t("cards.learned");
  } else if (diffDays <= 0) {
    nextLabel = t("cards.nextToday");
    highlight = true;
  } else if (diffDays === 1) {
    nextLabel = t("cards.nextTomorrow");
  } else {
    nextLabel = t("cards.nextDays", { n: diffDays });
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
