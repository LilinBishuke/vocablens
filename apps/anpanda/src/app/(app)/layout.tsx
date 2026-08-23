import { createClient } from "@/lib/supabase/server";
import { TabBar } from "@/components/layout";
import { SettingsProvider } from "@/lib/contexts/settings-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let settings = {};
  let dueCount = 0;
  if (user) {
    const [settingsRes, dueRes] = await Promise.all([
      supabase
        .from("user_settings")
        .select("level_system, auto_play_audio, translation_lang, show_level")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .eq("learned", false)
        .lte("sm2_next_review", new Date().toISOString()),
    ]);
    if (settingsRes.data) {
      settings = settingsRes.data;
    } else {
      // show_level 列が未追加の環境向けフォールバック
      const { data: fallback } = await supabase
        .from("user_settings")
        .select("level_system, auto_play_audio, translation_lang")
        .eq("user_id", user.id)
        .single();
      settings = fallback ?? {};
    }
    dueCount = dueRes.count ?? 0;
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
