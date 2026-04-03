import { createClient } from "@/lib/supabase/server";
import { CardsContent } from "./cards-content";

export default async function CardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: cards, count } = await supabase
    .from("flashcards")
    .select("id, word, translation, level, learned, sm2_next_review, created_at", {
      count: "exact",
    })
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return <CardsContent cards={cards ?? []} totalCount={count ?? 0} />;
}
