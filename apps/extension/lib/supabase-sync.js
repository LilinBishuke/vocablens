/**
 * Supabase sync for VocabLens Chrome Extension.
 * Uses Supabase REST API directly (no npm required).
 * Auth flow: magic link via chrome.identity.launchWebAuthFlow
 */

const SUPABASE_URL = 'https://yjvowlxjhohxlhtoutab.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqdm93bHhqaG9oeGxodG91dGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1OTIyOTQsImV4cCI6MjA5MDE2ODI5NH0.f3F4rMEStr5D-4sFXRtbNixMIWOispgXJCeolIywNps';
const AUTH_STORAGE_KEY = 'vocablens_supabase_session';

function headers(accessToken) {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
  };
}

// ─── Session management ──────────────────────────────────

export async function getSession() {
  const result = await chrome.storage.local.get(AUTH_STORAGE_KEY);
  return result[AUTH_STORAGE_KEY] || null;
}

export async function saveSession(session) {
  await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: session });
}

export async function clearSession() {
  await chrome.storage.local.remove(AUTH_STORAGE_KEY);
}

export async function isLoggedIn() {
  const session = await getSession();
  if (!session) return false;
  // Check token expiry
  return session.expires_at > Date.now() / 1000;
}

// ─── Auth: Magic Link ────────────────────────────────────

export async function sendMagicLink(email) {
  const redirectTo = chrome.identity.getRedirectURL('auth');

  const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email,
      options: { emailRedirectTo: redirectTo },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || 'Magic link failed');
  }
  return true;
}

export async function listenForCallback() {
  const redirectUrl = chrome.identity.getRedirectURL('auth');

  return new Promise((resolve, reject) => {
    // Launch an auth web flow to catch the magic link callback
    chrome.identity.launchWebAuthFlow(
      { url: redirectUrl + '?waiting=true', interactive: false },
      (callbackUrl) => {
        if (chrome.runtime.lastError || !callbackUrl) {
          reject(new Error('Auth cancelled'));
          return;
        }
        const hash = new URL(callbackUrl).hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const expiresIn = parseInt(params.get('expires_in') || '3600');

        if (!accessToken) {
          reject(new Error('No access token'));
          return;
        }

        const session = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        };
        saveSession(session).then(() => resolve(session));
      }
    );
  });
}

// ─── Sync cards to Supabase ──────────────────────────────

export async function syncCardsToSupabase(cards) {
  const session = await getSession();
  if (!session) return { synced: 0, error: 'Not logged in' };

  // Get user ID from token
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: headers(session.access_token),
  });
  if (!userRes.ok) return { synced: 0, error: 'Token invalid' };
  const user = await userRes.json();

  // Ensure profile exists
  await ensureProfile(user, session.access_token);

  // Upsert each card
  const cardList = Object.values(cards);
  let synced = 0;

  for (const card of cardList) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/flashcards`, {
      method: 'POST',
      headers: {
        ...headers(session.access_token),
        'Prefer': 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({
        user_id: user.id,
        word: card.word,
        definition: card.definition,
        sm2_repetitions: card.sm2?.repetitions ?? 0,
        sm2_interval: card.sm2?.interval ?? 0,
        sm2_ease_factor: card.sm2?.easeFactor ?? 2.5,
        sm2_next_review: new Date(card.sm2?.nextReview ?? Date.now()).toISOString(),
        sm2_last_review: card.sm2?.lastReview ? new Date(card.sm2.lastReview).toISOString() : null,
        learned: card.learned ?? false,
        source_type: 'extension',
      }),
    });
    if (res.ok || res.status === 409) synced++;
  }

  return { synced, total: cardList.length };
}

async function ensureProfile(user, accessToken) {
  // Check if profile exists
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=id`,
    { headers: headers(accessToken) }
  );
  const profiles = await res.json();
  if (profiles.length > 0) return;

  // Create profile
  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      ...headers(accessToken),
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      id: user.id,
      display_name: user.email?.split('@')[0],
      invite_code: 'extension',
    }),
  });
}
