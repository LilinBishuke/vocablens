const levelConfig: Record<
  number,
  { label: string; color: string; bg: string; bgLight: string }
> = {
  1: { label: "初級", color: "text-level-1", bg: "bg-level-bg-1", bgLight: "bg-level-1/10" },
  2: { label: "初中級", color: "text-level-2", bg: "bg-level-bg-2", bgLight: "bg-level-2/10" },
  3: { label: "中級", color: "text-level-3", bg: "bg-level-bg-3", bgLight: "bg-level-3/10" },
  4: { label: "中上級", color: "text-level-4", bg: "bg-level-bg-4", bgLight: "bg-level-4/10" },
  5: { label: "上級", color: "text-level-5", bg: "bg-level-bg-5", bgLight: "bg-level-5/10" },
};

interface LevelBadgeProps {
  level: number;
  showLabel?: boolean;
}

export function LevelBadge({ level, showLabel = false }: LevelBadgeProps) {
  const config = levelConfig[level] ?? levelConfig[3];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-semibold dark:${config.bg} ${config.bgLight} ${config.color}`}
    >
      Lv.{level}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
