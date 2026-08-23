"use client";

import { createContext, useContext } from "react";
import { getT, normalizeLang } from "@/lib/i18n";

interface AppSettings {
  level_system: string;
  auto_play_audio: boolean;
  translation_lang: string;
  show_level: boolean;
  display_lang: string;
}

const defaults: AppSettings = {
  level_system: "5",
  auto_play_audio: true,
  translation_lang: "ja",
  show_level: true,
  display_lang: "ja",
};

const SettingsContext = createContext<AppSettings>(defaults);

export function SettingsProvider({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: Partial<AppSettings>;
}) {
  return (
    <SettingsContext.Provider value={{ ...defaults, ...settings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

/** 表示言語に応じた翻訳関数 */
export function useT() {
  const { display_lang } = useSettings();
  return getT(normalizeLang(display_lang));
}
