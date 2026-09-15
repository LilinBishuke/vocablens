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
  conjugations: { label: string; value: string }[];
  synonyms: { word: string; ja: string; diff: string }[];
  antonyms: { word: string; ja: string }[];
}

const JA_WORD_RE =
  /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々〆ーｰ〜・]{1,30}$/u;

const LANG_LABEL: Record<string, string> = {
  ja: "日本語",
  en: "英語",
  zh: "中国語（簡体字）",
  ko: "韓国語",
};

/** 日本語単語用プロンプト。意味・説明は targetLang（翻訳言語設定）で生成する */
function buildPromptJa(word: string, targetLang: string): string {
  const target = LANG_LABEL[targetLang] ?? "英語";
  return `あなたは日本語学習アプリの辞書エディターです。日本語の単語「${word}」について、${target}話者の日本語学習者向けの情報を JSON だけで返してください。説明文やコードブロックは不要です。

次のスキーマに厳密に従うこと:
{
  "level": 1〜5の整数（JLPT基準: 1=N5, 2=N4, 3=N3, 4=N2, 5=N1）,
  "translation": "${target}での代表的な訳（簡潔に）",
  "pos": "主な品詞（${target}で。例: 名詞 / 動詞 / 形容詞）",
  "meanings": [{"en": "${target}での意味の説明", "ja": "やさしい日本語での言い換え"}] （意味が複数あれば重要順に最大4件）,
  "etymology": "語源・漢字の成り立ちの解説（${target}で1〜2文。漢字の意味の分解があれば示す）",
  "grammar": "文法・使い方（${target}で1〜2文。活用の型、よく使う助詞や共起表現）",
  "slang": "口語・俗語での用法（あれば${target}で1〜2文、なければ null）",
  "examples": [{"en": "自然な日本語の例文", "ja": "その${target}訳"}] （2件。日常で使う自然な文）,
  "phonetic": "読み仮名（ひらがな。例: きぼう）",
  "conjugations": [{"label": "活用形の名前（${target}で）", "value": "その形"}] （動詞なら ます形/て形/た形/ない形/可能形、い形容詞なら 過去形/否定形。活用しない語は []）,
  "synonyms": [{"word": "日本語の類義語", "ja": "${target}訳", "diff": "見出し語との使い分け・ニュアンスの違い（${target}で1文）"}] （重要順に最大3件。なければ []）,
  "antonyms": [{"word": "日本語の反対語", "ja": "${target}訳"}] （最大3件。なければ []）
}`;
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
  "phonetic": "IPA発音記号（例: /əˈfɪnɪti/。不明なら null）,
  "conjugations": [{"label": "変化の種類", "value": "その形"}] （動詞なら 過去形/過去分詞/現在分詞/三単現、形容詞・副詞なら 比較級/最上級、名詞なら不規則な複数形のみ。変化しない語は []）,
  "synonyms": [{"word": "同義語", "ja": "日本語訳", "diff": "見出し語とのニュアンス・使い分けの違い（日本語1文で簡潔に）"}] （重要順に最大3件。なければ []）,
  "antonyms": [{"word": "反対語", "ja": "日本語訳"}] （最大3件。なければ []）
}`;
}

async function callGemini(
  word: string,
  apiKey: string,
  prompt: string
): Promise<EnrichPayload | null> {
  const res = await fetch(geminiUrl(apiKey), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
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
  return parseEnrichJson(text, word);
}

// OpenAI互換API (Groq / DeepSeek)。JSONモードでスキーマ崩れを抑止
interface CompatOpts {
  url: string;
  model: string;
  label: string;
}

const GROQ_OPTS: CompatOpts = {
  url: "https://api.groq.com/openai/v1/chat/completions",
  model: "openai/gpt-oss-120b",
  label: "groq",
};

const DEEPSEEK_OPTS: CompatOpts = {
  url: "https://api.deepseek.com/chat/completions",
  model: "deepseek-chat",
  label: "deepseek",
};

async function callOpenAICompat(
  word: string,
  apiKey: string,
  opts: CompatOpts,
  prompt: string
): Promise<EnrichPayload | null> {
  const res = await fetch(opts.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`[enrich] ${opts.label} ${res.status} for "${word}": ${errBody.slice(0, 500)}`);
    return null;
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    console.error(`[enrich] ${opts.label} empty content for "${word}": ${JSON.stringify(data).slice(0, 400)}`);
    return null;
  }
  return parseEnrichJson(text, word);
}

function parseEnrichJson(text: string, word: string): EnrichPayload | null {
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
      conjugations: Array.isArray(p.conjugations)
        ? p.conjugations
            .filter(
              (c: { label?: unknown; value?: unknown }) =>
                typeof c?.label === "string" && c.label && typeof c?.value === "string" && c.value
            )
            .slice(0, 6)
            .map((c: { label: string; value: string }) => ({
              label: c.label,
              value: c.value,
            }))
        : [],
      synonyms: Array.isArray(p.synonyms)
        ? p.synonyms
            .filter(
              (s: { word?: unknown }) => typeof s?.word === "string" && s.word
            )
            .slice(0, 3)
            .map((s: { word: string; ja?: string; diff?: string }) => ({
              word: s.word,
              ja: typeof s.ja === "string" ? s.ja : "",
              diff: typeof s.diff === "string" ? s.diff : "",
            }))
        : [],
      antonyms: Array.isArray(p.antonyms)
        ? p.antonyms
            .filter(
              (a: { word?: unknown }) => typeof a?.word === "string" && a.word
            )
            .slice(0, 3)
            .map((a: { word: string; ja?: string }) => ({
              word: a.word,
              ja: typeof a.ja === "string" ? a.ja : "",
            }))
        : [],
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
 * AI（Groq 優先 → DeepSeek → Gemini フォールバック）+ 辞書APIで単語情報を生成し、該当カードを更新して返す。
 * GROQ_API_KEY / DEEPSEEK_API_KEY / GEMINI_API_KEY すべて未設定時は 501。
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!groqKey && !deepseekKey && !geminiKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }

  let word = "";
  let language: "en" | "ja" = "en";
  try {
    const body = await request.json();
    language = body?.language === "ja" ? "ja" : "en";
    word = String(body?.word ?? "").trim();
    if (language === "en") word = word.toLowerCase();
  } catch {
    // fallthrough
  }
  const validWord =
    language === "ja" ? JA_WORD_RE.test(word) : /^[a-z][a-z' -]{0,49}$/.test(word);
  if (!word || !validWord) {
    return NextResponse.json({ error: "invalid word" }, { status: 400 });
  }

  // 日本語モードは意味の言語を翻訳言語設定に合わせる
  let prompt: string;
  if (language === "ja") {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("translation_lang")
      .eq("user_id", user.id)
      .single();
    prompt = buildPromptJa(word, settings?.translation_lang ?? "en");
  } else {
    prompt = buildPrompt(word);
  }

  const [primary, dictPhonetic] = await Promise.all([
    groqKey
      ? callOpenAICompat(word, groqKey, GROQ_OPTS, prompt)
      : deepseekKey
        ? callOpenAICompat(word, deepseekKey, DEEPSEEK_OPTS, prompt)
        : callGemini(word, geminiKey!, prompt),
    language === "en" ? fetchDictPhonetic(word) : Promise.resolve(null),
  ]);

  // 優先プロバイダが失敗した場合のフォールバック (DeepSeek → Gemini の順)
  let ai = primary;
  if (!ai && groqKey && deepseekKey) {
    ai = await callOpenAICompat(word, deepseekKey, DEEPSEEK_OPTS, prompt);
  }
  if (!ai && (groqKey || deepseekKey) && geminiKey) {
    ai = await callGemini(word, geminiKey, prompt);
  }

  if (!ai) {
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }

  const phonetic = dictPhonetic ?? ai.phonetic;
  const definition = {
    pos: ai.pos ?? "",
    meanings: ai.meanings,
    etymology: ai.etymology ?? undefined,
    grammar: ai.grammar ?? undefined,
    slang: ai.slang ?? undefined,
    examples: ai.examples,
    conjugations: ai.conjugations,
    synonyms: ai.synonyms,
    antonyms: ai.antonyms,
  };

  // 該当カードを更新（存在すれば）
  const { data: existing } = await supabase
    .from("flashcards")
    .select("id, level, translation, phonetic, synonyms")
    .eq("user_id", user.id)
    .eq("word", word)
    .eq("language", language)
    .is("deleted_at", null)
    .single();

  if (existing) {
    await supabase
      .from("flashcards")
      .update({
        level: ai.level != null ? String(ai.level) : existing.level,
        translation: ai.translation ?? existing.translation,
        phonetic: phonetic ?? existing.phonetic,
        synonyms:
          ai.synonyms.length > 0
            ? ai.synonyms.map((s) => s.word)
            : existing.synonyms,
        definition,
      })
      .eq("id", existing.id);
  }

  return NextResponse.json({
    word,
    level: ai.level,
    translation: ai.translation,
    phonetic,
    definition,
    updated: Boolean(existing),
  });
}
