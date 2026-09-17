"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSettings, useT } from "@/lib/contexts/settings-context";

/**
 * ホーム上部の学習言語切替（英語 / 日本語）。
 * user_settings.learning_language を更新して全画面を再取得する。
 */
export function LanguageModeToggle() {
  const router = useRouter();
  const t = useT();
  const { learning_language } = useSettings();
  const [pending, setPending] = useState<string | null>(null);
  const current = pending ?? learning_language;

  async function switchTo(lang: "en" | "ja") {
    if (lang === current) return;
    setPending(lang);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("user_settings")
      .update({ learning_language: lang })
      .eq("user_id", user.id);
    if (error) {
      setPending(null);
      alert(t("common.dbUpdateError"));
      return;
    }
    router.refresh();
  }

  const OPTIONS: { value: "en" | "ja"; label: string }[] = [
    { value: "en", label: t("common.langEn") },
    { value: "ja", label: t("common.langJa") },
  ];

  return (
    <div className="glass-card flex rounded-chip p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => switchTo(o.value)}
          className={`flex-1 rounded-chip px-4 py-1.5 text-[13px] transition-all cursor-pointer ${
            current === o.value
              ? "bg-primary font-semibold text-on-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
