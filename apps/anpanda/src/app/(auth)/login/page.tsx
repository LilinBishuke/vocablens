"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Star, BookOpen, GraduationCap, Mail, Globe } from "lucide-react";

export default function LoginPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

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

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?invite_code=${encodeURIComponent(inviteCode.trim())}`,
      },
    });
    if (error) {
      setError("Googleログインに失敗しました");
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setError("メールアドレスを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?invite_code=${encodeURIComponent(inviteCode.trim())}`,
      },
    });

    if (error) {
      setError("送信に失敗しました");
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden bg-gradient-to-b from-blue-100 to-background dark:from-blue-950 dark:to-background">
        {/* Decorative bubbles */}
        <div className="absolute -left-15 -top-10 h-[200px] w-[200px] rounded-full bg-blue-200/25 dark:bg-[#1E3A5F]/40" />
        <div className="absolute right-[-10px] top-5 h-[150px] w-[150px] rounded-full bg-blue-300/12 dark:bg-[#1E3A5F]/30" />
        <div className="absolute right-[30px] bottom-[20px] h-[100px] w-[100px] rounded-full bg-blue-200/18 dark:bg-[#1E3A5F]/25" />

        {/* Decorative icons */}
        <Sparkles
          size={18}
          className="absolute left-[50px] top-[180px] text-blue-300/25 dark:text-primary-light/19"
        />
        <Star
          size={14}
          className="absolute right-[60px] top-[200px] text-blue-300/18 dark:text-primary-light/12"
        />
        <BookOpen
          size={16}
          className="absolute right-[80px] bottom-[80px] text-blue-300/15 dark:text-primary-light/9"
        />
        <GraduationCap
          size={14}
          className="absolute left-[30px] bottom-[90px] text-blue-300/18 dark:text-primary-light/12"
        />

        {/* Panda + brand */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-surface shadow-[0_4px_20px_rgba(45,141,210,0.1)] dark:bg-surface">
            <span className="text-6xl font-bold text-primary">A</span>
          </div>
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <h1 className="text-[32px] font-bold text-text-primary">Anpanda</h1>
            <p className="text-sm text-text-secondary">
              YouTube語彙を定着させよう
            </p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex flex-1 flex-col gap-6 px-8 py-8">
        {/* Invite code form */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-text-primary">
            招待コード
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => {
              setInviteCode(e.target.value);
              setError("");
              setCodeVerified(false);
            }}
            placeholder="コードを入力..."
            className="h-12 rounded-button border border-surface-border bg-surface px-4 text-[15px] text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-colors"
          />
          {error && <p className="text-xs text-again">{error}</p>}

          {!codeVerified ? (
            <button
              onClick={handleVerifyCode}
              disabled={loading || !inviteCode.trim()}
              className="flex h-12 items-center justify-center rounded-button bg-primary text-base font-semibold text-white shadow-button-glow transition-all hover:bg-primary-dark active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "確認中..." : "次へ"}
            </button>
          ) : (
            <p className="text-xs text-good font-medium">
              コード確認済み — 下のボタンでログインしてください
            </p>
          )}
        </div>

        {/* Login options */}
        {codeVerified && !magicLinkSent && (
          <div className="flex flex-col gap-3">
            {/* Google login */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex h-12 items-center justify-center gap-2.5 rounded-button border border-surface-border bg-surface text-[15px] font-medium text-text-primary transition-all hover:bg-surface-border/30 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Globe size={20} className="text-text-secondary" />
              Googleでログイン
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-surface-border" />
              <span className="text-[13px] text-text-muted">または</span>
              <div className="h-px flex-1 bg-surface-border" />
            </div>

            {/* Magic link */}
            <label className="text-sm font-semibold text-text-primary">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="your@email.com"
              className="h-12 rounded-button border border-surface-border bg-surface px-4 text-[15px] text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handleMagicLink}
              disabled={loading || !email.trim()}
              className="flex h-12 items-center justify-center gap-2.5 rounded-button bg-primary text-base font-semibold text-white shadow-button-glow transition-all hover:bg-primary-dark active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Mail size={20} />
              {loading ? "送信中..." : "メールでログイン"}
            </button>
          </div>
        )}

        {magicLinkSent && (
          <div className="rounded-button border border-good/30 bg-good/10 px-4 py-4 text-sm text-good font-medium text-center">
            {email} にログインリンクを送りました。メールを確認してください。
          </div>
        )}
      </div>
    </div>
  );
}
