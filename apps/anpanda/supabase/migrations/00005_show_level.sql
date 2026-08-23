-- 設定: 難易度の表示オン/オフ（Figma設定画面のトグル）
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS show_level BOOLEAN DEFAULT true;
