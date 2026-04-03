# Chrome拡張（VocabLens）↔ Anpan PWA 連携設計プラン

## 1. 概要

VocabLens Chrome拡張で収集した英語語彙を、Anpan PWAのフラッシュカードとしてリアルタイム同期する。

```
┌──────────────────┐          ┌──────────────────┐
│  VocabLens 拡張   │          │   Anpan PWA      │
│  (Chrome Extension)│          │  (Next.js)       │
│                    │          │                   │
│  YouTube/Web で    │  ──①──▶ │  Supabase Auth    │
│  単語を収集       │  ◀──②── │  トークン共有      │
│                    │          │                   │
│  ③ Supabase に    │  ──③──▶ │  flashcards       │
│    直接 INSERT    │          │  テーブル          │
│                    │          │                   │
│                    │  ◀──④── │  Realtime で      │
│                    │          │  即時反映          │
└──────────────────┘          └──────────────────┘
```

---

## 2. 認証トークン共有フロー

### フロー図

```
User
  │
  ├─ 1) Anpan PWA にログイン (Google OAuth)
  │     → Supabase セッション確立
  │
  ├─ 2) Settings > 「拡張機能と連携」ボタン押下
  │     → PWA が chrome.runtime.sendMessage() 呼出
  │     → Extension ID 必要（manifest.json の key から取得）
  │
  ├─ 3) 拡張の background.js が onMessageExternal でトークン受信
  │     → chrome.storage.session.set({ supabaseSession: {...} })
  │
  └─ 4) 以降、拡張は保存トークンで Supabase に直接アクセス
        → トークン期限切れ時は refresh_token で自動更新
```

### PWA側の実装（Settings画面に追加）

```typescript
// src/lib/supabase/extension-bridge.ts

const EXTENSION_ID = process.env.NEXT_PUBLIC_VOCABLENS_EXTENSION_ID;

export async function connectExtension(): Promise<boolean> {
  if (!EXTENSION_ID || !chrome?.runtime?.sendMessage) {
    return false;
  }

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return false;

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      {
        type: 'ANPAN_AUTH_TOKEN',
        payload: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: {
            id: session.user.id,
            email: session.user.email,
          },
        },
      },
      (response) => {
        resolve(response?.success === true);
      }
    );
  });
}

export function isExtensionAvailable(): boolean {
  return !!(EXTENSION_ID && typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage);
}
```

### 拡張側の実装（background.js）

```javascript
// background.js (Service Worker)

// PWAからのトークン受信
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (message.type === 'ANPAN_AUTH_TOKEN') {
      // chrome.storage.session はメモリ上のみ（ブラウザ終了で消える）でより安全
      chrome.storage.session.set(
        { supabaseSession: message.payload },
        () => {
          sendResponse({ success: true });
        }
      );
      return true; // async response
    }

    if (message.type === 'ANPAN_AUTH_REVOKE') {
      chrome.storage.session.remove('supabaseSession', () => {
        sendResponse({ success: true });
      });
      return true;
    }
  }
);
```

---

## 3. 拡張側の manifest.json 変更

```json
{
  "manifest_version": 3,
  "name": "VocabLens",
  "permissions": ["storage", "activeTab"],
  // chrome.storage.session はメモリのみ保存（ブラウザ終了で消える、より安全）
  "externally_connectable": {
    "matches": [
      "https://anpan.vercel.app/*",
      "http://localhost:3000/*"
    ]
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

---

## 4. 単語追加のデータフロー

### 拡張 → Supabase UPSERT

```typescript
// 拡張側: 単語追加関数
async function addWordToAnpan(wordData: {
  word: string;
  phonetic?: string;
  translation?: string;
  definition?: {
    pos: string;
    meanings: {
      en: string;
      ja: string;
      examples: string[];
    }[];
  };
  synonyms?: string[];
  level?: string;          // "1"〜"5"
  type?: string;           // "vocab" | "slang" | "idiom"
  source_url?: string;     // 現在のページURL
  source_title?: string;   // ページタイトル
  source_type?: string;    // "video" | "webpage"
  source_timestamp?: string; // YouTube の場合 "12:34"
}) {
  const session = await getStoredSession(); // chrome.storage.local から取得
  if (!session) throw new Error('Not authenticated');

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    }
  );

  // UPSERT: 同じ単語を別の動画で見つけた場合、source情報を更新
  const { error } = await supabase.from('flashcards').upsert(
    {
      user_id: session.user.id,
      word: wordData.word,
      phonetic: wordData.phonetic ?? null,
      translation: wordData.translation ?? null,
      definition: wordData.definition ?? null,
      synonyms: wordData.synonyms ?? null,
      level: wordData.level ?? '3',
      type: wordData.type ?? 'vocab',
      source_url: wordData.source_url ?? null,
      source_title: wordData.source_title ?? null,
      source_type: wordData.source_type ?? null,
      source_timestamp: wordData.source_timestamp ?? null,
    },
    {
      onConflict: 'user_id,word',
      ignoreDuplicates: false, // 既存レコードのsource情報を更新
    }
  );

  if (error) throw error;
}
```

### flashcards テーブルスキーマ（既存）

| カラム | 型 | 必須 | 説明 |
|--------|------|------|------|
| user_id | UUID | ✅ | RLSで自動検証 |
| word | TEXT | ✅ | 英単語 |
| phonetic | TEXT | | /əˈfɪnɪti/ |
| translation | TEXT | | 日本語翻訳 |
| definition | JSONB | | `{pos, meanings[{en,ja,examples}]}` |
| synonyms | TEXT[] | | 類語配列 |
| level | TEXT | | "1"〜"5" |
| type | TEXT | | "vocab" / "slang" / "idiom" |
| source_url | TEXT | | 元のURL |
| source_title | TEXT | | ページタイトル |
| source_type | TEXT | | "video" / "webpage" |
| source_timestamp | TEXT | | "12:34" |

**UNIQUE制約**: `(user_id, word)` — 同じ単語は重複INSERT不可（既存の場合はUPSERTを検討）

---

## 5. リアルタイム同期（PWA側）

### Supabase Realtime で flashcards を購読

```typescript
// src/lib/supabase/realtime.ts
import { createClient } from './client';

