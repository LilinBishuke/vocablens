/**
 * Side panel main script.
 * Per-tab content: results are cached per tab and restored on tab switch.
 * The panel stays open across tabs but shows only the current tab's results.
 */

import { processText } from '../lib/text-processor.js';
import { classifyWords, getLevelDefinitions } from '../lib/classifier.js';
import { lookupWord } from '../lib/dictionary-api.js';
import { translateText } from '../lib/translation-api.js';
import { addCard, hasCard, getAllCards } from '../lib/flashcard-manager.js';
import { getSettings, saveSettings } from '../lib/storage.js';

// Copy icon SVG
const COPY_ICON = `<svg viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 10V3a1.5 1.5 0 011.5-1.5H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function escAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function bindCopyButtons(container) {
  container.querySelectorAll('.copy-btn[data-copy]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.innerHTML = CHECK_ICON;
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = COPY_ICON;
          btn.classList.remove('copied');
        }, 1500);
      } catch (err) {}
    });
  });
}

// DOM elements
const analyzeBtn = document.getElementById('analyzeBtn');
const systemSelect = document.getElementById('systemSelect');
const minLevelSelect = document.getElementById('minLevelSelect');
const pageTitle = document.getElementById('pageTitle');
const stats = document.getElementById('stats');
const totalWordsEl = document.getElementById('totalWords');
const classifiedWordsEl = document.getElementById('classifiedWords');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const errorState = document.getElementById('errorState');
const wordGroups = document.getElementById('wordGroups');
const wordDetail = document.getElementById('wordDetail');
const detailBack = document.getElementById('detailBack');
const detailContent = document.getElementById('detailContent');

// ── Per-tab cache ──
const tabCache = new Map(); // tabId → { wordCounts, results, title, url }

// Current state
let activeTabId = null;
let currentSystem = '5level';
let currentMinLevel = 2;

function getTabData() {
  return tabCache.get(activeTabId) || null;
}

function setTabData(data) {
  tabCache.set(activeTabId, data);
}

// ── Init ──
async function init() {
  const settings = await getSettings();
  currentSystem = settings.classificationSystem || '5level';
  currentMinLevel = settings.minLevel || 2;
  systemSelect.value = currentSystem;
  minLevelSelect.value = currentMinLevel;

  if (settings.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  updateMinLevelOptions();

  analyzeBtn.addEventListener('click', analyzePage);
  systemSelect.addEventListener('change', onSystemChange);
  minLevelSelect.addEventListener('change', onMinLevelChange);
  detailBack.addEventListener('click', showWordList);

  // Get initial active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]) {
    activeTabId = tabs[0].id;
  }

  // Tab switched → show/hide content per tab
  chrome.tabs.onActivated.addListener((activeInfo) => {
    activeTabId = activeInfo.tabId;
    restoreOrReset();
  });

  // Page navigated → clear cache for that tab
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId !== activeTabId) return;
    if (!changeInfo.url) return;
    const cached = tabCache.get(tabId);
    if (cached && cached.url !== changeInfo.url) {
      tabCache.delete(tabId);
      restoreOrReset();
    }
  });

  // Tab closed → clean up
  chrome.tabs.onRemoved.addListener((tabId) => {
    tabCache.delete(tabId);
  });

  // Show empty state initially
  showEmpty();
}

// ── Restore cached results or show empty ──
async function restoreOrReset() {
  wordDetail.style.display = 'none';

  const data = getTabData();
  if (data && data.results) {
    pageTitle.textContent = data.title || '';
    const cardWords = await getCardWordsSet();
    renderWordGroups(data.results, cardWords);
    showWordGroups();
    updateStatsDisplay(data.wordCounts, data.results);
  } else {
    showEmpty();
  }
}

function showEmpty() {
  pageTitle.textContent = '';
  stats.style.display = 'none';
  wordGroups.style.display = 'none';
  wordGroups.innerHTML = '';
  wordDetail.style.display = 'none';
  loadingState.style.display = 'none';
  errorState.style.display = 'none';
  emptyState.style.display = '';
}

// ── Analyze ──
async function analyzePage() {
  showLoading();

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_PAGE_TEXT' });

    if (!response || !response.success) {
      showError(response?.error || 'Failed to extract text from page.');
      return;
    }

    const wordCounts = processText(response.text);

    if (wordCounts.size === 0) {
      showError('No English words found on this page.');
      return;
    }

    const results = await classifyWords(wordCounts, currentSystem, currentMinLevel);

    // Cache for this tab
    setTabData({
      wordCounts,
      results,
      title: response.title || '',
      url: response.url || '',
    });

    pageTitle.textContent = response.title || '';
    const cardWords = await getCardWordsSet();
    renderWordGroups(results, cardWords);
    showWordGroups();
    updateStatsDisplay(wordCounts, results);
  } catch (err) {
    showError('Analysis failed: ' + err.message);
  }
}

async function getCardWordsSet() {
  const cards = await getAllCards();
  return new Set(Object.keys(cards));
}

function updateStatsDisplay(wordCounts, results) {
  const total = wordCounts.size;
  let classified = 0;
  for (const [key, words] of Object.entries(results.groups)) {
    if (key !== 'unknown') classified += words.length;
  }
  totalWordsEl.textContent = total;
  classifiedWordsEl.textContent = classified;
  stats.style.display = '';
}

// ── Re-classify current tab ──
async function reclassifyCurrentTab() {
  const data = getTabData();
  if (!data || !data.wordCounts) return;

  showLoading();
  const results = await classifyWords(data.wordCounts, currentSystem, currentMinLevel);
  data.results = results;
  setTabData(data);

  const cardWords = await getCardWordsSet();
  renderWordGroups(results, cardWords);
  showWordGroups();
  updateStatsDisplay(data.wordCounts, results);
}

async function onSystemChange() {
  currentSystem = systemSelect.value;
  const settings = await getSettings();
  settings.classificationSystem = currentSystem;
  await saveSettings(settings);
  updateMinLevelOptions();
  await reclassifyCurrentTab();
}

async function onMinLevelChange() {
  currentMinLevel = Number(minLevelSelect.value);
  const settings = await getSettings();
  settings.minLevel = currentMinLevel;
  await saveSettings(settings);
  await reclassifyCurrentTab();
}

function updateMinLevelOptions() {
  const levelDefs = getLevelDefinitions(currentSystem);
  const keys = Object.keys(levelDefs);
  minLevelSelect.innerHTML = '';

  keys.forEach((key, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = `${levelDefs[key].label}\u301C`;
    if (i === keys.length - 1) {
      opt.textContent = `${levelDefs[key].label} \u306E\u307F`;
    }
    minLevelSelect.appendChild(opt);
  });

  const allOpt = document.createElement('option');
  allOpt.value = 1;
  allOpt.textContent = '\u5168\u3066\u8868\u793A';
  minLevelSelect.insertBefore(allOpt, minLevelSelect.firstChild);

  if (currentMinLevel <= keys.length) {
    minLevelSelect.value = currentMinLevel;
  } else {
    minLevelSelect.value = 1;
  }
}

// ── Render word groups ──
function renderWordGroups(results, cardWords = new Set()) {
  const { groups, levelDefs } = results;
  wordGroups.innerHTML = '';

  const levelKeys = Object.keys(levelDefs);
  const allKeys = [...levelKeys, 'unknown'];

  for (const key of allKeys) {
    const words = groups[key];
    if (!words || words.length === 0) continue;

    const def = levelDefs[key] || { label: 'Unclassified', color: 'var(--text-muted)', bgColor: 'var(--bg-tertiary)' };

    const group = document.createElement('div');
    group.className = 'word-group';

    const header = document.createElement('div');
    header.className = 'group-header';
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', key !== 'unknown' ? 'true' : 'false');
    header.innerHTML = `
      <div class="group-header-left">
        <span class="group-dot" style="background: ${def.color}"></span>
        <span class="group-label">${def.label}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="group-count">${words.length}</span>
        <svg class="group-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
    `;

    header.addEventListener('click', () => {
      const expanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', !expanded);
    });

    const wordsContainer = document.createElement('div');
    wordsContainer.className = 'group-words';

    const wordList = document.createElement('div');
    wordList.className = 'word-list';

    for (const { word, count } of words) {
      const chip = document.createElement('button');
      const inDeck = cardWords.has(word.toLowerCase());
      chip.className = 'word-chip' + (inDeck ? ' word-chip-added' : '');
      chip.style.background = def.bgColor;
      chip.style.color = def.color;
      chip.innerHTML = `${word}${count > 1 ? `<span class="word-count">\u00D7${count}</span>` : ''}`;
      chip.addEventListener('click', () => showWordDetail(word));
      wordList.appendChild(chip);
    }

    wordsContainer.appendChild(wordList);
    group.appendChild(header);
    group.appendChild(wordsContainer);
    wordGroups.appendChild(group);
  }
}

// ── Word detail ──
async function showWordDetail(word) {
  wordGroups.style.display = 'none';
  wordDetail.style.display = '';

  detailContent.innerHTML = `
    <div class="detail-word">${word}</div>
    <div class="detail-loading">
      <div class="loading-spinner"></div>
      Looking up definition...
    </div>
  `;

  const [entry, wordTranslation] = await Promise.all([
    lookupWord(word),
    translateText(word),
  ]);

  const isInDeck = await hasCard(word);

  if (!entry) {
    detailContent.innerHTML = `
      <div class="detail-word">${word}</div>
      ${wordTranslation ? `<div class="detail-translation">${wordTranslation}</div>` : ''}
      <div class="detail-error">No dictionary entry found for "${word}".</div>
      ${renderAddButton(word, null, isInDeck)}
    `;
    return;
  }

  const phonetic = entry.phonetic || '';
  const wordPhoneticText = phonetic ? `${entry.word}  ${phonetic}` : entry.word;

  let html = `<div class="detail-header-row">
    <div class="detail-word">${entry.word}</div>
    <button class="copy-btn" data-copy="${escAttr(wordPhoneticText)}" title="\u5358\u8A9E\u3068\u767A\u97F3\u3092\u30B3\u30D4\u30FC">${COPY_ICON}</button>
  </div>`;

  if (wordTranslation) {
    html += `<div class="detail-translation">${wordTranslation}</div>`;
  }

  if (phonetic) {
    html += `<div class="detail-phonetic">${phonetic}</div>`;
  }

  const audioUrl = entry.phonetics?.find(p => p.audio)?.audio;
  if (audioUrl) {
    html += `<button class="detail-audio-btn" data-audio="${audioUrl}">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1L3.5 4H1v6h2.5L7 13V1z" fill="currentColor"/>
        <path d="M10 4.5a3.5 3.5 0 010 5M11.5 2.5a6 6 0 010 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      Play
    </button>`;
  }

  html += renderAddButton(word, entry, isInDeck);

  for (const meaning of entry.meanings) {
    html += `<div class="meaning-section">`;
    html += `<div class="meaning-pos">${meaning.partOfSpeech}</div>`;

    for (const def of meaning.definitions) {
      html += `<div class="definition-item">`;
      html += `<div class="definition-text-row">
        <div class="definition-text">${def.definition}</div>
        <button class="copy-btn" data-copy="${escAttr(def.definition)}" title="\u610F\u5473\u3092\u30B3\u30D4\u30FC">${COPY_ICON}</button>
      </div>`;
      html += `<div class="definition-ja" data-translate="${encodeURIComponent(def.definition)}">
        <span class="ja-loading">\u7FFB\u8A33\u4E2D...</span>
      </div>`;
      if (def.example) {
        html += `<div class="definition-example-row">
          <div class="definition-example">"${def.example}"</div>
          <button class="copy-btn" data-copy="${escAttr(def.example)}" title="\u4F8B\u6587\u3092\u30B3\u30D4\u30FC">${COPY_ICON}</button>
        </div>`;
        html += `<div class="example-ja" data-translate="${encodeURIComponent(def.example)}">
          <span class="ja-loading">\u7FFB\u8A33\u4E2D...</span>
        </div>`;
      }
      if (def.synonyms && def.synonyms.length > 0) {
        html += `<div class="definition-synonyms">`;
        for (const syn of def.synonyms) {
          html += `<span class="synonym-chip">${syn}</span>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
  }

  detailContent.innerHTML = html;

  bindCopyButtons(detailContent);

  const audioBtn = detailContent.querySelector('.detail-audio-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      new Audio(audioBtn.dataset.audio).play();
    });
  }

  const addBtn = detailContent.querySelector('.detail-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const success = await addCard(word, entry);
      if (success) {
        addBtn.outerHTML = `<div class="detail-added-badge">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Added to flashcards
        </div>`;
        chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
      }
    });
  }

  loadTranslations();
}

