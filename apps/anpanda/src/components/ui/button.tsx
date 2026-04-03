"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-button-glow hover:bg-primary-dark active:scale-[0.97]",
  secondary:
    "bg-surface text-text-primary border border-surface-border hover:bg-surface-border/30 active:scale-[0.97]",
  danger:
    "bg-transparent text-again border border-again/30 hover:bg-again/5 active:scale-[0.97]",
  ghost:
    "bg-transparent text-text-muted hover:text-text-secondary active:scale-[0.97]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`h-12 rounded-button px-6 text-[15px] font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
