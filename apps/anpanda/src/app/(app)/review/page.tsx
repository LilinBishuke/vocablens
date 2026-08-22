import { createClient } from "@/lib/supabase/server";
import { ReviewSession } from "./review-session";

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("daily_limit, new_cards_per_day")
    .eq("user_id", user.id)
    .single();

  const dailyLimit = settings?.daily_limit ?? 20;
  const newCardsPerDay = settings?.new_cards_per_day ?? 5;

  // New cards (never reviewed)
  const { data: newCards } = await supabase
    .from("flashcards")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .eq("learned", false)
    .eq("sm2_repetitions", 0)
    .order("created_at", { ascending: true })
    .limit(newCardsPerDay);

  const newCardCount = newCards?.length ?? 0;
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
