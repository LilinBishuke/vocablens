-- 設定: 表示言語（UIの言語 ja/en/zh）
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS display_lang TEXT DEFAULT 'ja';
