-- ============================================
-- Anpan — Initial Schema
-- ============================================

-- ユーザープロフィール（Supabase Auth 補助）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  invite_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 招待コード
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  max_uses INT DEFAULT 10,
  used_count INT DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- フラッシュカード
CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  phonetic TEXT,
  translation TEXT,
  definition JSONB,
  synonyms TEXT[],
  level TEXT,
  type TEXT DEFAULT 'vocab',

  -- SM-2 パラメータ
  sm2_repetitions INT DEFAULT 0,
  sm2_interval FLOAT DEFAULT 0,
  sm2_ease_factor FLOAT DEFAULT 2.5,
  sm2_next_review TIMESTAMPTZ DEFAULT now(),
  sm2_last_review TIMESTAMPTZ,

  learned BOOLEAN DEFAULT false,

  -- 出典
  source_url TEXT,
  source_title TEXT,
  source_type TEXT,
  source_timestamp TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(user_id, word)
);

-- 復習履歴
CREATE TABLE review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  quality INT NOT NULL,
  is_correct BOOLEAN,
  reviewed_at TIMESTAMPTZ DEFAULT now()
);

-- 復習セッション
CREATE TABLE review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cards_reviewed INT NOT NULL,
  correct_count INT DEFAULT 0,
  total_count INT DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- パズル
CREATE TABLE puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  icon TEXT,
  grid_cols INT NOT NULL,
  grid_rows INT NOT NULL,
  total_pieces INT NOT NULL,
  reviews_per_piece INT DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ユーザーのパズル進捗
CREATE TABLE user_puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  puzzle_id UUID NOT NULL REFERENCES puzzles(id),
  pieces_revealed INT DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, puzzle_id)
);

-- ユーザー設定
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  translation_lang TEXT DEFAULT 'ja',
  level_system TEXT DEFAULT '5',
  daily_limit INT DEFAULT 20,
  new_cards_per_day INT DEFAULT 5,
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_time TIME DEFAULT '20:00',
  auto_play_audio BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own flashcards"
  ON flashcards FOR ALL USING (auth.uid() = user_id);

ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own review_history"
  ON review_history FOR ALL USING (auth.uid() = user_id);

ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own review_sessions"
  ON review_sessions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE user_puzzles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own user_puzzles"
  ON user_puzzles FOR ALL USING (auth.uid() = user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own user_settings"
  ON user_settings FOR ALL USING (auth.uid() = user_id);

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can check invite codes"
  ON invite_codes FOR SELECT USING (true);

ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read puzzles"
  ON puzzles FOR SELECT USING (true);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_flashcards_user_next_review
  ON flashcards(user_id, sm2_next_review)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_flashcards_user_created
  ON flashcards(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_review_history_user_date
  ON review_history(user_id, reviewed_at DESC);

CREATE INDEX idx_review_sessions_user_date
  ON review_sessions(user_id, completed_at DESC);
