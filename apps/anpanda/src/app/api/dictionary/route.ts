import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface DictMeaning {
  partOfSpeech?: string;
  definitions?: { definition?: string; example?: string }[];
}

/**
 * GET /api/dictionary?word=xxx
 * 無料辞書API (dictionaryapi.dev) + 翻訳 (MyMemory) をサーバー側で引き、
 * flashcards.definition と同じ形に整形して返す。
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const word = (searchParams.get("word") ?? "").trim().toLowerCase();
  if (!word || !/^[a-z][a-z' -]{0,49}$/.test(word)) {
    return NextResponse.json({ error: "invalid word" }, { status: 400 });
  }

  const [dictRes, transRes] = await Promise.allSettled([
    fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 60 * 60 * 24 * 7 } }
    ),
    fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|ja`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 60 * 60 * 24 * 7 } }
    ),
  ]);

  let phonetic: string | null = null;
  let definition: {
    pos: string;
    meanings: { en: string; ja: string; examples: string[] }[];
  } | null = null;
  let found = false;

  if (dictRes.status === "fulfilled" && dictRes.value.ok) {
    try {
      const data = await dictRes.value.json();
      const entry = Array.isArray(data) ? data[0] : null;
      if (entry) {
        found = true;
        phonetic =
          entry.phonetic ??
          entry.phonetics?.find((p: { text?: string }) => p?.text)?.text ??
          null;
        const meanings: DictMeaning[] = entry.meanings ?? [];
        definition = {
          pos: meanings[0]?.partOfSpeech ?? "",
          meanings: meanings.flatMap((m) =>
            (m.definitions ?? []).slice(0, 2).map((d) => ({
              en: d.definition ?? "",
              ja: "",
              examples: d.example ? [d.example] : [],
            }))
          ),
        };
      }
    } catch {
      // 整形失敗は null のまま
    }
  }

  let translation: string | null = null;
  if (transRes.status === "fulfilled" && transRes.value.ok) {
    try {
      const data = await transRes.value.json();
      const t = data?.responseData?.translatedText;
      if (typeof t === "string" && t && t.toLowerCase() !== word) {
        translation = t;
      }
    } catch {
      // 翻訳失敗は null のまま
    }
  }

  return NextResponse.json({ word, found, phonetic, translation, definition });
}
