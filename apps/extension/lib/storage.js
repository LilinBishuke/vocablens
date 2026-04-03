/**
 * Chrome Storage abstraction layer.
 * Wraps chrome.storage.local with async/await and key namespacing.
 */

const STORAGE_PREFIX = 'vocablens_';

function prefixKey(key) {
  return STORAGE_PREFIX + key;
}

export async function get(key) {
  const prefixed = prefixKey(key);
  const result = await chrome.storage.local.get(prefixed);
  return result[prefixed] ?? null;
}

export async function set(key, value) {
  await chrome.storage.local.set({ [prefixKey(key)]: value });
}

export async function remove(key) {
  await chrome.storage.local.remove(prefixKey(key));
}

export async function getMultiple(keys) {
  const prefixedKeys = keys.map(prefixKey);
  const result = await chrome.storage.local.get(prefixedKeys);
  const out = {};
  for (const key of keys) {
    out[key] = result[prefixKey(key)] ?? null;
  }
  return out;
}

export async function setMultiple(entries) {
  const prefixed = {};
  for (const [key, value] of Object.entries(entries)) {
    prefixed[prefixKey(key)] = value;
  }
  await chrome.storage.local.set(prefixed);
}

export async function getSettings() {
  const defaults = {
    classificationSystem: '5level',
    theme: 'light',
    minLevel: 2,
    hideLearnedCards: true,
    nativeLanguage: 'ja',
  };
  const stored = await get('settings');
  return { ...defaults, ...(stored || {}) };
}

export async function saveSettings(settings) {
  await set('settings', settings);
}
