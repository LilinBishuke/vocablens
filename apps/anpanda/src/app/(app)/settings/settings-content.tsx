"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Download, Upload, ChevronRight, Cloud, Sparkles } from "lucide-react";
import { Header } from "@/components/layout";
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
  show_level: boolean;
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
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  async function handleBulkEnrich() {
    if (bulkStatus) return;
    setBulkStatus("対象を確認中...");
    const supabase = createClient();
    const { data: cards } = await supabase
      .from("flashcards")
      .select("word, translation, level, definition")
      .eq("user_id", userId)
      .is("deleted_at", null);
    const targets = (cards ?? []).filter((c) => {
      const d = c.definition as { etymology?: string } | null;
      return !d?.etymology || !c.translation || !Number.isFinite(Number(c.level));
    });
    if (targets.length === 0) {
      setBulkStatus("すべて取得済みです");
      setTimeout(() => setBulkStatus(null), 3000);
      return;
    }
    let done = 0;
    for (const t of targets) {
      setBulkStatus(`生成中 ${done + 1}/${targets.length}...`);
      try {
        const res = await fetch("/api/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word: t.word }),
        });
        if (res.status === 501) {
          setBulkStatus("AI取得が未設定です");
          setTimeout(() => setBulkStatus(null), 4000);
          return;
        }
      } catch {
        // 個別失敗はスキップして続行
      }
      done++;
    }
    setBulkStatus(`完了（${done}枚）`);
    router.refresh();
    setTimeout(() => setBulkStatus(null), 4000);
  }

  const defaults: UserSettings = {
    theme: "system",
    translation_lang: "ja",
    level_system: "5",
    daily_limit: 20,
    new_cards_per_day: 5,
    reminder_enabled: false,
    reminder_time: "20:00",
    auto_play_audio: true,
    show_level: true,
  };

  const [s, setS] = useState<UserSettings>({ ...defaults, ...settings });
  const [exportLoading, setExportLoading] = useState(false);

  const langOptions = [
    { label: "日本語", value: "ja" },
    { label: "English", value: "en" },
    { label: "中文", value: "zh" },
    { label: "한국어", value: "ko" },
  ];

  const dailyLimitOptions = [
    { label: "10枚", value: "10" },
    { label: "20枚", value: "20" },
    { label: "30枚", value: "30" },
    { label: "50枚", value: "50" },
  ];

  const newCardsOptions = [
    { label: "3枚/日", value: "3" },
    { label: "5枚/日", value: "5" },
    { label: "10枚/日", value: "10" },
    { label: "20枚/日", value: "20" },
  ];

  const levelSystemOptions = [
    { label: "3段階", value: "3" },
    { label: "5段階", value: "5" },
  ];

  function updateSetting(key: string, value: unknown) {
    setS((prev) => ({ ...prev, [key]: value }));
    const supabase = createClient();
    supabase
      .from("user_settings")
      .update({ [key]: value })
      .eq("user_id", userId);
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
    setExportLoading(true);
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
    setExportLoading(false);
  }

  return (
    <>
      {/* Header */}
      <Header variant="page" title="設定" />

      <div className="flex-1 space-y-6 px-page pb-4">
        {/* プロフィール */}
        <div className="glass-card flex items-center gap-3.5 rounded-card px-4 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-on-primary">
            {email.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
            {email}
          </span>
        </div>

        {/* 学習 */}
        <SettingsSection label="学習">
          <SettingsCard>
            <SettingsPickerRow
              label="1日の上限"
              value={String(s.daily_limit)}
              options={dailyLimitOptions}
              onSelect={(v) => updateSetting("daily_limit", Number(v))}
            />
            <Divider />
            <SettingsPickerRow
              label="新規カード"
              value={String(s.new_cards_per_day)}
              options={newCardsOptions}
              onSelect={(v) => updateSetting("new_cards_per_day", Number(v))}
            />
            <Divider />
            <SettingsToggleRow
              label="リマインダー"
              enabled={s.reminder_enabled}
              onToggle={async (v) => {
                if (v && "Notification" in window) {
                  const permission = await Notification.requestPermission();
                  if (permission !== "granted") return;
                }
                updateSetting("reminder_enabled", v);
              }}
            />
            {s.reminder_enabled && (
              <>
                <Divider />
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-sm font-bold text-text-muted">
                    通知時刻
                  </span>
                  <input
                    type="time"
                    defaultValue={s.reminder_time?.slice(0, 5) ?? "20:00"}
                    onChange={(e) => updateSetting("reminder_time", e.target.value)}
                    className="text-sm font-medium text-primary bg-transparent border-none outline-none cursor-pointer"
                  />
                </div>
              </>
            )}
            <Divider />
            <SettingsToggleRow
              label="音声自動再生"
              enabled={s.auto_play_audio}
              onToggle={(v) => updateSetting("auto_play_audio", v)}
            />
          </SettingsCard>
        </SettingsSection>

        {/* 表示 */}
        <SettingsSection label="表示">
          <SettingsCard>
            <SettingsToggleRow
              label="難易度の表示"
              enabled={s.show_level}
              onToggle={(v) => updateSetting("show_level", v)}
            />
            <Divider />
            <SettingsRow
              label="テーマ"
              value={themeLabels[theme] ?? "システム"}
              onClick={cycleTheme}
            />
            <Divider />
            <SettingsPickerRow
              label="翻訳言語"
              value={s.translation_lang}
              options={langOptions}
              onSelect={(v) => updateSetting("translation_lang", v)}
            />
            <Divider />
            <SettingsPickerRow
              label="レベル表記"
              value={s.level_system}
              options={levelSystemOptions}
              onSelect={(v) => updateSetting("level_system", v)}
            />
          </SettingsCard>
        </SettingsSection>

        {/* Data */}
        <SettingsSection label="連携・データ">
          <SettingsCard>
            <button
              onClick={handleBulkEnrich}
              disabled={Boolean(bulkStatus)}
              className="flex w-full items-center justify-between px-4 py-3.5 cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-primary" />
                <span className="text-sm text-text-primary">
                  不足情報をAIで一括取得
                </span>
              </div>
              {bulkStatus && (
                <span className="text-[13px] text-text-secondary">{bulkStatus}</span>
              )}
            </button>
            <Divider />
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex w-full items-center gap-3 px-4 py-3.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} className="text-text-muted" />
              <span className="text-sm text-text-primary">
                {exportLoading ? "エクスポート中..." : "エクスポート（CSV）"}
              </span>
            </button>
            <Divider />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importStatus === "読み込み中..."}
              className="flex w-full items-center justify-between px-4 py-3.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* その他 */}
        <SettingsSection label="その他">
          <SettingsCard>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-text-primary">バージョン情報</span>
              <span className="text-[13px] text-text-muted">1.4.0</span>
            </div>
            <Divider />
            <button
              onClick={() => signOut()}
              className="flex w-full items-center px-4 py-3.5 cursor-pointer"
            >
              <span className="text-sm font-medium text-again">ログアウト</span>
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
    <div className="overflow-hidden glass-card rounded-button">
      {children}
    </div>
  );
}

