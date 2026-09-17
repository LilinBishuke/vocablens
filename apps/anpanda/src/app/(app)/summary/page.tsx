import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout";
import { SummaryContent } from "./summary-content";
import { getT, normalizeLang } from "@/lib/i18n";

export default async function SummaryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: settingsData } = await supabase
    .from("user_settings")
    .select("display_lang, learning_language")
    .eq("user_id", user.id)
    .single();
  const lang = settingsData?.learning_language ?? "en";

  const [historyRes, cardsRes] = await Promise.all([
    supabase
      .from("review_history")
      .select("reviewed_at, is_correct, flashcards!inner(language)")
      .eq("user_id", user.id)
      .eq("flashcards.language", lang)
      .order("reviewed_at", { ascending: false })
      .limit(2000),
    supabase
      .from("flashcards")
      .select("level, source_title, source_type, learned")
      .eq("user_id", user.id)
      .eq("language", lang)
      .is("deleted_at", null),
  ]);
  const langRes = { data: settingsData };
  const t = getT(normalizeLang(langRes.data?.display_lang));

  const history = historyRes.data ?? [];
  const cards = cardsRes.data ?? [];

  // ---- 集計（すべて既存データから） ----
  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  const reviewedDays = new Set(
    history.map((h) => dayKey(new Date(h.reviewed_at)))
  );

  // ストリーク: 今日または昨日から連続何日か
  let streak = 0;
  const cursor = new Date();
  if (!reviewedDays.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1); // 今日まだやっていなければ昨日起点
  }
  while (reviewedDays.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // 直近7日（今日含む）の日別復習数
  const weekly: { label: string; count: number; isToday: boolean }[] = [];
  const dow = t("summary.dowList").split(",");
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    weekly.push({
      label: dow[d.getDay()],
      count: history.filter((h) => dayKey(new Date(h.reviewed_at)) === key)
        .length,
      isToday: i === 0,
    });
  }
  const weekTotal = weekly.reduce((s, w) => s + w.count, 0);

  const total = cards.length;
  const learned = cards.filter((c) => c.learned).length;
  const correct = history.filter((h) => h.is_correct).length;
  const accuracy =
    history.length > 0 ? Math.round((correct / history.length) * 100) : 0;

  // 難易度内訳（数値レベルのみ）
  const levelCounts = [1, 2, 3, 4, 5].map(
    (lv) => cards.filter((c) => Number(c.level) === lv).length
  );

  // よく学んでいる出典 上位3件
  const bySource = new Map<string, number>();
  for (const c of cards) {
    const raw = c.source_title || "その他";
    const key =
      raw === "その他"
        ? t("groups.other")
        : raw === "手動で追加"
          ? t("groups.manual")
          : raw;
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
  }
  const topSources = [...bySource.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <>
      <Header variant="detail" title={t("summary.title")} />
      <SummaryContent
        streak={streak}
        weekly={weekly}
        weekTotal={weekTotal}
        total={total}
        learned={learned}
        accuracy={accuracy}
        levelCounts={levelCounts}
        topSources={topSources}
      />
    </>
  );
}
