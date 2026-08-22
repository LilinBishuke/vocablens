"use client";

import { createContext, useContext } from "react";

interface AppSettings {
  level_system: string;
  auto_play_audio: boolean;
  translation_lang: string;
}

const defaults: AppSettings = {
  level_system: "5",
  auto_play_audio: true,
  translation_lang: "ja",
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
