"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, X } from "lucide-react";

interface HomeHeaderProps {
  variant: "home";
}

interface PageHeaderProps {
  variant: "page";
  title: string;
}

interface DetailHeaderProps {
  variant: "detail";
  title: string;
}

interface ReviewHeaderProps {
  variant: "review";
  progress: string;
  onClose: () => void;
  onSkip?: () => void;
}

type HeaderProps =
  | HomeHeaderProps
  | PageHeaderProps
  | DetailHeaderProps
  | ReviewHeaderProps;

export function Header(props: HeaderProps) {
  const router = useRouter();

  const base = "flex h-14 items-center px-page shrink-0";

  if (props.variant === "home") {
    return (
      <header className={`${base} justify-between`}>
        <div className="flex items-center gap-2">
          <div className="h-[34px] w-[34px] rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
            A
          </div>
          <span className="text-lg font-bold text-text-primary">Anpanda</span>
        </div>
        <Link href="/settings" aria-label="設定">
          <Settings size={22} className="text-text-muted" />
        </Link>
      </header>
    );
  }

  if (props.variant === "page") {
    return (
      <header className={`${base} justify-between`}>
        <h1 className="text-lg font-bold text-text-primary">{props.title}</h1>
      </header>
    );
  }

  if (props.variant === "detail") {
    return (
      <header className={`${base} gap-3`}>
        <button
          onClick={() => router.back()}
          aria-label="戻る"
          className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-text-primary">{props.title}</h1>
      </header>
    );
  }

  // review
  return (
    <header className={`${base} justify-between`}>
      <button
        onClick={props.onClose}
        aria-label="閉じる"
        className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
      >
        <X size={22} />
      </button>
      <span className="text-sm font-medium text-text-secondary">
        {props.progress}
      </span>
      {props.onSkip ? (
        <button
          onClick={props.onSkip}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          スキップ
        </button>
      ) : (
        <div className="w-[50px]" />
      )}
    </header>
  );
}
