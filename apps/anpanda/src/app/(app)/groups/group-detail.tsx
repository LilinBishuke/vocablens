import Link from "next/link";
import { Header } from "@/components/layout";
import { WordRow } from "@/components/ui";

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
  const now = new Date().toISOString();
  const dueCount = cards.filter(
    (c) => !c.learned && c.sm2_next_review <= now
  ).length;

  return (
    <>
      <Header variant="detail" title={title} />
      <div className="flex-1 space-y-4 px-page pb-8">
        <p className="text-xs text-text-secondary">
          {cards.length}枚 · 復習待ち {dueCount}枚
        </p>

        {dueCount > 0 && (
          <Link
            href={reviewHref}
            className="flex h-12 w-full items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-on-primary shadow-button-glow transition-all active:scale-[0.97]"
          >
            このグループを復習する（{dueCount}枚）
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
                  ? "覚えた"
                  : c.sm2_next_review <= now
                    ? "次: 今日"
                    : null
              }
              rightHighlight={!c.learned && c.sm2_next_review <= now}
            />
          ))}
          {cards.length === 0 && (
            <p className="py-8 text-center text-sm text-text-muted">
              このグループにはまだカードがありません
            </p>
          )}
        </div>
      </div>
    </>
  );
}
