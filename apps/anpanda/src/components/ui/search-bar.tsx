"use client";

import { Search } from "lucide-react";
import { type InputHTMLAttributes } from "react";

interface SearchBarProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {}

export function SearchBar({ className = "", ...props }: SearchBarProps) {
  return (
    <div
      className={`flex h-11 items-center gap-2 rounded-button border border-surface-border bg-surface px-3 ${className}`}
    >
      <Search size={18} className="shrink-0 text-text-muted" />
      <input
        type="search"
        className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
        {...props}
      />
    </div>
  );
}
