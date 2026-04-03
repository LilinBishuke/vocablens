export interface Flashcard {
  id: string;
  user_id: string;
  word: string;
  phonetic: string | null;
  translation: string | null;
  definition: {
    pos: string;
    meanings: {
      en: string;
      ja: string;
      examples: string[];
    }[];
  } | null;
  synonyms: string[] | null;
  level: string | null;
  type: "vocab" | "slang" | "idiom";

  sm2_repetitions: number;
  sm2_interval: number;
  sm2_ease_factor: number;
  sm2_next_review: string;
  sm2_last_review: string | null;

  learned: boolean;

  source_url: string | null;
  source_title: string | null;
  source_type: "video" | "webpage" | null;
  source_timestamp: string | null;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ReviewSession {
  id: string;
  user_id: string;
  cards_reviewed: number;
  correct_count: number;
  total_count: number;
  completed_at: string;
}

export interface UserStats {
  totalCards: number;
  learnedCount: number;
  accuracyPercent: number;
  dueCount: number;
}

export interface Puzzle {
  id: string;
  name: string;
  image_url: string | null;
  icon: string | null;
  grid_cols: number;
  grid_rows: number;
  total_pieces: number;
  reviews_per_piece: number;
  sort_order: number;
}

export interface UserPuzzle {
  id: string;
  user_id: string;
  puzzle_id: string;
  pieces_revealed: number;
  is_active: boolean;
  started_at: string;
  completed_at: string | null;
  puzzle?: Puzzle;
}