function SettingsPickerRow({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3.5 cursor-pointer"
      >
        <span className="text-sm font-bold text-text-muted">
          {label}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-primary">
            {current?.label ?? value}
          </span>
          <ChevronRight
            size={15}
            className={`text-primary transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3.5 flex flex-wrap gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              className={`rounded-chip px-3.5 py-1.5 text-sm transition-colors cursor-pointer ${
                opt.value === value
                  ? "bg-primary text-on-primary font-medium"
                  : "bg-progress-bar text-text-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
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
      <span className="text-sm font-bold text-text-muted">{label}</span>
      <div className="flex items-center gap-1">
        <span
          className={`text-sm ${highlight || onClick ? "font-medium text-primary" : "text-text-secondary"}`}
        >
          {value}
        </span>
        {onClick && <ChevronRight size={15} className="text-primary -mr-1" />}
      </div>
    </Comp>
  );
}

function Divider() {
  return <div className="h-px bg-surface-border" />;
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
        className={`relative h-[28px] w-[50px] rounded-full transition-colors cursor-pointer ${
          enabled ? "bg-primary" : "bg-text-muted/35"
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: enabled ? 25 : 3,
            height: 22,
            width: 22,
            borderRadius: "50%",
            backgroundColor: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            transition: "left 0.2s ease",
          }}
        />
      </button>
    </div>
  );
}
