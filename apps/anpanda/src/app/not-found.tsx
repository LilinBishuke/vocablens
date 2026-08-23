import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-8 text-center">
      <p className="text-4xl font-bold text-text-muted">404</p>
      <p className="text-base font-semibold text-text-primary">ページが見つかりません</p>
      <Link
        href="/"
        className="mt-2 flex h-12 items-center justify-center rounded-button bg-primary px-8 text-[15px] font-semibold text-on-primary shadow-button-glow transition-all active:scale-[0.97]"
      >
        ホームに戻る
      </Link>
    </div>
  );
}