async function loadTranslations() {
  const elements = detailContent.querySelectorAll('[data-translate]');
  for (const el of elements) {
    const text = decodeURIComponent(el.dataset.translate);
    try {
      const translation = await translateText(text);
      if (translation) {
        el.innerHTML = `<span class="ja-text">\u2192 ${translation}</span>`;
      } else {
        el.innerHTML = '';
      }
    } catch (e) {
      el.innerHTML = '';
    }
  }
}

function renderAddButton(word, entry, isInDeck) {
  if (isInDeck) {
    return `<div class="detail-added-badge">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Already in flashcards
    </div>`;
  }
  return `<button class="btn-primary detail-add-btn" data-word="${word}">
    + Add to Flashcards
  </button>`;
}

// ── UI state helpers ──
function showWordList() {
  wordDetail.style.display = 'none';
  const data = getTabData();
  if (data && data.results) {
    wordGroups.style.display = '';
  } else {
    emptyState.style.display = '';
  }
}

function showLoading() {
  emptyState.style.display = 'none';
  errorState.style.display = 'none';
  wordGroups.style.display = 'none';
  wordDetail.style.display = 'none';
  stats.style.display = 'none';
  loadingState.style.display = '';
}

function showWordGroups() {
  loadingState.style.display = 'none';
  emptyState.style.display = 'none';
  errorState.style.display = 'none';
  wordDetail.style.display = 'none';
  wordGroups.style.display = '';
}

function showError(message) {
  loadingState.style.display = 'none';
  emptyState.style.display = 'none';
  wordGroups.style.display = 'none';
  wordDetail.style.display = 'none';
  errorState.style.display = '';
  errorState.textContent = message;
}

init();