export function subscribeToFlashcards(
  userId: string,
  onInsert: (card: any) => void
) {
  const supabase = createClient();

  const channel = supabase
    .channel('flashcards-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'flashcards',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onInsert(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
```

### Home画面で購読（オプション）

```typescript
// Home画面で拡張から追加された単語をリアルタイム表示
useEffect(() => {
  if (!userId) return;
  const unsubscribe = subscribeToFlashcards(userId, (newCard) => {
    // React Query のキャッシュを無効化、またはローカルステートに追加
    router.refresh();
  });
  return unsubscribe;
}, [userId]);
```

---

## 6. トークンリフレッシュ

```typescript
// 拡張側: トークン自動更新
async function getValidSession() {
  const { supabaseSession } = await chrome.storage.session.get('supabaseSession');
  if (!supabaseSession) return null;

  // 期限チェック（5分前にリフレッシュ）
  const expiresAt = supabaseSession.expires_at * 1000;
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    // リフレッシュ
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: supabaseSession.refresh_token,
    });

    if (error || !data.session) {
      // リフレッシュ失敗 → 再連携が必要
      await chrome.storage.session.remove('supabaseSession');
      return null;
    }

    // 更新されたトークンを保存
    await chrome.storage.session.set({
      supabaseSession: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: {
          id: data.session.user.id,
          email: data.session.user.email,
        },
      },
    });

    return data.session;
  }

  return supabaseSession;
}
```

---

## 7. Settings画面 UI 変更

### 現在の「Chrome拡張連携: 同期済み」を動的に

```
連携状態:
├─ 未連携     → 「拡張機能と連携」ボタン表示
├─ 連携済み   → 「✓ 同期済み」緑テキスト + 「連携解除」ボタン
└─ 拡張未検出 → 「VocabLens拡張をインストールしてください」
```

---

## 8. 連携解除フロー

### PWA側（ログアウト時 or 設定画面から）

```typescript
export async function disconnectExtension(): Promise<void> {
  if (!EXTENSION_ID || !chrome?.runtime?.sendMessage) return;

  chrome.runtime.sendMessage(
    EXTENSION_ID,
    { type: 'ANPAN_AUTH_REVOKE' },
    () => {} // response は無視してOK
  );
}
```

Settings画面の「連携解除」ボタン、または `signOut()` 内で呼び出す。

### 拡張側

background.js の `onMessageExternal` リスナーで `ANPAN_AUTH_REVOKE` を処理（セクション2で実装済み）。

---

## 9. オフラインキュー制限

```typescript
// 拡張側: キュー追加時のサイズチェック
const MAX_QUEUE_SIZE = 100;

async function queueOfflineWord(wordData) {
  const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');

  if (offlineQueue.length >= MAX_QUEUE_SIZE) {
    // 最も古いものを削除
    offlineQueue.shift();
  }

  offlineQueue.push({ ...wordData, queuedAt: Date.now() });
  await chrome.storage.local.set({ offlineQueue });
}
```

`chrome.storage.local` の上限は5MB。1単語あたり約500Bとして、100件で約50KB — 十分余裕あり。

---

## 10. エラーハンドリング

| シナリオ | 対処 |
|---------|------|
| 拡張がインストールされていない | `chrome.runtime.sendMessage` が失敗 → UI で案内 |
| トークン期限切れ | refresh_token で自動更新、失敗時は再連携を促す |
| 重複単語 | UPSERTで対応 — 同じ単語の再追加時はsource情報を更新 |
| オフライン時の追加 | 拡張側で chrome.storage.local にキュー（最大100件、約500KB上限）→ オンライン時に一括UPSERT |
| PWAログアウト | PWA → `ANPAN_AUTH_REVOKE` メッセージ送信 → 拡張が storage.session をクリア |

---

## 11. 実装順序

1. **PWA側**: `extension-bridge.ts` 作成 + Settings画面に連携ボタン追加
2. **拡張側**: `manifest.json` に `externally_connectable` 追加
3. **拡張側**: `background.js` に `onMessageExternal` リスナー追加
4. **拡張側**: 単語追加時に Supabase INSERT に切替
5. **PWA側**: Supabase Realtime 購読（任意）
6. **両方**: トークンリフレッシュ + エラーハンドリング

---

## 12. 環境変数（PWA側に追加）

```env
NEXT_PUBLIC_VOCABLENS_EXTENSION_ID=your-chrome-extension-id-here
```

Chrome拡張のIDは `chrome://extensions/` のデベロッパーモードで確認可能。
公開後は Chrome Web Store の ID が固定される。
