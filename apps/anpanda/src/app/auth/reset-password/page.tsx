"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const code = searchParams.get("code");
    const supabase = createClient();

    // token_hash 方式: どのブラウザで開いても検証できる（メールリンク用の推奨方式）
    if (tokenHash) {
      supabase.auth
        .verifyOtp({ type: "recovery", token_hash: tokenHash })
        .then(({ error }) => {
          if (error) {
            setError("リンクの有効期限が切れています。もう一度リセットリンクをリクエストしてください。");
          } else {
            setSessionReady(true);
          }
        });
      return;
    }
    // code 方式（旧リンク互換）: リセットを申請したブラウザと同じブラウザでのみ成立する
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError(
            "このリンクは、リセットを申請したときと同じブラウザで開く必要があります。開けない場合はもう一度リセットをリクエストしてください。"
          );
        } else {
          setSessionReady(true);
        }
      });
      return;
    }
    setError("無効なリンクです");
  }, [searchParams]);

  async function handleUpdate() {
    if (!password) {
      setError("新しいパスワードを入力してください");
      return;
    }
    if (password.length < 6) {
      setError("パスワードは6文字以上にしてください");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError("更新に失敗しました: " + error.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/"), 2000);
    }
  }

  const inputClass =
    "h-12 w-full rounded-button border border-surface-border bg-surface px-4 text-[15px] text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-colors";
  const btnPrimary =
    "flex h-12 w-full items-center justify-center rounded-button bg-primary text-base font-semibold text-on-primary shadow-button-glow transition-all hover:bg-primary-strong active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-8">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[24px] font-bold text-text-primary">パスワード再設定</h1>
          <p className="text-sm text-text-secondary">新しいパスワードを入力してください</p>
        </div>

        {done ? (
          <div className="rounded-button border border-good/30 bg-good/10 px-4 py-4 text-sm text-good font-medium text-center">
            パスワードを更新しました。ホームに移動します…
          </div>
        ) : !sessionReady && !error ? (
          <p className="text-sm text-text-muted">確認中...</p>
        ) : error ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-again">{error}</p>
            <button onClick={() => router.push("/login")} className={btnPrimary}>
              ログインページに戻る
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-text-primary">新しいパスワード</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="6文字以上"
                  className={inputClass + " pr-12"}
                  autoComplete="new-password"
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-again">{error}</p>}

            <button onClick={handleUpdate} disabled={loading} className={btnPrimary}>
              {loading ? "更新中..." : "パスワードを更新"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-background"><p className="text-sm text-text-muted">読み込み中...</p></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
