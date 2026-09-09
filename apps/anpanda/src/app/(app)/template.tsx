export default function Template({ children }: { children: React.ReactNode }) {
  // min-h-0: 復習画面でカードを画面内にクランプするため（通常ページのスクロールには影響しない）
  return (
    <div className="animate-page-in flex min-h-0 flex-1 flex-col">{children}</div>
  );
}
