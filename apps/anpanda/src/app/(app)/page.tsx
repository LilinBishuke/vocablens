import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout";
import { HomeContent } from "./home-content";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [cardsRes, dueRes, learnedRes, historyRes, recentRes, puzzleRes] =
    await Promise.all([
      supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("deleted_at", null),
      supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .eq("learned", false)
        .lte("sm2_next_review", new Date().toISOString()),
      supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .eq("learned", true),
      supabase
        .from("review_history")
        .select("quality")
        .eq("user_id", user.id)
        .limit(500),
      supabase
        .from("flashcards")
        .select("id, word, translation, level, created_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("user_puzzles")
        .select("pieces_revealed, puzzle:puzzles(name, total_pieces)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single(),
    ]);

  const totalCards = cardsRes.count ?? 0;
  const dueCount = dueRes.count ?? 0;
  const learnedCount = learnedRes.count ?? 0;

  const reviews = historyRes.data ?? [];
  const correctCount = reviews.filter((r) => r.quality >= 3).length;
  const accuracyPercent =
    reviews.length > 0
      ? Math.round((correctCount / reviews.length) * 100)
      : 0;

  const recentWords = recentRes.data ?? [];

  // Active puzzle preview
  const puzzleData = puzzleRes.data as {
    pieces_revealed: number;
    puzzle: { name: string; total_pieces: number } | null;
  } | null;
  const activePuzzle =
    puzzleData?.puzzle
      ? {
          name: puzzleData.puzzle.name,
          piecesRevealed: puzzleData.pieces_revealed,
          totalPieces: puzzleData.puzzle.total_pieces,
        }
      : null;

  return (
    <>
      <Header variant="home" />
      <HomeContent
        stats={{ totalCards, dueCount, learnedCount, accuracyPercent }}
        recentWords={recentWords}
        activePuzzle={activePuzzle}
      />
    </>
  );
}
