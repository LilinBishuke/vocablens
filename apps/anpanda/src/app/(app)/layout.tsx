import { createClient } from "@/lib/supabase/server";
import { TabBar } from "@/components/layout";
import { SettingsProvider } from "@/lib/contexts/settings-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let settings: Record<string, unknown> & { learning_language?: string } = {};
  let dueCount = 0;
  if (user) {
    const { data: settingsData } = await supabase
      .from("user_settings")
      .select(
        "level_system, auto_play_audio, translation_lang, show_level, display_lang, learning_language"
      )
      .eq("user_id", user.id)
      .single();
    if (settingsData) {
      settings = settingsData;
    } else {
      // learning_language 等の列が未追加の環境向けフォールバック
      const { data: fallback } = await supabase
        .from("user_settings")
        .select("level_system, auto_play_audio, translation_lang")
        .eq("user_id", user.id)
        .single();
      settings = fallback ?? {};
    }
    const lang = settings.learning_language ?? "en";
    const { count } = await supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("language", lang)
      .is("deleted_at", null)
      .eq("learned", false)
      .lte("sm2_next_review", new Date().toISOString());
    dueCount = count ?? 0;
  }

  return (
    <SettingsProvider settings={settings}>
      <div className="flex h-dvh flex-col">
        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
        <TabBar reviewCount={dueCount} />
      </div>
    </SettingsProvider>
  );
}
