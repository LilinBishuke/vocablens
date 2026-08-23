"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body style={{ background: "#f7f8f7", color: "#182420", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 40 }} aria-hidden>⚠</p>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>問題が発生しました</h1>
          <p style={{ fontSize: 13, color: "#55675d" }}>
            一時的なエラーの可能性があります。再試行しても直らない場合はリロードしてください。
          </p>
          <button
            onClick={() => reset()}
            style={{ marginTop: 8, height: 48, padding: "0 32px", borderRadius: 14, border: "none", background: "#1e8060", color: "#fff", fontSize: 15, fontWeight: 600 }}
          >
            再試行する
          </button>
        </div>
      </body>
    </html>
  );
}
