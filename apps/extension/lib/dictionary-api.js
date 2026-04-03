/**
 * Free Dictionary API client with caching.
 * API: https://dictionaryapi.dev/
 */

import * as storage from './storage.js';

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const CACHE_KEY_PREFIX = 'dict_cache_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Look up a word's definition.
 * Uses cache first, then falls back to API via service worker.
 * @param {string} word
 * @returns {Promise<Object|null>} Parsed dictionary entry or null
 */
export async function lookupWord(word) {
  word = word.toLowerCase().trim();

  // Check cache
  const cached = await getFromCache(word);
  if (cached) return cached;

  // Fetch via service worker (to avoid CORS in sidepanel/popup)
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'DICTIONARY_LOOKUP',
      word,
    });

    if (response && response.success) {
      const entry = parseDictionaryResponse(response.data);
      await saveToCache(word, entry);
      return entry;
    }

    return null;
  } catch (err) {
    console.error('Dictionary lookup failed:', err);
    return null;
  }
}

/**
 * Parse raw API response into a clean structure.
 */
function parseDictionaryResponse(data) {
  if (!Array.isArray(data) || data.length === 0) return null;

  const entry = data[0];
  const result = {
    word: entry.word,
    phonetic: entry.phonetic || '',
    phonetics: (entry.phonetics || [])
      .filter(p => p.text || p.audio)
      .map(p => ({ text: p.text || '', audio: p.audio || '' })),
    meanings: [],
  };

  for (const meaning of (entry.meanings || [])) {
    const m = {
      partOfSpeech: meaning.partOfSpeech || '',
      definitions: [],
    };

    for (const def of (meaning.definitions || []).slice(0, 3)) {
      m.definitions.push({
        definition: def.definition || '',
        example: def.example || '',
        synonyms: (def.synonyms || []).slice(0, 5),
      });
    }

    if (m.definitions.length > 0) {
      result.meanings.push(m);
    }
  }

  return result;
}

async function getFromCache(word) {
  const key = CACHE_KEY_PREFIX + word;
  const cached = await storage.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    await storage.remove(key);
    return null;
  }

  return cached.data;
}

async function saveToCache(word, data) {
  const key = CACHE_KEY_PREFIX + word;
  await storage.set(key, { data, timestamp: Date.now() });
}
