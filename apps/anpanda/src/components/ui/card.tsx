import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** グラスカード: 半透明サーフェス + 背景ぼかし + やわらかい影 */
export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div className={`glass-card rounded-card ${className}`} {...props}>
      {children}
    </div>
  );
}
