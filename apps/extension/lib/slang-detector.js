/**
 * Slang and informal expression detector.
 * Detects contractions, slang, fillers, and informal vocabulary.
 */

let slangData = null;

async function loadData() {
  if (slangData) return;
  const resp = await fetch(chrome.runtime.getURL('data/slang-dictionary.json'));
  slangData = await resp.json();
}

/**
 * Detect slang expressions in a text string.
 * @param {string} text - Raw text to scan
 * @returns {Promise<Array>} Array of { match, start, end, entry }
 */
export async function detectSlang(text) {
  await loadData();
  const lower = text.toLowerCase();
  const results = [];
  const seen = new Set();

  // Sort keys by length (longest first) to prefer longer matches
  const keys = Object.keys(slangData).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    // Word boundary match
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    let m;
    while ((m = regex.exec(lower)) !== null) {
      // Skip if this position is already covered by a longer match
      const posKey = `${m.index}-${m.index + m[0].length}`;
      let overlaps = false;
      for (const s of seen) {
        const [ss, se] = s.split('-').map(Number);
        if (m.index >= ss && m.index < se) { overlaps = true; break; }
        if (m.index + m[0].length > ss && m.index + m[0].length <= se) { overlaps = true; break; }
      }
      if (overlaps) continue;
      seen.add(posKey);

      results.push({
        match: text.slice(m.index, m.index + m[0].length),
        key,
        start: m.index,
        end: m.index + m[0].length,
        entry: slangData[key],
      });
    }
  }

  return results.sort((a, b) => a.start - b.start);
}

/**
 * Check if a single word/phrase is slang.
 * @param {string} word
 * @returns {Promise<Object|null>} Slang entry or null
 */
export async function lookupSlang(word) {
  await loadData();
  return slangData[word.toLowerCase().trim()] || null;
}

/**
 * Get all slang entries (for browsing).
 */
export async function getAllSlang() {
  await loadData();
  return slangData;
}
