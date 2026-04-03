/**
 * Translation API client using MyMemory (free, no API key needed).
 * Supports translating English to Japanese, Chinese, etc.
 */

import * as storage from './storage.js';

const CACHE_KEY_PREFIX = 'trans_cache_';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Translate text to the user's native language.
 * @param {string} text - English text to translate
 * @param {string} [targetLang] - Target language code (e.g. 'ja', 'zh'). If omitted, uses settings.
 * @returns {Promise<string|null>} Translation or null
 */
export async function translateText(text, targetLang) {
  if (!text || !text.trim()) return null;
  text = text.trim();

  if (!targetLang) {
    const settings = await storage.getSettings();
    targetLang = settings.nativeLanguage || 'ja';
  }

  // No translation needed if target is English
  if (targetLang === 'en') return null;

  // Check cache (include target lang in cache key)
  const cached = await getFromCache(text, targetLang);
  if (cached) return cached;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE',
      text,
      from: 'en',
      to: targetLang,
    });

    if (response && response.success && response.translation) {
      await saveToCache(text, targetLang, response.translation);
      return response.translation;
    }

    return null;
  } catch (err) {
    console.error('Translation failed:', err);
    return null;
  }
}

// Keep backward-compatible alias
export const translateToJapanese = (text) => translateText(text, 'ja');

async function getFromCache(text, lang) {
  const key = CACHE_KEY_PREFIX + lang + '_' + hashCode(text);
  const cached = await storage.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    await storage.remove(key);
    return null;
  }

  return cached.data;
}

async function saveToCache(text, lang, translation) {
  const key = CACHE_KEY_PREFIX + lang + '_' + hashCode(text);
  await storage.set(key, { data: translation, timestamp: Date.now() });
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return String(Math.abs(hash));
}
