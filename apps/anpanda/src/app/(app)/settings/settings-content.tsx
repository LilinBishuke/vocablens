"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Download, Upload, Cloud } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { signOut } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";

interface UserSettings {
  theme: string;
  translation_lang: string;
  level_system: string;
  daily_limit: number;
  new_cards_per_day: number;
  reminder_enabled: boolean;
  reminder_time: string;
  auto_play_audio: boolean;
}

interface Props {
  email: string;
  settings: UserSettings | null;
  userId: string;
}

const themeLabels: Record<string, string> = {
  system: "システム",
  light: "ライト",
  dark: "ダーク",
};

export function SettingsContent({ email, settings, userId }: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const s = settings ?? {
    theme: "system",
    translation_lang: "ja",
    level_system: "5",
    daily_limit: 20,
    new_cards_per_day: 5,
    reminder_enabled: false,
    reminder_time: "20:00",
    auto_play_audio: true,
  };

  async function updateSetting(key: string, value: unknown) {
    const supabase = createClient();
    await supabase
      .from("user_settings")
      .update({ [key]: value })
      .eq("user_id", userId);
    router.refresh();
  }

  function cycleTheme() {
    const order: ("system" | "light" | "dark")[] = ["system", "light", "dark"];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    setTheme(next);
    updateSetting("theme", next);
  }

  async function handleImportVocabLens(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus("読み込み中...");
    try {
      const text = await file.text();
      const cards = JSON.parse(text);
      const res = await fetch("/api/import-vocablens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cards),
      });
      const data = await res.json();
      if (data.error) {
        setImportStatus(`エラー: ${data.error}`);
      } else {
        setImportStatus(`✓ ${data.imported}件インポート（${data.skipped}件スキップ）`);
        router.refresh();
      }
    } catch {
      setImportStatus("ファイルの読み込みに失敗しました");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleExport() {
    const supabase = createClient();
    const { data: cards } = await supabase
      .from("flashcards")
      .select("word, phonetic, translation, level, type, learned, created_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (!cards || cards.length === 0) {
      alert("エクスポートするカードがありません");
      return;
    }

    const header = "word,phonetic,translation,level,type,learned,created_at";
    const rows = cards.map((c) =>
      [
        `"${c.word}"`,
        `"${c.phonetic ?? ""}"`,
        `"${c.translation ?? ""}"`,
        c.level ?? "",
        c.type ?? "",
        c.learned ? "true" : "false",
        c.created_at,
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anpan-cards-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Header */}
      <div className="flex h-14 items-center px-page shrink-0">
        <h1 className="text-lg font-bold text-text-primary">設定</h1>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-page pb-4">
        {/* Account */}
        <SettingsSection label="アカウント">
          <div className="flex items-center justify-between rounded-button border border-surface-border bg-surface px-4 py-4">
            <span className="text-sm text-text-primary">{email}</span>
            <button
              onClick={() => signOut()}
              className="text-[13px] font-medium text-again cursor-pointer"
            >
              ログアウト
            </button>
          </div>
        </SettingsSection>

        {/* Display */}
        <SettingsSection label="表示設定">
          <SettingsCard>
            <SettingsRow
              label="テーマ"
              value={themeLabels[theme] ?? "システム"}
              onClick={cycleTheme}
            />
            <Divider />
            <SettingsRow label="翻訳言語" value="日本語" />
            <Divider />
            <SettingsRow label="分類システム" value={`${s.level_system}段階`} />
          </SettingsCard>
        </SettingsSection>

        {/* Review */}
        <SettingsSection label="復習設定">
          <SettingsCard>
            <SettingsRow label="1日の上限" value={`${s.daily_limit}枚`} />
            <Divider />
            <SettingsRow
              label="新規カード"
              value={`${s.new_cards_per_day}枚/日`}
            />
            <Divider />
            <SettingsRow
              label="リマインダー"
              value={s.reminder_time?.slice(0, 5) ?? "20:00"}
              highlight
            />
            <Divider />
            <SettingsToggleRow
              label="音声自動再生"
              enabled={s.auto_play_audio}
              onToggle={(v) => updateSetting("auto_play_audio", v)}
            />
          </SettingsCard>
        </SettingsSection>

        {/* Data */}
        <SettingsSection label="データ">
          <SettingsCard>
            <button
              onClick={handleExport}
              className="flex w-full items-center gap-3 px-4 py-3.5 cursor-pointer"
            >
              <Download size={18} className="text-text-muted" />
              <span className="text-sm text-text-primary">
                エクスポート（CSV）
              </span>
            </button>
            <Divider />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-between px-4 py-3.5 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Upload size={18} className="text-text-muted" />
                <span className="text-sm text-text-primary">
                  VocabLensからインポート
                </span>
              </div>
              {importStatus && (
                <span className="text-[13px] text-text-secondary">{importStatus}</span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportVocabLens}
            />
            <Divider />
            <button
              onClick={async () => {
                const supabase = createClient();
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                if (token) {
                  await navigator.clipboard.writeText(token);
                  setImportStatus("トークンをコピーしました");
                  setTimeout(() => setImportStatus(""), 3000);
                }
              }}
              className="flex w-full items-center justify-between px-4 py-3.5 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Cloud size={18} className="text-text-muted" />
                <span className="text-sm text-text-primary">
                  Chrome拡張連携トークンをコピー
                </span>
              </div>
              {importStatus === "トークンをコピーしました" && (
                <span className="text-[13px] font-medium text-good">コピー済み ✓</span>
              )}
            </button>
          </SettingsCard>
        </SettingsSection>
      </div>
    </>
  );
}

function SettingsSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
    </div>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-button border border-surface-border bg-surface">
      {children}
    </div>
  );
}

function SettingsRow({
  label,
  value,
  highlight = false,
  onClick,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`flex w-full items-center justify-between px-4 py-3.5 ${onClick ? "cursor-pointer" : ""}`}
    >
      <span className="text-sm text-text-primary">{label}</span>
      <span
        className={`text-sm ${highlight ? "font-medium text-primary" : "text-text-secondary"}`}
      >
        {value}
      </span>
    </Comp>
  );
}

function Divider() {
  return <div className="h-px bg-slate-100 dark:bg-slate-700" />;
}

function SettingsToggleRow({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-text-primary">{label}</span>
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative h-[22px] w-10 rounded-full transition-colors cursor-pointer ${
          enabled ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-[20px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
