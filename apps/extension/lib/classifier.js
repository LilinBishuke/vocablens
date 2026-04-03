/**
 * Word level classification engine.
 * Supports: 5-level (中学〜上級), CEFR (A1-C2), Frequency bands, 3-tier.
 */

let cefrData = null;
let frequencyData = null;
let tierMapping = null;

// Reverse lookup maps: word → level
let cefrLookup = null;
let frequencyLookup = null;

// 5-level system mapping from CEFR
const CEFR_TO_5LEVEL = {
  A1: '1',
  A2: '2',
  B1: '3',
  B2: '4',
  C1: '5',
  C2: '5',
};

const FREQ_TO_5LEVEL = {
  '1k': '1',
  '2k': '2',
  '3k': '3',
  'academic': '4',
  'advanced': '5',
};

// Ordered level keys for each system (for filtering)
const LEVEL_ORDER = {
  '5level': ['1', '2', '3', '4', '5'],
  'cefr': ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
  'frequency': ['1k', '2k', '3k', 'academic', 'advanced'],
  'tier': ['beginner', 'intermediate', 'advanced'],
};

async function loadData() {
  if (cefrData && frequencyData && tierMapping) return;

  const [cefrResp, freqResp, tierResp] = await Promise.all([
    fetch(chrome.runtime.getURL('data/cefr-wordlist.json')),
    fetch(chrome.runtime.getURL('data/frequency-wordlist.json')),
    fetch(chrome.runtime.getURL('data/tier-mapping.json')),
  ]);

  cefrData = await cefrResp.json();
  frequencyData = await freqResp.json();
  tierMapping = await tierResp.json();

  // Build reverse lookups
  cefrLookup = new Map();
  for (const [level, words] of Object.entries(cefrData)) {
    for (const word of words) {
      cefrLookup.set(word, level);
    }
  }

  frequencyLookup = new Map();
  for (const [band, words] of Object.entries(frequencyData)) {
    for (const word of words) {
      frequencyLookup.set(word, band);
    }
  }
}

/**
 * Get the ordered level keys for a given system.
 */
export function getLevelOrder(system) {
  return LEVEL_ORDER[system] || [];
}

/**
 * Classify a list of words by the given system.
 * @param {Map<string, number>} wordCounts
 * @param {string} system
 * @param {number} minLevel - Minimum level index (1-based) to include. Words below this are excluded.
 * @returns {Promise<Object>} Grouped words with metadata
 */
export async function classifyWords(wordCounts, system = '5level', minLevel = 1) {
  await loadData();

  const groups = {};
  const levelDefs = getLevelDefinitions(system);
  const levelKeys = LEVEL_ORDER[system] || Object.keys(levelDefs);
  const minIndex = Math.max(0, minLevel - 1); // convert to 0-based

  // Initialize groups
  for (const key of levelKeys) {
    groups[key] = [];
  }
  groups['unknown'] = [];

  for (const [word, count] of wordCounts) {
    const level = classifyWord(word, system);
    if (!level) {
      groups['unknown'].push({ word, count });
      continue;
    }

    // Filter by min level
    const levelIndex = levelKeys.indexOf(level);
    if (levelIndex < minIndex) continue; // Skip words below minimum level

    if (!groups[level]) groups[level] = [];
    groups[level].push({ word, count });
  }

  // Sort each group by count (descending), then alphabetically
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  }

  return { groups, levelDefs };
}

/**
 * Classify a single word.
 */
function classifyWord(word, system) {
  switch (system) {
    case '5level': {
      const cefrLevel = cefrLookup.get(word);
      if (cefrLevel) return CEFR_TO_5LEVEL[cefrLevel];
      const freqBand = frequencyLookup.get(word);
      if (freqBand) return FREQ_TO_5LEVEL[freqBand];
      return null;
    }

    case 'cefr':
      return cefrLookup.get(word) || null;

    case 'frequency':
      return frequencyLookup.get(word) || null;

    case 'tier': {
      const cefrLevel = cefrLookup.get(word);
      if (cefrLevel) return tierMapping.fromCEFR[cefrLevel];
      const freqBand = frequencyLookup.get(word);
      if (freqBand) return tierMapping.fromFrequency[freqBand];
      return null;
    }

    default:
      return null;
  }
}

/**
 * Get level definitions (labels, colors) for a classification system.
 */
export function getLevelDefinitions(system) {
  switch (system) {
    case '5level':
      return {
        '1': { label: 'Lv.1 中学英語', color: 'var(--color-lv1)', bgColor: 'var(--color-lv1-bg)' },
        '2': { label: 'Lv.2 高校基礎', color: 'var(--color-lv2)', bgColor: 'var(--color-lv2-bg)' },
        '3': { label: 'Lv.3 高校発展', color: 'var(--color-lv3)', bgColor: 'var(--color-lv3-bg)' },
        '4': { label: 'Lv.4 大学・資格', color: 'var(--color-lv4)', bgColor: 'var(--color-lv4-bg)' },
        '5': { label: 'Lv.5 上級・専門', color: 'var(--color-lv5)', bgColor: 'var(--color-lv5-bg)' },
      };

    case 'cefr':
      return {
        A1: { label: 'A1 - Beginner', color: 'var(--color-a1)', bgColor: 'var(--color-a1-bg)' },
        A2: { label: 'A2 - Elementary', color: 'var(--color-a2)', bgColor: 'var(--color-a2-bg)' },
        B1: { label: 'B1 - Intermediate', color: 'var(--color-b1)', bgColor: 'var(--color-b1-bg)' },
        B2: { label: 'B2 - Upper Intermediate', color: 'var(--color-b2)', bgColor: 'var(--color-b2-bg)' },
        C1: { label: 'C1 - Advanced', color: 'var(--color-c1)', bgColor: 'var(--color-c1-bg)' },
        C2: { label: 'C2 - Proficiency', color: 'var(--color-c2)', bgColor: 'var(--color-c2-bg)' },
      };

    case 'frequency':
      return {
        '1k': { label: 'Top 1000', color: 'var(--color-1k)', bgColor: 'var(--color-1k-bg)' },
        '2k': { label: '1001-2000', color: 'var(--color-2k)', bgColor: 'var(--color-2k-bg)' },
        '3k': { label: '2001-3000', color: 'var(--color-3k)', bgColor: 'var(--color-3k-bg)' },
        'academic': { label: 'Academic', color: 'var(--color-academic)', bgColor: 'var(--color-academic-bg)' },
        'advanced': { label: 'Advanced', color: 'var(--color-advanced)', bgColor: 'var(--color-advanced-bg)' },
      };

    case 'tier':
      return {
        beginner: tierMapping.tiers.beginner,
        intermediate: tierMapping.tiers.intermediate,
        advanced: tierMapping.tiers.advanced,
      };

    default:
      return {};
  }
}
