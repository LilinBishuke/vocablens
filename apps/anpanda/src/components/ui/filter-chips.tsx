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
