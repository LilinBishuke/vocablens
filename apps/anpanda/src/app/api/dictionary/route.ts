import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface DictMeaning {
  partOfSpeech?: string;
  definitions?: { definition?: string; example?: string }[];
}

const JA_WORD_RE =
  /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々〆ーｰ〜・]{1,30}$/u;

const LANG_LABEL: Record<string, string> = {
  ja: "日本語",
  en: "英語",
  zh: "中国語（簡体字）",
  ko: "韓国語",
};

/** 日本語単語のプレビュー取得（AI。Groq → DeepSeek → Gemini フォールバック） */
async function lookupJapanese(
  word: string,
  targetLang: string
): Promise<{
  found: boolean;
  phonetic: string | null;
  translation: string | null;
  definition: { pos: string; meanings: { en: string; ja: string; examples: string[] }[] } | null;
} | null> {
  const groqKey = process.env.GROQ_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!groqKey && !deepseekKey && !geminiKey) return null;

  const target = LANG_LABEL[targetLang] ?? "英語";
  const prompt = `日本語学習アプリの辞書エディターとして、日本語の単語「${word}」の情報を JSON だけで返してください。説明文やコードブロックは不要です。
スキーマ:
{
  "valid": 実在する日本語の単語なら true、そうでなければ false,
  "reading": "読み仮名（ひらがな）",
  "translation": "${target}での代表的な訳（簡潔に）",
  "pos": "品詞（${target}で。例: 名詞 / 動詞 / 形容詞）",
  "meaning": "意味の簡潔な説明（${target}で1文）"
}`;

  async function callCompat(url: string, model: string, apiKey: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" ? text : null;
  }

  async function callGemini(apiKey: string) {
    const url = apiKey.startsWith("AQ.")
      ? "https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent"
      : "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  }

  let text: string | null = null;
  if (groqKey) {
    text = await callCompat(
      "https://api.groq.com/openai/v1/chat/completions",
      "openai/gpt-oss-120b",
      groqKey
    );
  }
  if (!text && deepseekKey) {
    text = await callCompat(
      "https://api.deepseek.com/chat/completions",
      "deepseek-chat",
      deepseekKey
    );
  }
  if (!text && geminiKey) {
    text = await callGemini(geminiKey);
  }
  if (!text) return null;

  try {
    const p = JSON.parse(text);
    if (!p.valid) return { found: false, phonetic: null, translation: null, definition: null };
    return {
      found: true,
      phonetic: typeof p.reading === "string" ? p.reading : null,
      translation: typeof p.translation === "string" ? p.translation : null,
      definition: {
        pos: typeof p.pos === "string" ? p.pos : "",
        meanings:
          typeof p.meaning === "string" && p.meaning
            ? [{ en: p.meaning, ja: "", examples: [] }]
            : [],
      },
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/dictionary?word=xxx&lang=en|ja
 * en: 無料辞書API (dictionaryapi.dev) + 翻訳 (MyMemory) をサーバー側で引き、
 *     flashcards.definition と同じ形に整形して返す。
 * ja: AIで読み仮名・訳・品詞のプレビューを生成して返す。
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
  const lang = searchParams.get("lang") === "ja" ? "ja" : "en";

  if (lang === "ja") {
    const jaWord = (searchParams.get("word") ?? "").trim();
    if (!jaWord || !JA_WORD_RE.test(jaWord)) {
      return NextResponse.json({ error: "invalid word" }, { status: 400 });
    }
    const { data: settings } = await supabase
      .from("user_settings")
      .select("translation_lang")
      .eq("user_id", user.id)
      .single();
    const result = await lookupJapanese(jaWord, settings?.translation_lang ?? "en");
    if (!result) {
      return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
    }
    return NextResponse.json({ word: jaWord, ...result });
  }

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
