# Anpan

YouTube動画・Webページから収集した英語語彙を復習するPWAフラッシュカードアプリ。

## セットアップ

### 1. 依存関係インストール

```bash
pnpm install
```

### 2. Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. **Authentication > Providers** で Google OAuth を有効化
   - Google Cloud Console で OAuth クライアント作成
   - リダイレクト URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. `.env.local` を作成:

```bash
cp .env.local.example .env.local
# NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定
```

### 3. データベースセットアップ

Supabase の SQL Editor で順番に実行:

```bash
# 1. テーブル + RLS + インデックス
supabase/migrations/00001_initial_schema.sql

# 2. RPC関数
supabase/migrations/00002_invite_rpc.sql

# 3. シードデータ（招待コード + パズル）
supabase/seed.sql
```

### 4. 開発サーバー起動

```bash
pnpm run dev
# http://localhost:3000
```

### 5. PWAアイコン生成

`scripts/generate-icons.html` をブラウザで開き、各キャンバスを右クリック保存:
- `public/icon-192.png`
- `public/icon-512.png`
- `public/icon-512-maskable.png`

## テスト用招待コード

- `ANPAN-BETA-2026`
- `WELCOME-ANPAN`

## コマンド

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | 開発サーバー (localhost:3000) |
| `pnpm build` | プロダクションビルド |
| `pnpm start` | プロダクションサーバー |

## 技術スタック

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 4
- Supabase (Auth + PostgreSQL + RLS)
- Zustand (状態管理)
- Serwist (Service Worker / PWA)
- Lucide React (アイコン)

## プロジェクト構成

```
src/
├── app/
│   ├── (app)/          # TabBar付きレイアウト
│   │   ├── page.tsx        # Home
│   │   ├── cards/          # Cards List + Detail
│   │   ├── review/         # Review (Card/Writing/Complete)
│   │   ├── puzzle/         # Puzzle Select + Progress
│   │   └── settings/       # Settings
│   ├── (auth)/login/       # Login
│   ├── auth/callback/      # OAuth callback
│   ├── api/auth/           # API routes
│   └── sw.ts               # Service Worker
├── components/
│   ├── ui/             # Button, Card, LevelBadge, etc.
│   ├── layout/         # TabBar, Header
│   ├── theme-provider.tsx
│   └── offline-sync.tsx
├── lib/
│   ├── supabase/       # Client, Server, Middleware, Actions
│   ├── stores/         # Zustand (review-store)
│   ├── utils/          # SM-2, IndexedDB
│   └── types.ts
└── middleware.ts        # Auth guard
```
