'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signInWithEmail = useAuthStore(s => s.signInWithEmail);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const { error } = await signInWithEmail(email.trim());
    if (error) {
      setError(error);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="w-full max-w-sm px-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">VocabLens</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          ログインするとAnpandaと単語が同期されます
        </p>

        {sent ? (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-700 dark:text-blue-300">
            <strong>{email}</strong> にログインリンクを送りました。メールを確認してください。
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="メールアドレス"
              className="h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="h-11 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '送信中...' : 'ログインリンクを送る'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              キャンセル
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
