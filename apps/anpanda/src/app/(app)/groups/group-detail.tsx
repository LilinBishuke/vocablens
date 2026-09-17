"use client";

import Link from "next/link";
import { Header } from "@/components/layout";
import { WordRow } from "@/components/ui";
import { useT } from "@/lib/contexts/settings-context";

export interface GroupCard {
  id: string;
  word: string;
  translation: string | null;
  level: string | null;
  learned: boolean;
  sm2_next_review: string;
}

export function GroupDetail({
  title,
  cards,
  reviewHref,
}: {
  title: string;
  cards: GroupCard[];
  reviewHref: string;
}) {
  const t = useT();
  const now = new Date().toISOString();
  const dueCount = cards.filter(
    (c) => !c.learned && c.sm2_next_review <= now
  ).length;

  return (
    <>
      <Header
        variant="detail"
        title={
          title === "その他"
            ? t("groups.other")
            : title === "手動で追加"
              ? t("groups.manual")
              : title
        }
      />
      <div className="flex-1 space-y-4 px-page pb-8">
        <p className="text-xs text-text-secondary">
          {cards.length}
          {t("common.cardsUnit")} · {t("groups.due")} {dueCount}
          {t("common.cardsUnit")}
        </p>

        {dueCount > 0 && (
          <Link
            href={reviewHref}
            className="flex h-12 w-full items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-on-primary shadow-button-glow transition-all active:scale-[0.97]"
          >
            {t("groups.reviewThis", { n: dueCount })}
          </Link>
        )}

        <div className="flex flex-col gap-2">
          {cards.map((c) => (
            <WordRow
              key={c.id}
              word={c.word}
              translation={c.translation}
              level={c.level}
              rightLabel={
                c.learned
                  ? t("common.learned")
                  : c.sm2_next_review <= now
                    ? `${t("groups.next")}: ${t("detail.today")}`
                    : null
              }
              rightHighlight={!c.learned && c.sm2_next_review <= now}
            />
          ))}
          {cards.length === 0 && (
            <p className="py-8 text-center text-sm text-text-muted">
              {t("groups.empty")}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
