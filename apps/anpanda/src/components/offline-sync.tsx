"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getPendingReviews,
  clearPendingReviews,
  cacheFlashcards,
} from "@/lib/utils/idb";

export function OfflineSync() {
  useEffect(() => {
    // Sync when coming back online
    const handleOnline = () => syncReviews();
    window.addEventListener("online", handleOnline);

    // Listen for SW sync message
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "SYNC_REVIEWS") {
        syncReviews();
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleMessage);

    // Pre-cache review deck on load
    prefetchDeck();

    return () => {
      window.removeEventListener("online", handleOnline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}

async function syncReviews() {
  try {
    const pending = await getPendingReviews();
    if (pending.length === 0) return;

    const supabase = createClient();

    for (const review of pending) {
      await Promise.all([
        supabase
          .from("flashcards")
          .update({
            sm2_repetitions: review.sm2_update.repetitions,
            sm2_interval: review.sm2_update.interval,
            sm2_ease_factor: review.sm2_update.ease_factor,
            sm2_next_review: review.sm2_update.next_review,
            sm2_last_review: review.reviewed_at,
          })
          .eq("id", review.flashcard_id),
        supabase.from("review_history").insert({
          user_id: review.user_id,
          flashcard_id: review.flashcard_id,
          mode: review.mode,
          quality: review.quality,
          is_correct: review.is_correct,
        }),
      ]);
    }

    await clearPendingReviews();
  } catch {
    // Will retry on next online event
  }
}

async function prefetchDeck() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: cards } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("learned", false)
      .lte("sm2_next_review", new Date().toISOString())
      .limit(20);

    if (cards && cards.length > 0) {
      await cacheFlashcards(cards);
    }
  } catch {
    // Offline — use existing cache
  }
}
