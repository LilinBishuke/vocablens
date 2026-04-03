/**
 * Flashcard CRUD operations.
 * Cards are stored as an object keyed by word.
 */

import * as storage from './storage.js';
import { createCardState, processReview, isDue } from './spaced-repetition.js';

const CARDS_KEY = 'flashcards';

/**
 * Get all flashcards.
 * @returns {Promise<Object>} Map of word → card data
 */
export async function getAllCards() {
  return (await storage.get(CARDS_KEY)) || {};
}

/**
 * Add a new flashcard.
 * @param {string} word
 * @param {Object} definition - Dictionary entry
 * @returns {Promise<boolean>} true if added, false if already exists
 */
export async function addCard(word, definition) {
  const cards = await getAllCards();
  word = word.toLowerCase().trim();

  if (cards[word]) return false;

  cards[word] = {
    word,
    definition,
    sm2: createCardState(),
    learned: false,
    createdAt: Date.now(),
  };

  await storage.set(CARDS_KEY, cards);
  await updateBadge();
  return true;
}

/**
 * Remove a flashcard.
 */
export async function removeCard(word) {
  const cards = await getAllCards();
  word = word.toLowerCase().trim();
  delete cards[word];
  await storage.set(CARDS_KEY, cards);
  await updateBadge();
}

/**
 * Check if a word is in the flashcard deck.
 */
export async function hasCard(word) {
  const cards = await getAllCards();
  return !!cards[word.toLowerCase().trim()];
}

/**
 * Review a card with the given quality rating.
 * @param {string} word
 * @param {number} quality - 0, 3, 4, or 5
 */
export async function reviewCard(word, quality) {
  const cards = await getAllCards();
  word = word.toLowerCase().trim();

  if (!cards[word]) return;

  cards[word].sm2 = processReview(cards[word].sm2, quality);
  await storage.set(CARDS_KEY, cards);
  await updateBadge();
}

/**
 * Get all cards that are due for review.
 * @returns {Promise<Array>} Cards sorted by due date (oldest first)
 */
export async function getDueCards() {
  const cards = await getAllCards();
  return Object.values(cards)
    .filter(card => isDue(card.sm2))
    .sort((a, b) => a.sm2.nextReview - b.sm2.nextReview);
}

/**
 * Get total card count and due count.
 */
export async function getStats() {
  const cards = await getAllCards();
  const all = Object.values(cards);
  const due = all.filter(card => isDue(card.sm2));
  return { total: all.length, due: due.length };
}

/**
 * Toggle the "learned" status of a card.
 * @param {string} word
 * @param {boolean} learned
 */
export async function setCardLearned(word, learned) {
  const cards = await getAllCards();
  word = word.toLowerCase().trim();
  if (!cards[word]) return;
  cards[word].learned = learned;
  await storage.set(CARDS_KEY, cards);
}

/**
 * Search cards by word prefix.
 */
export async function searchCards(query) {
  const cards = await getAllCards();
  query = query.toLowerCase().trim();
  if (!query) return Object.values(cards);

  return Object.values(cards).filter(card =>
    card.word.startsWith(query) || card.word.includes(query)
  );
}

/**
 * Update the extension badge with due card count.
 */
export async function updateBadge() {
  try {
    const { due } = await getStats();
    const text = due > 0 ? String(due) : '';
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: due > 0 ? '#ef4444' : '#6c757d' });
  } catch {
    // Badge API may not be available in all contexts
  }
}
