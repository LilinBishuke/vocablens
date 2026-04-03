import { create } from "zustand";
import type { Flashcard } from "@/lib/types";

export type ReviewMode = "card" | "writing";

interface SessionStats {
  total: number;
  correct: number;
  ratings: Record<string, number>; // "again" | "hard" | "good" | "easy" → count
}

interface ReviewState {
  deck: Flashcard[];
  currentIndex: number;
  mode: ReviewMode;
  isFlipped: boolean;
  isComplete: boolean;
  sessionStats: SessionStats;

  // Writing mode
  writingAnswer: string;
  writingResult: "correct" | "incorrect" | null;
  showHint: boolean;

  // Actions
  startSession: (cards: Flashcard[]) => void;
  flipCard: () => void;
  rateCard: (label: string, isCorrect: boolean) => void;
  nextCard: () => void;
  switchMode: (mode: ReviewMode) => void;
  setWritingAnswer: (answer: string) => void;
  submitWritingAnswer: () => void;
  toggleHint: () => void;
  reset: () => void;
}

const initialStats: SessionStats = {
  total: 0,
  correct: 0,
  ratings: { again: 0, hard: 0, good: 0, easy: 0 },
};

export const useReviewStore = create<ReviewState>((set, get) => ({
  deck: [],
  currentIndex: 0,
  mode: "card",
  isFlipped: false,
  isComplete: false,
  sessionStats: { ...initialStats },

  writingAnswer: "",
  writingResult: null,
  showHint: false,

  startSession: (cards) =>
    set({
      deck: shuffle(cards),
      currentIndex: 0,
      mode: "card",
      isFlipped: false,
      isComplete: false,
      sessionStats: { ...initialStats, total: 0, correct: 0, ratings: { again: 0, hard: 0, good: 0, easy: 0 } },
      writingAnswer: "",
      writingResult: null,
      showHint: false,
    }),

  flipCard: () => set({ isFlipped: true }),

  rateCard: (label, isCorrect) =>
    set((state) => ({
      sessionStats: {
        total: state.sessionStats.total + 1,
        correct: state.sessionStats.correct + (isCorrect ? 1 : 0),
        ratings: {
          ...state.sessionStats.ratings,
          [label]: (state.sessionStats.ratings[label] ?? 0) + 1,
        },
      },
    })),

  nextCard: () => {
    const { currentIndex, deck } = get();
    if (currentIndex + 1 >= deck.length) {
      set({ isComplete: true });
    } else {
      set({
        currentIndex: currentIndex + 1,
        isFlipped: false,
        writingAnswer: "",
        writingResult: null,
        showHint: false,
      });
    }
  },

  switchMode: (mode) =>
    set({
      mode,
      isFlipped: false,
      writingAnswer: "",
      writingResult: null,
      showHint: false,
    }),

  setWritingAnswer: (answer) => set({ writingAnswer: answer }),

  submitWritingAnswer: () => {
    const { deck, currentIndex, writingAnswer } = get();
    const card = deck[currentIndex];
    if (!card) return;

    const isCorrect =
      writingAnswer.trim().toLowerCase() === card.word.toLowerCase();

    set({ writingResult: isCorrect ? "correct" : "incorrect" });
  },

  toggleHint: () => set((s) => ({ showHint: !s.showHint })),

  reset: () =>
    set({
      deck: [],
      currentIndex: 0,
      mode: "card",
      isFlipped: false,
      isComplete: false,
      sessionStats: { ...initialStats },
      writingAnswer: "",
      writingResult: null,
      showHint: false,
    }),
}));

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
