const LEVEL_DOTS = [
  "bg-level-1",
  "bg-level-2",
  "bg-level-3",
  "bg-level-4",
  "bg-level-5",
];

interface Props {
  streak: number;
  weekly: { label: string; count: number; isToday: boolean }[];
  weekTotal: number;
  total: number;
  learned: number;
  accuracy: number;
  levelCounts: number[];
  topSources: [string, number][];
}

export function SummaryContent({
  streak,
  weekly,
  weekTotal,
  total,
  learned,
  accuracy,
  levelCounts,
  topSources,
}: Props) {
  const maxWeekly = Math.max(1, ...weekly.map((w) => w.count));
  const levelTotal = levelCounts.reduce((s, n) => s + n, 0);

  return (
    <div className="flex-1 space-y-4 px-page pb-8">
      {/* ストリーク */}
      <div className="glass-card rounded-card-lg p-5">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[40px] font-bold leading-none text-primary">
            {streak}
          </span>
          <span className="text-sm font-medium text-text-primary">
            日連続で学習中
          </span>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          {streak > 0
            ? "この調子で続けましょう"
            : "今日の復習からストリークを始めましょう"}
        </p>
      </div>

      {/* 今週の復習 */}
      <div className="glass-card rounded-card-lg p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold text-text-primary">
            今週の復習
          </h2>
          <span className="text-[13px] font-semibold text-primary">
            {weekTotal}枚
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-2">
          {weekly.map((w, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`w-3.5 rounded-[5px] transition-all ${
                  w.isToday ? "bg-primary" : "bg-primary/30"
                }`}
                style={{ height: 8 + Math.round((w.count / maxWeekly) * 56) }}
              />
              <span className="text-[9px] text-text-muted">{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 累計 */}
      <div className="flex gap-2.5">
        {[
          [String(total), "カード"],
          [String(learned), "覚えた"],
          [`${accuracy}%`, "正解率"],
        ].map(([v, l]) => (
          <div
            key={l}
            className="glass-card flex flex-1 flex-col items-center gap-0.5 rounded-card py-3.5"
          >
            <span className="text-xl font-bold text-text-primary">{v}</span>
            <span className="text-[10px] text-text-muted">{l}</span>
          </div>
        ))}
      </div>

      {/* 難易度の内訳 */}
      {levelTotal > 0 && (
        <div className="glass-card rounded-card-lg p-5">
          <h2 className="text-[13px] font-semibold text-text-primary">
            難易度の内訳
          </h2>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-chip">
            {levelCounts.map(
              (n, i) =>
                n > 0 && (
                  <div
                    key={i}
                    className={LEVEL_DOTS[i]}
                    style={{ width: `${(n / levelTotal) * 100}%` }}
                  />
                )
            )}
          </div>
          <div className="mt-3 flex justify-between">
            {levelCounts.map((n, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span
                  className={`h-1 w-3 rounded-full ${LEVEL_DOTS[i]}`}
                  aria-hidden
                />
                <span className="text-[11px] font-semibold text-text-secondary">
                  {n}
                </span>
                <span className="text-[8px] text-text-muted">Lv.{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* よく学んでいる出典 */}
      {topSources.length > 0 && (
        <div className="glass-card rounded-card-lg p-5">
          <h2 className="text-[13px] font-semibold text-text-primary">
            よく学んでいる出典
          </h2>
          <div className="mt-3 space-y-2.5">
            {topSources.map(([title, count]) => (
              <div key={title} className="flex items-center gap-3">
                <span className="h-6 w-9 shrink-0 rounded-[6px] bg-primary/10" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">
                  {title}
                </span>
                <span className="shrink-0 text-[11px] text-text-muted">
                  {count}枚
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
