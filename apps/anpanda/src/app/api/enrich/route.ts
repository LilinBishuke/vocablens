import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// キー形式でエンドポイントを切替:
// - AIza...  → AI Studio (generativelanguage.googleapis.com)
// - AQ.xxx   → Vertex AI express mode (aiplatform.googleapis.com)
function geminiUrl(apiKey: string): string {
  if (apiKey.startsWith("AQ.")) {
    return "https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent";
  }
  return "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
}

interface EnrichPayload {
  level: number | null;
  translation: string | null;
  pos: string | null;
  meanings: { en: string; ja: string }[];
  etymology: string | null;
  grammar: string | null;
  slang: string | null;
  examples: { en: string; ja: string }[];
  phonetic: string | null;
}

function buildPrompt(word: string): string {
  return `あなたは英語学習アプリの辞書エディターです。英単語 "${word}" について、日本人学習者向けの情報を JSON だけで返してください。説明文やコードブロックは不要です。

次のスキーマに厳密に従うこと:
{
  "level": 1〜5の整数（難易度。1=中学基礎(A1-A2), 2=高校(B1), 3=大学・日常上級(B2), 4=ビジネス・新聞(C1), 5=専門・文学(C2)),
  "translation": "最も代表的な日本語訳（10文字以内目安）",
  "pos": "主な品詞（日本語。例: 名詞 / 動詞 / 形容詞。複数あれば「名詞・動詞」）",
  "meanings": [{"en": "簡潔な英語定義", "ja": "その意味の日本語訳"}] （意味が複数あれば重要順に最大4件）,
  "etymology": "語源の解説（日本語1〜2文。接頭辞・語根の分解があれば示す）",
  "grammar": "文法・使い方（日本語1〜2文。可算/不可算、自他動詞、よく使うコロケーションや前置詞）",
  "slang": "スラング・口語での用法（あれば日本語1〜2文、なければ null）",
  "examples": [{"en": "自然な例文", "ja": "その日本語訳"}] （2件。日常で使う自然な文）,
  "phonetic": "IPA発音記号（例: /əˈfɪnɪti/。不明なら null）
}`;
}

async function callGemini(word: string, apiKey: string): Promise<EnrichPayload | null> {
  const res = await fetch(geminiUrl(apiKey), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(word) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`[enrich] gemini ${res.status} for "${word}": ${errBody.slice(0, 500)}`);
    return null;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error(`[enrich] empty candidates for "${word}": ${JSON.stringify(data).slice(0, 400)}`);
    return null;
  }
  try {
    const p = JSON.parse(text);
    return {
      level:
        Number.isFinite(Number(p.level)) && p.level >= 1 && p.level <= 5
          ? Math.round(Number(p.level))
          : null,
      translation: typeof p.translation === "string" ? p.translation : null,
      pos: typeof p.pos === "string" ? p.pos : null,
      meanings: Array.isArray(p.meanings)
        ? p.meanings
            .filter(
              (m: { en?: unknown }) => typeof m?.en === "string" && m.en
            )
            .slice(0, 4)
            .map((m: { en: string; ja?: string }) => ({
              en: m.en,
              ja: typeof m.ja === "string" ? m.ja : "",
            }))
        : [],
      etymology: typeof p.etymology === "string" ? p.etymology : null,
      grammar: typeof p.grammar === "string" ? p.grammar : null,
      slang: typeof p.slang === "string" && p.slang ? p.slang : null,
      examples: Array.isArray(p.examples)
        ? p.examples
            .filter(
              (e: { en?: unknown }) => typeof e?.en === "string" && e.en
            )
            .slice(0, 3)
            .map((e: { en: string; ja?: string }) => ({
              en: e.en,
              ja: typeof e.ja === "string" ? e.ja : "",
            }))
        : [],
      phonetic: typeof p.phonetic === "string" ? p.phonetic : null,
    };
  } catch (e) {
    console.error(`[enrich] JSON parse failed for "${word}": ${String(e)} :: ${text.slice(0, 300)}`);
    return null;
  }
}

async function fetchDictPhonetic(word: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(6000), next: { revalidate: 60 * 60 * 24 * 7 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : null;
    return (
      entry?.phonetic ??
      entry?.phonetics?.find((p: { text?: string }) => p?.text)?.text ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * POST /api/enrich  { word }
 * Gemini + 辞書APIで単語情報を生成し、該当カードを更新して返す。
 * GEMINI_API_KEY 未設定時は 501。
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }

  let word = "";
  try {
    const body = await request.json();
    word = String(body?.word ?? "").trim().toLowerCase();
  } catch {
    // fallthrough
  }
  if (!word || !/^[a-z][a-z' -]{0,49}$/.test(word)) {
    return NextResponse.json({ error: "invalid word" }, { status: 400 });
  }

  const [gemini, dictPhonetic] = await Promise.all([
    callGemini(word, apiKey),
    fetchDictPhonetic(word),
  ]);

  if (!gemini) {
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }

  const phonetic = dictPhonetic ?? gemini.phonetic;
  const definition = {
    pos: gemini.pos ?? "",
    meanings: gemini.meanings,
    etymology: gemini.etymology ?? undefined,
    grammar: gemini.grammar ?? undefined,
    slang: gemini.slang ?? undefined,
    examples: gemini.examples,
  };

  // 該当カードを更新（存在すれば）
  const { data: existing } = await supabase
    .from("flashcards")
    .select("id, level, translation, phonetic")
    .eq("user_id", user.id)
    .eq("word", word)
    .is("deleted_at", null)
    .single();

  if (existing) {
    await supabase
      .from("flashcards")
      .update({
        level: gemini.level != null ? String(gemini.level) : existing.level,
        translation: gemini.translation ?? existing.translation,
        phonetic: phonetic ?? existing.phonetic,
        definition,
      })
      .eq("id", existing.id);
  }

  return NextResponse.json({
    word,
    level: gemini.level,
    translation: gemini.translation,
    phonetic,
    definition,
    updated: Boolean(existing),
  });
}
