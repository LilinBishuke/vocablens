"use client";

import { Search } from "lucide-react";
import { type InputHTMLAttributes } from "react";

interface SearchBarProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {}

export function SearchBar({ className = "", ...props }: SearchBarProps) {
  return (
    <div
      className={`glass-card flex h-10 items-center gap-2.5 rounded-chip px-4 ${className}`}
    >
      <Search size={15} className="shrink-0 text-text-muted" />
      <input
        type="search"
        className="w-full bg-transparent text-[13px] text-text-primary placeholder:text-text-muted outline-none"
        {...props}
      />
    </div>
  );
}
