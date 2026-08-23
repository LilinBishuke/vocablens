import { createClient } from "@/lib/supabase/server";
import { ReviewSession } from "./review-session";

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // settings と新規カードを並列取得（新規カードは上限最大値20で取り、後で絞る）
  const [settingsRes, newCardsRes] = await Promise.all([
    supabase
      .from("user_settings")
      .select("daily_limit, new_cards_per_day")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("learned", false)
      .eq("sm2_repetitions", 0)
      .order("created_at", { ascending: true })
      .limit(20),
  ]);
  const settings = settingsRes.data;
  const dailyLimit = settings?.daily_limit ?? 20;
  const newCardsPerDay = settings?.new_cards_per_day ?? 5;
  const newCards = (newCardsRes.data ?? []).slice(0, newCardsPerDay);

  const newCardCount = newCards.length;
  const reviewLimit = Math.max(0, dailyLimit - newCardCount);

  // Review cards (already started, now due)
  const { data: reviewCards } = await supabase
    .from("flashcards")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .eq("learned", false)
    .gt("sm2_repetitions", 0)
    .lte("sm2_next_review", new Date().toISOString())
    .order("sm2_next_review", { ascending: true })
    .limit(reviewLimit);

  // Reviews first, new cards at the end
  const allCards = [...(reviewCards ?? []), ...(newCards ?? [])];

  return <ReviewSession initialCards={allCards} />;
}
