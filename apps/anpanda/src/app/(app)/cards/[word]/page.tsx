import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CardDetailContent } from "./card-detail-content";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ word: string }>;
}) {
  const { word } = await params;
  const decodedWord = decodeURIComponent(word);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: card } = await supabase
    .from("flashcards")
    .select("*")
    .eq("user_id", user.id)
    .eq("word", decodedWord)
    .is("deleted_at", null)
    .single();

  if (!card) notFound();

  // Get review stats for this card
  const { data: reviews } = await supabase
    .from("review_history")
    .select("quality")
    .eq("flashcard_id", card.id);

  const reviewCount = reviews?.length ?? 0;
  const correctCount = reviews?.filter((r) => r.quality >= 3).length ?? 0;
  const accuracy =
    reviewCount > 0 ? Math.round((correctCount / reviewCount) * 100) : 0;

  return (
    <CardDetailContent
      card={card}
      reviewCount={reviewCount}
      accuracy={accuracy}
    />
  );
}
