/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Quality ratings:
 *   0 = Again (complete blackout)
 *   3 = Hard  (correct but with difficulty)
 *   4 = Good  (correct with some hesitation)
 *   5 = Easy  (perfect response)
 */

interface SM2Params {
  repetitions: number;
  interval: number;
  easeFactor: number;
}

interface SM2Result extends SM2Params {
  nextReview: Date;
}

export function calculateSM2(
  params: SM2Params,
  quality: number
): SM2Result {
  let { repetitions, interval, easeFactor } = params;

  if (quality < 3) {
    // Failed — reset
    repetitions = 0;
    interval = 0;
  } else {
    // Passed
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor
  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + (interval || 0));

  // If failed, review again in 10 minutes (for same-session)
  if (quality < 3) {
    nextReview.setTime(Date.now() + 10 * 60 * 1000);
  }

  return {
    repetitions,
    interval,
    easeFactor: Math.round(easeFactor * 100) / 100,
    nextReview,
  };
}

export const QUALITY_MAP = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
} as const;

export type QualityLabel = keyof typeof QUALITY_MAP;
