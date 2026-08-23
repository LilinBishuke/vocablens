"use client";

import { useRouter } from "next/navigation";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="glass-card flex h-16 w-16 items-center justify-center rounded-full">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted" aria-hidden>
          <path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </div>
      <p className="text-lg font-bold text-text-primary">問題が発生しました</p>
      <p className="text-sm text-text-secondary">
        一時的なエラーの可能性があります。もう一度お試しください。
      </p>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2.5">
        <button
          onClick={() => reset()}
          className="flex h-12 w-full items-center justify-center rounded-button bg-primary text-[15px] font-semibold text-on-primary shadow-button-glow transition-all active:scale-[0.97] cursor-pointer"
        >
          再試行する
        </button>
        <button
          onClick={() => router.push("/")}
          className="glass-card flex h-12 w-full items-center justify-center rounded-button text-[15px] font-medium text-text-primary transition-all active:scale-[0.97] cursor-pointer"
        >
          ホームに戻る
        </button>
      </div>
    </div>
  );
}
