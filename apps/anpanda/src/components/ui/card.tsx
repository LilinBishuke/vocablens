import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-card bg-surface border border-surface-border shadow-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
