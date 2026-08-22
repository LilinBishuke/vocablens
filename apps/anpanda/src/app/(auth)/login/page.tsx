"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Star, BookOpen, GraduationCap, Globe, Eye, EyeOff } from "lucide-react";

type Tab = "login" | "signup" | "forgot";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup
  const [inviteCode, setInviteCode] = useState("");
  const [codeVerified, setCodeVerified] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  // Forgot
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchTab(t: Tab) {
    setTab(t);
    setError("");
  }

  // --- Login ---
  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleLogin() {
    if (!loginEmail.trim() || !loginPassword) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }
    if (!isValidEmail(loginEmail)) {
      setError("正しいメールアドレスを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません");
      setLoading(false);
    }
    // On success, middleware redirects to /
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError("Googleログインに失敗しました");
      setLoading(false);
    }
  }

  // --- Signup ---
  async function handleVerifyCode() {
    if (!inviteCode.trim()) {
      setError("招待コードを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setCodeVerified(true);
        setError("");
      } else {
        setError(data.error || "無効な招待コードです");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (!signupEmail.trim() || !signupPassword) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }
    if (!isValidEmail(signupEmail)) {
      setError("正しいメールアドレスを入力してください");
      return;
    }
    if (signupPassword.length < 6) {
      setError("パスワードは6文字以上にしてください");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?invite_code=${encodeURIComponent(inviteCode.trim())}`,
        data: { invite_code: inviteCode.trim() },
      },
    });
    if (error) {
      setError("登録に失敗しました: " + error.message);
      setLoading(false);
    } else {
      setSignupDone(true);
      setLoading(false);
    }
  }

  // --- Forgot ---
  async function handleForgotPassword() {
    if (!forgotEmail.trim()) {
      setError("メールアドレスを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      forgotEmail.trim(),
      { redirectTo: `${window.location.origin}/auth/reset-password` }
    );
    if (error) {
      if (error.status === 429 || error.message?.toLowerCase().includes("rate")) {
        setError("送信が多すぎます。60秒待ってから再試行してください。");
      } else {
        setError(`送信に失敗しました: ${error.message}`);
      }
      setLoading(false);
    } else {
      setForgotSent(true);
      setLoading(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-button border border-surface-border bg-surface px-4 text-[15px] text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-colors";
  const btnPrimary =
    "flex h-12 w-full items-center justify-center rounded-button bg-primary text-base font-semibold text-on-primary shadow-button-glow transition-all hover:bg-primary-strong active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const btnSecondary =
    "flex h-12 w-full items-center justify-center gap-2.5 rounded-button border border-surface-border bg-surface text-[15px] font-medium text-text-primary transition-all hover:bg-surface-border/30 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Hero */}
      <div className="relative h-[320px] overflow-hidden bg-gradient-to-b from-primary/15 to-background dark:from-primary/10 dark:to-background">
        <div className="absolute -left-15 -top-10 h-[200px] w-[200px] rounded-full bg-primary/15 dark:bg-primary/20" />
        <div className="absolute right-[-10px] top-5 h-[150px] w-[150px] rounded-full bg-primary-light/15 dark:bg-primary/15" />
        <div className="absolute right-[30px] bottom-[20px] h-[100px] w-[100px] rounded-full bg-primary/10 dark:bg-primary/15" />
        <Sparkles size={18} className="absolute left-[50px] top-[140px] text-primary/25 dark:text-primary-light/19" />
        <Star size={14} className="absolute right-[60px] top-[160px] text-primary/20 dark:text-primary-light/12" />
        <BookOpen size={16} className="absolute right-[80px] bottom-[60px] text-primary/15 dark:text-primary-light/9" />
        <GraduationCap size={14} className="absolute left-[30px] bottom-[70px] text-primary/20 dark:text-primary-light/12" />

        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-white shadow-[0_4px_20px_rgba(30,128,96,0.15)]">
            <Image src="/logo.svg" alt="Anpanda" width={144} height={144} className="object-contain" unoptimized />
          </div>
          <div className="mt-4 flex flex-col items-center gap-1">
            <h1 className="text-[28px] font-bold text-text-primary">Anpanda</h1>
            <p className="text-sm text-text-secondary">YouTube語彙を定着させよう</p>
          </div>
        </div>
      </div>

      {/* Segmented tab control */}
      <div className="px-8 pt-6 pb-2">
        <div className="flex rounded-full bg-surface-border/40 p-1">
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                tab === t
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-text-muted"
              }`}
            >
              {t === "login" ? "ログイン" : "新規登録"}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 flex-col gap-4 px-8 pt-4 pb-8">
        {/* ---- LOGIN TAB ---- */}
        {tab === "login" && (
          <>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-text-primary">メールアドレス</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => { setLoginEmail(e.target.value); setError(""); }}
                placeholder="your@email.com"
                className={inputClass}
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-text-primary">パスワード</label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className={inputClass + " pr-12"}
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-again">{error}</p>}

            <button onClick={handleLogin} disabled={loading} className={btnPrimary}>
              {loading ? "ログイン中..." : "ログイン"}
            </button>

            <button
              onClick={() => switchTab("forgot")}
              className="text-center text-sm text-primary cursor-pointer hover:underline"
            >
              パスワードを忘れましたか？
            </button>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-surface-border" />
              <span className="text-[13px] text-text-muted">または</span>
              <div className="h-px flex-1 bg-surface-border" />
            </div>

            <button onClick={handleGoogleLogin} disabled={loading} className={btnSecondary}>
              <Globe size={20} className="text-text-secondary" />
              Googleでログイン
            </button>
          </>
        )}

        {/* ---- SIGNUP TAB ---- */}
        {tab === "signup" && !signupDone && (
          <>
            {!codeVerified ? (
              <>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-text-primary">招待コード</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => { setInviteCode(e.target.value); setError(""); }}
                    placeholder="コードを入力..."
                    className={inputClass}
                  />
                </div>
                {error && <p className="text-xs text-again">{error}</p>}
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || !inviteCode.trim()}
                  className={btnPrimary}
                >
                  {loading ? "確認中..." : "次へ"}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-good font-medium">招待コード確認済み</p>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-text-primary">メールアドレス</label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => { setSignupEmail(e.target.value); setError(""); }}
                    placeholder="your@email.com"
                    className={inputClass}
                    autoComplete="email"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-text-primary">パスワード</label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      value={signupPassword}
                      onChange={(e) => { setSignupPassword(e.target.value); setError(""); }}
                      placeholder="6文字以上"
                      className={inputClass + " pr-12"}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer"
                    >
                      {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-xs text-again">{error}</p>}

                <button onClick={handleSignup} disabled={loading} className={btnPrimary}>
                  {loading ? "登録中..." : "アカウントを作成"}
                </button>

                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-surface-border" />
                  <span className="text-[13px] text-text-muted">または</span>
                  <div className="h-px flex-1 bg-surface-border" />
                </div>

                <button onClick={handleGoogleLogin} disabled={loading} className={btnSecondary}>
                  <Globe size={20} className="text-text-secondary" />
                  Googleで登録
                </button>
              </>
            )}
          </>
        )}

        {tab === "signup" && signupDone && (
          <div className="rounded-button border border-good/30 bg-good/10 px-4 py-4 text-sm text-good font-medium text-center">
            {signupEmail} に確認メールを送りました。<br />
            メール内のリンクをタップして登録を完了してください。
          </div>
        )}

        {/* ---- FORGOT TAB ---- */}
        {tab === "forgot" && !forgotSent && (
          <>
            <p className="text-sm text-text-secondary">
              登録済みのメールアドレスを入力してください。パスワード再設定のリンクを送ります。
            </p>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-text-primary">メールアドレス</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => { setForgotEmail(e.target.value); setError(""); }}
                placeholder="your@email.com"
                className={inputClass}
                autoComplete="email"
              />
            </div>
            {error && <p className="text-xs text-again">{error}</p>}
            <button onClick={handleForgotPassword} disabled={loading} className={btnPrimary}>
              {loading ? "送信中..." : "リセットリンクを送る"}
            </button>
            <button
              onClick={() => switchTab("login")}
              className="text-center text-sm text-text-muted cursor-pointer hover:underline"
            >
              ログインに戻る
            </button>
          </>
        )}

        {tab === "forgot" && forgotSent && (
          <>
            <div className="rounded-button border border-good/30 bg-good/10 px-4 py-4 text-sm text-good font-medium text-center">
              {forgotEmail} にリセットリンクを送りました。
            </div>
            <button
              onClick={() => switchTab("login")}
              className="text-center text-sm text-text-muted cursor-pointer hover:underline"
            >
              ログインに戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}
