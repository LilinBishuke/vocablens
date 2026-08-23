-- グルーピング機能: フォルダ + カード⇄フォルダ対応表
-- 既存の per-user RLS パターン（00001）を踏襲

CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE flashcard_folders (
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (flashcard_id, folder_id)
);

CREATE INDEX idx_flashcard_folders_folder ON flashcard_folders(folder_id);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own folders"
  ON folders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 対応表は「自分のフォルダ かつ 自分のカード」のみ操作可
CREATE POLICY "Users manage own flashcard_folders"
  ON flashcard_folders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM folders f WHERE f.id = folder_id AND f.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM folders f WHERE f.id = folder_id AND f.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM flashcards c WHERE c.id = flashcard_id AND c.user_id = auth.uid())
  );
