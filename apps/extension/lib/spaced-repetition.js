/**
 * SM-2 Spaced Repetition Algorithm.
 *
 * Quality ratings:
 *   0 (Again)  - Complete blackout, no recall
 *   3 (Hard)   - Recalled with serious difficulty
 *   4 (Good)   - Recalled with some hesitation
 *   5 (Easy)   - Perfect, instant recall
 */

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

/**
 * Create a new card's SM-2 state.
 */
export function createCardState() {
  return {
    repetitions: 0,
    interval: 0,        // days
    easeFactor: DEFAULT_EASE_FACTOR,
    nextReview: Date.now(), // due immediately
    lastReview: null,
  };
}

/**
 * Process a review and return the updated card state.
 * @param {Object} state - Current SM-2 state
 * @param {number} quality - Rating: 0, 3, 4, or 5
 * @returns {Object} Updated state
 */
export function processReview(state, quality) {
  const newState = { ...state };
  newState.lastReview = Date.now();

  if (quality < 3) {
    // Failed: reset repetitions, short interval
    newState.repetitions = 0;
    newState.interval = 1;
  } else {
    // Successful recall
    if (newState.repetitions === 0) {
      newState.interval = 1;
    } else if (newState.repetitions === 1) {
      newState.interval = 6;
    } else {
      newState.interval = Math.round(newState.interval * newState.easeFactor);
    }
    newState.repetitions += 1;
  }

  // Update ease factor
  newState.easeFactor = newState.easeFactor +
    (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newState.easeFactor = Math.max(MIN_EASE_FACTOR, newState.easeFactor);

  // Set next review date
  newState.nextReview = Date.now() + newState.interval * 24 * 60 * 60 * 1000;

  return newState;
}

/**
 * Check if a card is due for review.
 */
export function isDue(state) {
  return Date.now() >= state.nextReview;
}

/**
 * Get a human-readable next review description.
 */
export function getNextReviewLabel(state) {
  const diff = state.nextReview - Date.now();
  if (diff <= 0) return 'Now';

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day';
  return `${days} days`;
}
