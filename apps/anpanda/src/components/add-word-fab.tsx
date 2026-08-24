"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/contexts/settings-context";

interface LookupResult {
  word: string;
  found: boolean;
  phonetic: string | null;
  translation: string | null;
  definition: {
    pos: string;
    meanings: { en: string; ja: string; examples: string[] }[];
  } | null;
}

type CardType = "vocab" | "idiom" | "slang";

/** ホーム右下のフローティング＋ボタンと単語追加シート */
export function AddWordFab() {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [looking, setLooking] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedWord, setSavedWord] = useState("");
  const [generating, setGenerating] = useState(false);
  const [cardType, setCardType] = useState<CardType>("vocab");

  const TYPE_OPTIONS: { value: CardType; label: string }[] = [
    { value: "vocab", label: t("cards.typeVocab") },
    { value: "idiom", label: t("cards.typeIdiom") },
    { value: "slang", label: t("cards.typeSlang") },
  ];

  function reset() {
    setInput("");
    setResult(null);
    setError("");
    setLooking(false);
    setSaving(false);
    setSavedWord("");
    setCardType("vocab");
  }

  async function handleLookup() {
    const word = input.trim().toLowerCase();
    if (!word) return;
    if (!/^[a-z][a-z' -]{0,49}$/.test(word)) {
      setError("英単語を入力してください");
      return;
    }
    setLooking(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
      if (!res.ok) throw new Error();
      const data: LookupResult = await res.json();
      setResult(data);
      if (!data.found && !data.translation) {
        setError("見つかりませんでした。スペルを確認してください");
        setResult(null);
      }
    } catch {
      setError("検索に失敗しました。通信環境を確認してください");
    } finally {
      setLooking(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("ログインが必要です");
      setSaving(false);
      return;
    }
    const { error: err } = await supabase.from("flashcards").upsert(
      {
        user_id: user.id,
        word: result.word,
        phonetic: result.phonetic,
        translation: result.translation,
        definition: result.definition,
        type: cardType,
        source_type: null,
        source_title: "手動で追加",
      },
      { onConflict: "user_id,word", ignoreDuplicates: false }
    );
    if (err) {
      setError("保存に失敗しました。もう一度お試しください");
      setSaving(false);
      return;
    }
    setSaving(false);
    setResult(null);
    setInput("");

    // AIで語源・文法・例文まで自動生成（キー未設定時は静かにスキップ）
    setGenerating(true);
    try {
      await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: result.word }),
      });
    } catch {
      // 生成失敗でもカード自体は保存済み
    }
    setGenerating(false);
    setSavedWord(result.word);
    router.refresh();
  }

  const firstMeaning = result?.definition?.meanings?.[0];

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        aria-label="単語を追加"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-button-glow transition-transform active:scale-90 cursor-pointer"
      >
        <Plus size={26} strokeWidth={2.2} />
      </button>

      {/* Sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            aria-label="閉じる"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#0F1A14]/45"
          />
          <div className="animate-sheet-in glass-card relative rounded-t-[24px] px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-text-muted/40" />
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-text-primary">
                {t("home.addWord")}
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="text-text-muted cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-xs text-text-secondary">
              意味と発音は自動で取得されます
            </p>

            {/* input row */}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError("");
                  setSavedWord("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                placeholder="例: serendipity"
                autoCapitalize="none"
                autoCorrect="off"
                className="glass-card h-12 min-w-0 flex-1 rounded-button px-4 text-[15px] text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={handleLookup}
                disabled={looking || !input.trim()}
                aria-label="検索"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-button bg-primary text-on-primary shadow-button-glow transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                <Search size={19} />
              </button>
            </div>

            {error && <p className="mt-3 text-xs text-again">{error}</p>}
            {looking && (
              <p className="mt-3 text-xs text-text-muted">検索中...</p>
            )}
            {generating && (
              <p className="mt-3 rounded-button bg-primary/10 px-3 py-2.5 text-[13px] text-text-secondary">
                AIが意味・語源・例文を生成しています...
              </p>
            )}
            {savedWord && (
              <p className="mt-3 rounded-button bg-primary/10 px-3 py-2.5 text-[13px] font-medium text-primary-strong">
                「{savedWord}」を追加しました
              </p>
            )}

            {/* preview */}
            {result && (
              <div className="mt-4 space-y-3">
                <div className="glass-card rounded-card p-4">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-lg font-bold text-text-primary">
                      {result.word}
                    </span>
                    {result.phonetic && (
                      <span className="text-xs text-text-muted">
                        {result.phonetic}
                      </span>
                    )}
                  </div>
                  {result.translation && (
                    <p className="mt-1 text-sm font-medium text-text-primary">
                      {result.translation}
                    </p>
                  )}
                  {firstMeaning?.en && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
                      {firstMeaning.en}
                    </p>
                  )}
                </div>

                {/* 種類（vocab / idiom / slang） */}
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs text-text-secondary">
                    {t("home.addType")}
                  </span>
                  <div className="flex gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setCardType(opt.value)}
                        className={`rounded-chip px-3 py-[6px] text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                          cardType === opt.value
                            ? "bg-primary text-on-primary"
                            : "glass-card text-text-secondary"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex h-12 w-full items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-on-primary shadow-button-glow transition-all active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "追加中..." : "カードに追加"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
