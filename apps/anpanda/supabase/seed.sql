-- ============================================
-- Anpan — Seed Data
-- Run AFTER migrations, AFTER creating a user via Google OAuth
-- ============================================

-- 招待コード（テスト用）
INSERT INTO invite_codes (code, max_uses, used_count) VALUES
  ('ANPAN-BETA-2026', 100, 0),
  ('WELCOME-ANPAN', 50, 0)
ON CONFLICT (code) DO NOTHING;

-- パズル
INSERT INTO puzzles (name, icon, grid_cols, grid_rows, total_pieces, reviews_per_piece, sort_order) VALUES
  ('桜の庭園', 'cherry-blossom', 5, 4, 20, 1, 1),
  ('東京タワー', 'tower', 5, 4, 20, 1, 2),
  ('富士山', 'mountain', 4, 3, 12, 1, 3),
  ('海辺の夕日', 'sunset', 5, 4, 20, 1, 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- サンプルフラッシュカード（ユーザー作成後に実行）
-- {USER_ID} を実際のユーザーUUIDに置換してください
-- ============================================

-- 以下はテンプレートです。実際に使う場合は {USER_ID} を置換:
/*
INSERT INTO flashcards (user_id, word, phonetic, translation, definition, synonyms, level, type, source_url, source_title, source_type, source_timestamp) VALUES
('{USER_ID}', 'affinity', '/əˈfɪnɪti/', '親近感、類似性',
  '{"pos": "Noun", "meanings": [{"en": "A natural attraction or feeling of kinship.", "ja": "人や物事に対する自然な引きつけや親近感。", "examples": ["She felt an affinity for the coastal town.", "He had a natural affinity with animals."]}]}',
  ARRAY['connection', 'bond', 'rapport'], '5', 'vocab',
  'https://youtube.com/watch?v=example1', 'Google Stitch Just Became...', 'video', '12:34'),

('{USER_ID}', 'burnout', '/ˈbɜːrnaʊt/', '燃え尽き症候群',
  '{"pos": "Noun", "meanings": [{"en": "Physical or mental collapse caused by overwork.", "ja": "過労による身体的・精神的な崩壊。", "examples": ["Many developers experience burnout.", "She took a break to recover from burnout."]}]}',
  ARRAY['exhaustion', 'fatigue'], '4', 'vocab',
  'https://youtube.com/watch?v=example2', 'Tech Industry Mental Health', 'video', '5:20'),

('{USER_ID}', 'hue', '/hjuː/', '色合い、色相',
  '{"pos": "Noun", "meanings": [{"en": "A color or shade.", "ja": "色または色合い。", "examples": ["The sky changed to a deep orange hue.", "Different hues of blue filled the canvas."]}]}',
  ARRAY['shade', 'tint', 'tone'], '3', 'vocab',
  NULL, NULL, NULL, NULL),

('{USER_ID}', 'resilient', '/rɪˈzɪliənt/', '回復力のある',
  '{"pos": "Adjective", "meanings": [{"en": "Able to recover quickly from difficult conditions.", "ja": "困難な状況から素早く回復できる。", "examples": ["Children are often more resilient than adults.", "The resilient economy bounced back quickly."]}]}',
  ARRAY['tough', 'strong', 'adaptable'], '3', 'vocab',
  NULL, NULL, NULL, NULL),

('{USER_ID}', 'paradigm', '/ˈpærədaɪm/', 'パラダイム、典型',
  '{"pos": "Noun", "meanings": [{"en": "A typical example or pattern of something.", "ja": "あるものの典型的な例やパターン。", "examples": ["This could cause a paradigm shift in education.", "The old paradigm no longer applies."]}]}',
  ARRAY['model', 'pattern', 'framework'], '4', 'vocab',
  'https://youtube.com/watch?v=example3', 'Future of Education', 'video', '8:45'),

('{USER_ID}', 'ubiquitous', '/juːˈbɪkwɪtəs/', '至る所にある',
  '{"pos": "Adjective", "meanings": [{"en": "Present, appearing, or found everywhere.", "ja": "どこにでも存在する、遍在する。", "examples": ["Smartphones have become ubiquitous.", "Coffee shops are ubiquitous in Tokyo."]}]}',
  ARRAY['omnipresent', 'pervasive', 'universal'], '5', 'vocab',
  NULL, NULL, NULL, NULL),

('{USER_ID}', 'leverage', '/ˈlevərɪdʒ/', '活用する、てこの力',
  '{"pos": "Verb", "meanings": [{"en": "Use something to maximum advantage.", "ja": "何かを最大限に活用する。", "examples": ["We can leverage AI to improve productivity.", "She leveraged her experience to get the promotion."]}]}',
  ARRAY['utilize', 'exploit', 'capitalize on'], '2', 'vocab',
  NULL, NULL, NULL, NULL),

('{USER_ID}', 'nuance', '/ˈnjuːɑːns/', 'ニュアンス、微妙な違い',
  '{"pos": "Noun", "meanings": [{"en": "A subtle difference in meaning or expression.", "ja": "意味や表現の微妙な違い。", "examples": ["The nuances of the Japanese language are fascinating.", "There is an important nuance here that we should not miss."]}]}',
  ARRAY['subtlety', 'distinction', 'shade'], '2', 'vocab',
  NULL, NULL, NULL, NULL)
ON CONFLICT (user_id, word) DO NOTHING;
*/
