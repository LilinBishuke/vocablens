-- 日本語学習モード: カードと設定に学習言語を追加
-- 適用方法: Supabase SQL Editor でこのファイルの内容を実行

-- flashcards.language: カードの学習言語 ('en' = 英語, 'ja' = 日本語)
alter table flashcards
  add column if not exists language text not null default 'en';

comment on column flashcards.language is '学習言語: en=英単語, ja=日本語単語';

create index if not exists idx_flashcards_user_language
  on flashcards (user_id, language);

-- user_settings.learning_language: 現在の学習モード
alter table user_settings
  add column if not exists learning_language text not null default 'en';

comment on column user_settings.learning_language is '現在の学習モード: en=英語, ja=日本語';
