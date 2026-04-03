import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & {
  clients: { matchAll(): Promise<{ postMessage(msg: unknown): void }[]> };
  addEventListener(type: "sync", listener: (event: { tag: string; waitUntil(p: Promise<void>): void }) => void): void;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

// Background sync for offline reviews
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-reviews") {
    event.waitUntil(syncPendingReviews());
  }
});

async function syncPendingReviews() {
  // Will be called when online — reads from IndexedDB and pushes to Supabase
  // Implementation relies on the client-side IndexedDB helper
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: "SYNC_REVIEWS" });
  }
}

serwist.addEventListeners();
