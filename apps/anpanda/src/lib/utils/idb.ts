"use client";

import type { Flashcard } from "@/lib/types";

const DB_NAME = "anpan-offline";
const DB_VERSION = 1;

interface PendingReview {
  id: string;
  flashcard_id: string;
  user_id: string;
  mode: string;
  quality: number;
  is_correct: boolean;
  reviewed_at: string;
  sm2_update: {
    repetitions: number;
    interval: number;
    ease_factor: number;
    next_review: string;
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains("flashcards")) {
        const store = db.createObjectStore("flashcards", { keyPath: "id" });
        store.createIndex("byNextReview", "sm2_next_review");
        store.createIndex("byWord", "word", { unique: false });
      }

      if (!db.objectStoreNames.contains("pendingReviews")) {
        const store = db.createObjectStore("pendingReviews", { keyPath: "id" });
        store.createIndex("byDate", "reviewed_at");
      }

      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Cache flashcards for offline use */
export async function cacheFlashcards(cards: Flashcard[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("flashcards", "readwrite");
  const store = tx.objectStore("flashcards");

  for (const card of cards) {
    store.put(card);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get cached flashcards due for review */
export async function getCachedDueCards(): Promise<Flashcard[]> {
  const db = await openDB();
  const tx = db.transaction("flashcards", "readonly");
  const store = tx.objectStore("flashcards");

  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const now = new Date().toISOString();
      const due = (req.result as Flashcard[]).filter(
        (c) => !c.learned && !c.deleted_at && c.sm2_next_review <= now
      );
      resolve(due);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Queue a review for later sync */
export async function queuePendingReview(
  review: PendingReview
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("pendingReviews", "readwrite");
  tx.objectStore("pendingReviews").put(review);

  // Also update the cached flashcard
  const cardTx = db.transaction("flashcards", "readwrite");
  const cardStore = cardTx.objectStore("flashcards");
  const getReq = cardStore.get(review.flashcard_id);

  getReq.onsuccess = () => {
    const card = getReq.result as Flashcard | undefined;
    if (card) {
      card.sm2_repetitions = review.sm2_update.repetitions;
      card.sm2_interval = review.sm2_update.interval;
      card.sm2_ease_factor = review.sm2_update.ease_factor;
      card.sm2_next_review = review.sm2_update.next_review;
      card.sm2_last_review = review.reviewed_at;
      cardStore.put(card);
    }
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all pending reviews to sync */
export async function getPendingReviews(): Promise<PendingReview[]> {
  const db = await openDB();
  const tx = db.transaction("pendingReviews", "readonly");

  return new Promise((resolve, reject) => {
    const req = tx.objectStore("pendingReviews").getAll();
    req.onsuccess = () => resolve(req.result as PendingReview[]);
    req.onerror = () => reject(req.error);
  });
}

/** Clear synced reviews */
export async function clearPendingReviews(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("pendingReviews", "readwrite");
  tx.objectStore("pendingReviews").clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
