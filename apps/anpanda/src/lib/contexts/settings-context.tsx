"use client";

import { createContext, useContext } from "react";

interface AppSettings {
  level_system: string;
  auto_play_audio: boolean;
  translation_lang: string;
  show_level: boolean;
}

const defaults: AppSettings = {
  level_system: "5",
  auto_play_audio: true,
  translation_lang: "ja",
  show_level: true,
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
