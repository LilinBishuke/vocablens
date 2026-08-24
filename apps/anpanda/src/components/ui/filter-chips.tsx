"use client";

interface FilterChipsProps {
  items: string[];
  activeIndex: number;
  onChange: (index: number) => void;
  /** chip=独立した丸チップの列（状態フィルタ）/ segmented=1枚の枠内で切り替え（カテゴリ） */
  variant?: "chip" | "segmented";
}

export function FilterChips({
  items,
  activeIndex,
  onChange,
  variant = "chip",
}: FilterChipsProps) {
  if (variant === "segmented") {
    return (
      <div className="glass-card flex rounded-chip p-1">
        {items.map((item, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={item}
              onClick={() => onChange(i)}
              className={`min-w-0 flex-1 truncate rounded-chip px-2 py-[6px] text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-on-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    // overflow-x-auto がチップの影をクリップするため、影の分（上4px/下20px/左右20px）を
    // パディングで確保し、同量のネガティブマージンで見た目の間隔を維持する
    <div className="-mx-page -mt-1 -mb-1 flex gap-2 overflow-x-auto no-scrollbar px-page pt-1 pb-5">
      {items.map((item, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={item}
            onClick={() => onChange(i)}
            className={`shrink-0 rounded-chip px-3.5 py-[7px] text-xs font-medium transition-all active:scale-95 cursor-pointer ${
              isActive
                ? "bg-primary text-on-primary"
                : "glass-card text-text-secondary hover:text-text-primary"
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
