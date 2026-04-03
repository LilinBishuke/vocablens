/**
 * Idiom and phrasal expression detector.
 * Detects multi-word idioms in text.
 */

let idiomData = null;
let idiomKeys = [];

async function loadData() {
  if (idiomData) return;
  const resp = await fetch(chrome.runtime.getURL('data/idiom-dictionary.json'));
  idiomData = await resp.json();
  // Sort by length descending so longer idioms match first
  idiomKeys = Object.keys(idiomData).sort((a, b) => b.length - a.length);
}

/**
 * Detect idioms in a text string.
 * @param {string} text - Raw text to scan
 * @returns {Promise<Array>} Array of { match, key, start, end, entry }
 */
export async function detectIdioms(text) {
  await loadData();
  const lower = text.toLowerCase();
  const results = [];
  const covered = []; // Array of [start, end] ranges

  for (const key of idiomKeys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Allow flexible whitespace between words
    const pattern = escaped.replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
    let m;
    while ((m = regex.exec(lower)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;

      // Skip if overlapping with already-matched range
      let overlaps = false;
      for (const [cs, ce] of covered) {
        if (start < ce && end > cs) { overlaps = true; break; }
      }
      if (overlaps) continue;

      covered.push([start, end]);
      results.push({
        match: text.slice(start, end),
        key,
        start,
        end,
        entry: idiomData[key],
      });
    }
  }

  return results.sort((a, b) => a.start - b.start);
}

/**
 * Look up a single idiom.
 * @param {string} phrase
 * @returns {Promise<Object|null>} Idiom entry or null
 */
export async function lookupIdiom(phrase) {
  await loadData();
  return idiomData[phrase.toLowerCase().trim()] || null;
}

/**
 * Get all idiom entries.
 */
export async function getAllIdioms() {
  await loadData();
  return idiomData;
}
