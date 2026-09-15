-- カード詳細のメモ機能（手入力の自由メモ）
-- 適用方法: Supabase SQL Editor でこのファイルの内容を実行

alter table flashcards
  add column if not exists memo text;

comment on column flashcards.memo is 'ユーザーが手入力する自由メモ';
