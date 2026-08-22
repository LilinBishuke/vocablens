import { createClient } from "@/lib/supabase/server";
import { TabBar } from "@/components/layout";
import { SettingsProvider } from "@/lib/contexts/settings-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let settings = {};
  if (user) {
    const { data } = await supabase
      .from("user_settings")
      .select("level_system, auto_play_audio, translation_lang")
      .eq("user_id", user.id)
      .single();
    settings = data ?? {};
  }

  return (
    <SettingsProvider settings={settings}>
      <div className="flex h-dvh flex-col">
        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
        <TabBar />
      </div>
    </SettingsProvider>
  );
}
