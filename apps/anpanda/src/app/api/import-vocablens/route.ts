import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface VocabLensCard {
  word: string;
  translation?: string;
  context?: string;
  learned: boolean;
  createdAt: number;
  sm2: {
    repetitions: number;
    interval: number;
    easeFactor: number;
    nextReview: number;
    lastReview: number | null;
  };
  definition?: {
    phonetics?: { text?: string }[];
    meanings?: {
      partOfSpeech: string;
      definitions: { definition: string; example?: string }[];
    }[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cards: VocabLensCard[] = await request.json();

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ error: "No cards provided" }, { status: 400 });
    }

    // Fetch existing words to avoid duplicates
    const { data: existing } = await supabase
      .from("flashcards")
      .select("word")
      .eq("user_id", user.id)
      .is("deleted_at", null);

    const existingWords = new Set((existing ?? []).map((c) => c.word.toLowerCase()));

    const toInsert = cards
      .filter((c) => c.word && !existingWords.has(c.word.toLowerCase()))
      .map((c) => {
        const phonetic = c.definition?.phonetics?.find((p) => p.text)?.text ?? null;

        const definition = c.definition?.meanings?.length
          ? {
              pos: c.definition.meanings[0].partOfSpeech ?? "",
              meanings: c.definition.meanings.flatMap((m) =>
                m.definitions.slice(0, 2).map((d) => ({
                  en: d.definition,
                  ja: "",
                  examples: d.example ? [d.example] : [],
                }))
              ),
            }
          : null;

        return {
          user_id: user.id,
          word: c.word.toLowerCase().trim(),
          phonetic,
          translation: c.translation ?? null,
          definition,
          type: "vocab" as const,
          learned: c.learned,
          sm2_repetitions: c.sm2.repetitions,
          sm2_interval: c.sm2.interval,
          sm2_ease_factor: c.sm2.easeFactor,
          sm2_next_review: new Date(c.sm2.nextReview).toISOString(),
          sm2_last_review: c.sm2.lastReview
            ? new Date(c.sm2.lastReview).toISOString()
            : null,
          source_title: c.context ? c.context.slice(0, 200) : null,
          created_at: new Date(c.createdAt).toISOString(),
        };
      });

    if (toInsert.length === 0) {
      return NextResponse.json({ imported: 0, skipped: cards.length });
    }

    const { error } = await supabase.from("flashcards").insert(toInsert);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      imported: toInsert.length,
      skipped: cards.length - toInsert.length,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
