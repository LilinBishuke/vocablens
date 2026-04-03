import { createClient } from "@/lib/supabase/server";
import { PuzzleSelectContent } from "./puzzle-select-content";

export default async function PuzzleSelectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: puzzles }, { data: userPuzzles }] = await Promise.all([
    supabase.from("puzzles").select("*").order("sort_order"),
    supabase.from("user_puzzles").select("*").eq("user_id", user.id),
  ]);

  return (
    <PuzzleSelectContent
      puzzles={puzzles ?? []}
      userPuzzles={userPuzzles ?? []}
      userId={user.id}
    />
  );
}
