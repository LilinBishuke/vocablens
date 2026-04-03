import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PuzzleProgressContent } from "./puzzle-progress-content";

export default async function PuzzleProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: puzzle }, { data: userPuzzle }] = await Promise.all([
    supabase.from("puzzles").select("*").eq("id", id).single(),
    supabase
      .from("user_puzzles")
      .select("*")
      .eq("user_id", user.id)
      .eq("puzzle_id", id)
      .single(),
  ]);

  if (!puzzle) notFound();

  return (
    <PuzzleProgressContent
      puzzle={puzzle}
      piecesRevealed={userPuzzle?.pieces_revealed ?? 0}
    />
  );
}
