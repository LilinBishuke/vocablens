"use client";

interface FilterChipsProps {
  items: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export function FilterChips({ items, activeIndex, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {items.map((item, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={item}
            onClick={() => onChange(i)}
            className={`shrink-0 rounded-chip px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
              isActive
                ? "bg-primary text-white"
                : "bg-surface border border-surface-border text-text-secondary hover:bg-surface-border/30"
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
