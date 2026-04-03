import { createClient } from "@/lib/supabase/server";
import { ReviewSession } from "./review-session";

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user settings for daily limit
  const { data: settings } = await supabase
    .from("user_settings")
    .select("daily_limit")
    .eq("user_id", user.id)
    .single();

  const limit = settings?.daily_limit ?? 20;

  // Get due cards
  const { data: cards } = await supabase
    .from("flashcards")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .eq("learned", false)
    .lte("sm2_next_review", new Date().toISOString())
    .limit(limit);

  return <ReviewSession initialCards={cards ?? []} />;
}
