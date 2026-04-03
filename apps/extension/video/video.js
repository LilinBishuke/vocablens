/**
 * VocabLens Video - Dedicated video learning page.
 * URL input → embed player → subtitle timeline → vocab analysis → word detail → flashcard.
 */

import { extractVideoId, getVideoInfo, fetchSubtitles, groupSubtitles, formatTime } from '../lib/subtitle-extractor.js';
import { processText, tokenize, lemmatize, isStopWord } from '../lib/text-processor.js';
import { classifyWords, getLevelDefinitions, getLevelOrder } from '../lib/classifier.js';
import { detectSlang, lookupSlang } from '../lib/slang-detector.js';
import { detectIdioms, lookupIdiom } from '../lib/idiom-detector.js';
import { lookupWord } from '../lib/dictionary-api.js';
import { translateText } from '../lib/translation-api.js';
import { addCard, hasCard } from '../lib/flashcard-manager.js';
import { getSettings, saveSettings } from '../lib/storage.js';
import * as storage from '../lib/storage.js';

// ── State ──
let currentVideoId = null;
let player = null;
let segments = []; // Grouped subtitle segments
let wordLevels = new Map(); // lemma → level
let levelDefs = {};
let slangMatches = []; // Per-segment slang matches
let idiomMatches = []; // Per-segment idiom matches
let currentSystem = '5level';
let selectedWord = null;

// ── DOM ──
const urlInput = document.getElementById('urlInput');
const loadBtn = document.getElementById('loadBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const settingSystem = document.getElementById('settingSystem');
const settingLang = document.getElementById('settingLang');
const settingTheme = document.getElementById('settingTheme');
const emptyState = document.getElementById('emptyState');
const videoSection = document.getElementById('videoSection');
const playerContainer = document.getElementById('playerContainer');
const videoTitle = document.getElementById('videoTitle');
const bookmarkBtn = document.getElementById('bookmarkBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const toggleBar = document.getElementById('toggleBar');
const toggleTranslation = document.getElementById('toggleTranslation');
const toggleVocab = document.getElementById('toggleVocab');
const toggleSlang = document.getElementById('toggleSlang');
const toggleIdiom = document.getElementById('toggleIdiom');
const minLevelSelect = document.getElementById('minLevelSelect');
const subtitleLoading = document.getElementById('subtitleLoading');
const subtitleError = document.getElementById('subtitleError');
const srtUpload = document.getElementById('srtUpload');
const srtFileInput = document.getElementById('srtFileInput');
const subtitleTimeline = document.getElementById('subtitleTimeline');
const subtitleList = document.getElementById('subtitleList');
const detailEmpty = document.getElementById('detailEmpty');
const detailContent = document.getElementById('detailContent');
const librarySidebar = document.getElementById('librarySidebar');
const libraryList = document.getElementById('libraryList');
const libraryCount = document.getElementById('libraryCount');

// ── Init ──
async function init() {
  const settings = await getSettings();
  currentSystem = settings.classificationSystem || '5level';
  settingSystem.value = currentSystem;
  settingLang.value = settings.nativeLanguage || 'ja';
  settingTheme.value = settings.theme || 'light';
  minLevelSelect.value = settings.minLevel || 2;

  if (settings.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Events
  loadBtn.addEventListener('click', loadVideo);
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadVideo(); });
  settingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? '' : 'none';
  });

  settingSystem.addEventListener('change', async () => {
    currentSystem = settingSystem.value;
    const s = await getSettings();
    s.classificationSystem = currentSystem;
    await saveSettings(s);
    if (segments.length > 0) reanalyze();
  });

  settingLang.addEventListener('change', async () => {
    const s = await getSettings();
    s.nativeLanguage = settingLang.value;
    await saveSettings(s);
    if (segments.length > 0) renderSubtitles();
  });

  settingTheme.addEventListener('change', async () => {
    const s = await getSettings();
    s.theme = settingTheme.value;
    await saveSettings(s);
    if (settingTheme.value === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  });

  analyzeBtn.addEventListener('click', analyzeSubtitles);
  bookmarkBtn.addEventListener('click', toggleBookmark);

  // Display toggles
  toggleTranslation.addEventListener('change', renderSubtitles);
  toggleVocab.addEventListener('change', renderSubtitles);
  toggleSlang.addEventListener('change', renderSubtitles);
  toggleIdiom.addEventListener('change', renderSubtitles);
  minLevelSelect.addEventListener('change', async () => {
    const s = await getSettings();
    s.minLevel = Number(minLevelSelect.value);
    await saveSettings(s);
    renderSubtitles();
  });

  // SRT upload
  srtFileInput.addEventListener('change', handleSrtUpload);

  // Load library
  await renderLibrary();

  // Check URL params
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get('url') || params.get('v');
  if (urlParam) {
    urlInput.value = urlParam;
    loadVideo();
  }
}

// ── Video Loading ──
async function loadVideo() {
  const url = urlInput.value.trim();
  if (!url) return;

  const videoId = extractVideoId(url);
  if (!videoId) {
    showError('有効なYouTube URLを入力してください');
    return;
  }

  currentVideoId = videoId;
  resetState();

  // Show video section
  emptyState.style.display = 'none';
  videoSection.style.display = '';

  // Show thumbnail with link to open YouTube in a new tab
  const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  playerContainer.innerHTML = `
    <div class="player-placeholder">
      <img src="${thumbUrl}" class="player-thumb"
        onerror="this.src='https://img.youtube.com/vi/${videoId}/hqdefault.jpg'" alt="">
      <div class="player-overlay">
        <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="player-play-btn">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="26" fill="rgba(255,0,0,0.85)" stroke="white" stroke-width="2"/>
            <polygon points="23,16 23,40 41,28" fill="white"/>
          </svg>
          <span>YouTubeで再生</span>
        </a>
      </div>
    </div>`;

  // Fetch video info
  const info = await getVideoInfo(videoId);
  videoTitle.textContent = info.title || 'Video';

  // Update bookmark button state
  const bookmarks = await getBookmarks();
  if (bookmarks[videoId]) {
    bookmarkBtn.classList.add('bookmark-active');
    bookmarkBtn.querySelector('svg').setAttribute('fill', 'currentColor');
  }
}

function resetState() {
  segments = [];
  wordLevels = new Map();
  slangMatches = [];
  idiomMatches = [];
  selectedWord = null;
  toggleBar.style.display = 'none';
  subtitleTimeline.style.display = 'none';
  subtitleLoading.style.display = 'none';
  subtitleError.style.display = 'none';
  srtUpload.style.display = 'none';
  subtitleList.innerHTML = '';
  detailContent.style.display = 'none';
  detailEmpty.style.display = '';
  bookmarkBtn.classList.remove('bookmark-active');
  bookmarkBtn.querySelector('svg').removeAttribute('fill');
}

// ── Subtitle Analysis ──
async function analyzeSubtitles() {
  if (!currentVideoId) return;

  subtitleLoading.style.display = '';
  subtitleError.style.display = 'none';
  srtUpload.style.display = 'none';

  try {
    const rawSubs = await fetchSubtitles(currentVideoId, 'en');
    if (!rawSubs || rawSubs.length === 0) {
      subtitleLoading.style.display = 'none';
      srtUpload.style.display = '';
      return;
    }

    segments = groupSubtitles(rawSubs);
    await analyzeSegments();

    subtitleLoading.style.display = 'none';
    toggleBar.style.display = '';
    subtitleTimeline.style.display = '';
    renderSubtitles();

    // Update bookmark with word count
    await updateBookmarkProgress();
  } catch (err) {
    subtitleLoading.style.display = 'none';
    showError('字幕の取得に失敗しました: ' + err.message);
    srtUpload.style.display = '';
  }
}

async function analyzeSegments() {
  // Combine all segment text for vocab analysis
  const allText = segments.map(s => s.text).join(' ');

  // Vocabulary classification
  const wordCounts = processText(allText);
  const { groups, levelDefs: ld } = await classifyWords(wordCounts, currentSystem, 1);
  levelDefs = ld;

  // Build word → level map
  wordLevels = new Map();
  for (const [level, words] of Object.entries(groups)) {
    if (level === 'unknown') continue;
    for (const { word } of words) {
      wordLevels.set(word, level);
    }
  }

  // Detect slang and idioms per segment
  slangMatches = [];
  idiomMatches = [];
  for (const seg of segments) {
    slangMatches.push(await detectSlang(seg.text));
    idiomMatches.push(await detectIdioms(seg.text));
  }
}

async function reanalyze() {
  if (segments.length === 0) return;
  await analyzeSegments();
  renderSubtitles();
}

// ── SRT/VTT Upload ──
function handleSrtUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const content = ev.target.result;
    const parsed = parseSrtVtt(content);
    if (parsed.length === 0) {
      showError('字幕ファイルの解析に失敗しました');
      return;
    }
    segments = groupSubtitles(parsed);
    await analyzeSegments();

    srtUpload.style.display = 'none';
    toggleBar.style.display = '';
    subtitleTimeline.style.display = '';
    renderSubtitles();
  };
  reader.readAsText(file);
}

function parseSrtVtt(content) {
  const lines = content.split(/\r?\n/);
  const subs = [];
  let i = 0;

  while (i < lines.length) {
    // Skip WebVTT header
    if (lines[i].startsWith('WEBVTT') || lines[i].startsWith('NOTE')) { i++; continue; }
    // Skip blank lines and cue numbers
    if (!lines[i].trim() || /^\d+$/.test(lines[i].trim())) { i++; continue; }

    // Try to parse timestamp line
    const tsMatch = lines[i].match(
      /(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})/
    );
    if (tsMatch) {
      const startH = parseInt(tsMatch[1] || '0');
      const startM = parseInt(tsMatch[2]);
      const startS = parseInt(tsMatch[3]);
      const startMs = parseInt(tsMatch[4]);
      const start = startH * 3600 + startM * 60 + startS + startMs / 1000;

      const dur_endH = parseInt(tsMatch[5] || '0');
      const dur_endM = parseInt(tsMatch[6]);
      const dur_endS = parseInt(tsMatch[7]);
      const dur_endMs = parseInt(tsMatch[8]);
      const end = dur_endH * 3600 + dur_endM * 60 + dur_endS + dur_endMs / 1000;

      i++;
      const textLines = [];
      while (i < lines.length && lines[i].trim()) {
        textLines.push(lines[i].trim().replace(/<[^>]+>/g, ''));
        i++;
      }
      if (textLines.length > 0) {
        subs.push({ start, duration: end - start, text: textLines.join(' ') });
      }
    } else {
      i++;
    }
  }
  return subs;
}

// ── Rendering ──
function renderSubtitles() {
  subtitleList.innerHTML = '';
  const showTranslation = toggleTranslation.checked;
  const showVocab = toggleVocab.checked;
  const showSlang = toggleSlang.checked;
  const showIdiom = toggleIdiom.checked;
  const minLevel = Number(minLevelSelect.value);
  const levelKeys = getLevelOrder(currentSystem);

  segments.forEach((seg, idx) => {
    const segEl = document.createElement('div');
    segEl.className = 'subtitle-segment';
    segEl.dataset.index = idx;

    // Time
    const timeEl = document.createElement('div');
    timeEl.className = 'subtitle-time';
    timeEl.textContent = formatTime(seg.start);
    timeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      seekTo(seg.start);
    });

    // Text wrap
    const textWrap = document.createElement('div');
    textWrap.className = 'subtitle-text-wrap';

    // Annotated text
    const textEl = document.createElement('div');
    textEl.className = 'subtitle-text';
    textEl.innerHTML = annotateText(seg.text, idx, {
      showVocab, showSlang, showIdiom, minLevel, levelKeys,
    });

    textWrap.appendChild(textEl);

    // Translation
    if (showTranslation) {
      const transEl = document.createElement('div');
      transEl.className = 'subtitle-translation';
      transEl.textContent = '翻訳中...';
      textWrap.appendChild(transEl);
      translateText(seg.text).then(t => {
        transEl.textContent = t || '';
        if (!t) transEl.remove();
      });
    }

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'subtitle-copy-btn';
    copyBtn.title = 'コピー';
    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 10V3a1.5 1.5 0 011.5-1.5H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(seg.text).then(() => {
        copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 10V3a1.5 1.5 0 011.5-1.5H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
          copyBtn.classList.remove('copied');
        }, 1500);
      });
    });

    segEl.appendChild(timeEl);
    segEl.appendChild(textWrap);
    segEl.appendChild(copyBtn);
    subtitleList.appendChild(segEl);

    // Bind word click events
    segEl.querySelectorAll('.word-token').forEach(tok => {
      tok.addEventListener('click', (e) => {
        e.stopPropagation();
        handleWordClick(tok);
      });
    });

    segEl.querySelectorAll('.idiom-token').forEach(tok => {
      tok.addEventListener('click', (e) => {
        e.stopPropagation();
        handleIdiomClick(tok);
      });
    });
  });
}

function annotateText(text, segIdx, opts) {
  const { showVocab, showSlang, showIdiom, minLevel, levelKeys } = opts;

  // Build annotation map: character position → annotation info
  const annotations = []; // { start, end, type, data }

  // Idiom annotations (higher priority, multi-word)
  if (showIdiom && idiomMatches[segIdx]) {
    for (const m of idiomMatches[segIdx]) {
      annotations.push({ start: m.start, end: m.end, type: 'idiom', data: m });
    }
  }

  // Slang annotations
  if (showSlang && slangMatches[segIdx]) {
    for (const m of slangMatches[segIdx]) {
      // Don't overlap with idioms
      let overlaps = false;
      for (const a of annotations) {
        if (m.start < a.end && m.end > a.start) { overlaps = true; break; }
      }
      if (!overlaps) {
        annotations.push({ start: m.start, end: m.end, type: 'slang', data: m });
      }
    }
  }

  // Sort annotations by position
  annotations.sort((a, b) => a.start - b.start);

  // Build output HTML by going through the text
  let html = '';
  let pos = 0;

  for (const ann of annotations) {
    // Text before this annotation
    if (ann.start > pos) {
      html += tokenizeSpan(text.slice(pos, ann.start), showVocab, minLevel, levelKeys);
    }

    const matchText = text.slice(ann.start, ann.end);
    if (ann.type === 'idiom') {
      html += `<span class="idiom-token word-idiom" data-idiom="${escAttr(ann.data.key)}" title="イディオム">${escHtml(matchText)}</span>`;
      html += `<span class="inline-badge badge-idiom">慣用句</span>`;
    } else if (ann.type === 'slang') {
      html += `<span class="word-token word-slang" data-word="${escAttr(ann.data.key)}" data-type="slang" title="スラング">${escHtml(matchText)}</span>`;
      html += `<span class="inline-badge badge-slang">💬</span>`;
    }

    pos = ann.end;
  }

  // Remaining text
  if (pos < text.length) {
    html += tokenizeSpan(text.slice(pos), showVocab, minLevel, levelKeys);
  }

  return html;
}

function tokenizeSpan(text, showVocab, minLevel, levelKeys) {
  if (!text) return '';
  // Split into words and non-words
  const parts = text.split(/(\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b)/g);
  let html = '';

  for (const part of parts) {
    if (/^[a-zA-Z]+(?:'[a-zA-Z]+)?$/.test(part)) {
      const lower = part.toLowerCase();
      const lemma = lemmatize(lower);
      const level = wordLevels.get(lemma);

      if (showVocab && level && !isStopWord(lower)) {
        const levelIdx = levelKeys.indexOf(level);
        const minIdx = minLevel - 1;
        if (levelIdx >= minIdx) {
          // Map to 1-5 for CSS class
          const cssLevel = levelIdx + 1;
          html += `<span class="word-token word-level-${cssLevel}" data-word="${escAttr(lemma)}" data-type="vocab" data-level="${escAttr(level)}">${escHtml(part)}</span>`;
          continue;
        }
      }

      // Still make it clickable
      if (!isStopWord(lower) && lower.length > 2) {
        html += `<span class="word-token" data-word="${escAttr(lemma)}" data-type="vocab">${escHtml(part)}</span>`;
      } else {
        html += escHtml(part);
      }
    } else {
      html += escHtml(part);
    }
  }
  return html;
}

// ── Word/Idiom Click Handlers ──
async function handleWordClick(el) {
  // Clear previous selection
  document.querySelectorAll('.word-token.selected, .idiom-token.selected').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');

  const word = el.dataset.word;
  const type = el.dataset.type;

  detailEmpty.style.display = 'none';
  detailContent.style.display = '';
  detailContent.innerHTML = '<div class="subtitle-loading"><div class="loading-spinner"></div><span>読み込み中...</span></div>';

  if (type === 'slang') {
    const entry = await lookupSlang(word);
    if (entry) {
      renderSlangDetail(word, entry);
      return;
    }
  }

  // Regular vocabulary lookup
  const def = await lookupWord(word);
  const level = wordLevels.get(word);
  renderVocabDetail(word, def, level);
}

async function handleIdiomClick(el) {
  document.querySelectorAll('.word-token.selected, .idiom-token.selected').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');

  const key = el.dataset.idiom;
  detailEmpty.style.display = 'none';
  detailContent.style.display = '';

  const entry = await lookupIdiom(key);
  if (entry) {
    renderIdiomDetail(key, entry);
  }
}

// ── Detail Renderers ──
async function renderVocabDetail(word, def, level) {
  let html = `<div class="detail-word-header">`;
  html += `<div class="detail-word">${escHtml(word)}</div>`;

  if (def?.phonetic) {
    html += `<div class="detail-phonetic">${escHtml(def.phonetic)}</div>`;
  }

  // Audio
  const audioUrl = def?.phonetics?.find(p => p.audio)?.audio;
  if (audioUrl) {
    html += `<button class="detail-audio-btn" data-audio="${escAttr(audioUrl)}">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1L3.5 4H1v6h2.5L7 13V1z" fill="currentColor"/>
        <path d="M10 4.5a3.5 3.5 0 010 5M11.5 2.5a6 6 0 010 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg> 再生</button>`;
  }

  // Level badge
  if (level && levelDefs[level]) {
    const ld = levelDefs[level];
    html += `<div class="detail-level-badge" style="background:${ld.bgColor};color:${ld.color}">${escHtml(ld.label)}</div>`;
  }

  html += `</div>`;

  // Translation
  html += `<div class="detail-translation" id="vocabTranslation">翻訳中...</div>`;

  html += `<div class="detail-divider"></div>`;

  // Meanings
  if (def?.meanings) {
    for (const meaning of def.meanings.slice(0, 3)) {
      html += `<div class="detail-meaning-section">`;
      html += `<div class="detail-pos">${escHtml(meaning.partOfSpeech)}</div>`;
      for (const d of meaning.definitions.slice(0, 2)) {
        html += `<div class="detail-def">${escHtml(d.definition)}</div>`;
        html += `<div class="detail-def-ja" data-translate="${encodeURIComponent(d.definition)}">翻訳中...</div>`;
        if (d.example) {
          html += `<div class="detail-def-example">"${escHtml(d.example)}"</div>`;
        }
        if (d.synonyms?.length) {
          html += `<div class="detail-synonyms">${d.synonyms.map(s => `<span class="synonym-chip">${escHtml(s)}</span>`).join('')}</div>`;
        }
      }
      html += `</div>`;
    }
  } else {
    html += `<p style="color:var(--text-muted)">辞書データがありません</p>`;
  }

  // Add to flashcard
  const alreadyAdded = await hasCard(word);
  html += `<button class="detail-add-btn ${alreadyAdded ? 'added' : ''}" id="addCardBtn" data-word="${escAttr(word)}">${alreadyAdded ? '✓ 追加済み' : '＋ フラッシュカードに追加'}</button>`;

  detailContent.innerHTML = html;
  bindDetailEvents(word, def);
  loadDetailTranslations();
}

function renderSlangDetail(word, entry) {
  const formalityStars = '★'.repeat(entry.formality || 1) + '☆'.repeat(5 - (entry.formality || 1));

  let html = `<div class="detail-word-header">`;
  html += `<div class="detail-word">${escHtml(word)}</div>`;
  html += `<div class="detail-type-badge detail-type-slang">💬 ${escHtml(entry.type || 'slang')}</div>`;
  html += `</div>`;

  if (entry.formal) {
    html += `<div class="detail-formal">`;
    html += `<span class="detail-formal-label">正式形: </span>`;
    html += `<strong>${escHtml(entry.formal)}</strong>`;
    html += `</div>`;
  }

  if (entry.meaning_ja) {
    html += `<div class="detail-translation">${escHtml(entry.meaning_ja)}</div>`;
  }

  html += `<div class="detail-divider"></div>`;

  if (entry.explanation) {
    html += `<div class="detail-explanation">${escHtml(entry.explanation)}</div>`;
  }

  html += `<div class="detail-formality">`;
  html += `<span class="detail-formal-label">フォーマル度: </span>`;
  html += `<span class="detail-formality-stars">${formalityStars}</span>`;
  html += `</div>`;

  if (entry.contexts) {
    const contextMap = {
      casual: { label: '友人同士', ok: true },
      sns: { label: 'SNS', ok: true },
      business: { label: 'ビジネス', ok: false },
      interview: { label: '面接', ok: false },
      academic: { label: '論文', ok: false },
    };
    html += `<div class="detail-contexts">`;
    for (const ctx of ['casual', 'sns', 'business', 'interview', 'academic']) {
      const isOk = entry.contexts.includes(ctx);
      const info = contextMap[ctx];
      html += `<span class="context-chip ${isOk ? 'ok' : 'ng'}">${isOk ? '✅' : '❌'} ${info.label}</span>`;
    }
    html += `</div>`;
  }

  if (entry.examples?.length) {
    html += `<div class="detail-examples">`;
    html += `<div class="detail-formal-label" style="margin-bottom:4px">例文:</div>`;
    for (const ex of entry.examples) {
      html += `<div class="detail-example">${escHtml(ex)}</div>`;
    }
    html += `</div>`;
  }

  // Add to flashcard
  html += `<button class="detail-add-btn" id="addCardBtn" data-word="${escAttr(word)}" data-type="slang">＋ フラッシュカードに追加</button>`;

  detailContent.innerHTML = html;
  bindDetailEvents(word, { slangEntry: entry });
}

function renderIdiomDetail(key, entry) {
  const formalityStars = '★'.repeat(entry.formality || 3) + '☆'.repeat(5 - (entry.formality || 3));

  let html = `<div class="detail-word-header">`;
  html += `<div class="detail-word">${escHtml(key)}</div>`;
  html += `<div class="detail-type-badge detail-type-idiom">🧩 イディオム</div>`;
  html += `</div>`;

  html += `<div class="detail-translation">${escHtml(entry.meaning_ja || entry.meaning)}</div>`;

  html += `<div class="detail-divider"></div>`;

  html += `<div class="detail-meaning-section">`;
  html += `<div class="detail-pos">意味</div>`;
  html += `<div class="detail-def">${escHtml(entry.meaning)}</div>`;
  html += `</div>`;

  if (entry.explanation) {
    html += `<div class="detail-explanation">${escHtml(entry.explanation)}</div>`;
  }

  html += `<div class="detail-formality">`;
  html += `<span class="detail-formal-label">フォーマル度: </span>`;
  html += `<span class="detail-formality-stars">${formalityStars}</span>`;
  html += `</div>`;

  if (entry.examples?.length) {
    html += `<div class="detail-examples">`;
    html += `<div class="detail-formal-label" style="margin-bottom:4px">例文:</div>`;
    for (const ex of entry.examples) {
      html += `<div class="detail-example">${escHtml(ex)}</div>`;
    }
    html += `</div>`;
  }

  html += `<button class="detail-add-btn" id="addCardBtn" data-word="${escAttr(key)}" data-type="idiom">＋ フラッシュカードに追加</button>`;

  detailContent.innerHTML = html;
  bindDetailEvents(key, { idiomEntry: entry });
}

function bindDetailEvents(word, defData) {
  // Audio
  const audioBtn = detailContent.querySelector('.detail-audio-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      new Audio(audioBtn.dataset.audio).play();
    });
  }

  // Add to flashcard
  const addBtn = document.getElementById('addCardBtn');
  if (addBtn && !addBtn.classList.contains('added')) {
    addBtn.addEventListener('click', async () => {
      let definition = defData;
      if (defData?.slangEntry) {
        definition = {
          word,
          type: 'slang',
          meanings: [{ partOfSpeech: 'slang', definitions: [{ definition: defData.slangEntry.formal || defData.slangEntry.explanation }] }],
          slang: defData.slangEntry,
        };
      } else if (defData?.idiomEntry) {
        definition = {
          word,
          type: 'idiom',
          meanings: [{ partOfSpeech: 'idiom', definitions: [{ definition: defData.idiomEntry.meaning }] }],
          idiom: defData.idiomEntry,
        };
      }
      const added = await addCard(word, definition);
      if (added) {
        addBtn.textContent = '✓ 追加済み';
        addBtn.classList.add('added');
      } else {
        addBtn.textContent = '✓ 追加済み';
        addBtn.classList.add('added');
      }
    });
  }
}

function loadDetailTranslations() {
  // Word translation
  const vocabTrans = document.getElementById('vocabTranslation');
  if (vocabTrans) {
    const word = detailContent.querySelector('.detail-word')?.textContent;
    if (word) {
      translateText(word).then(t => {
        vocabTrans.textContent = t || '';
        if (!t) vocabTrans.style.display = 'none';
      });
    }
  }

  // Definition translations
  detailContent.querySelectorAll('[data-translate]').forEach(el => {
    const text = decodeURIComponent(el.dataset.translate);
    translateText(text).then(t => {
      el.textContent = t ? `→ ${t}` : '';
    });
  });
}

// ── Player Control ──

function seekTo(seconds) {
  if (!currentVideoId) return;
  const t = Math.floor(seconds);
  window.open(`https://www.youtube.com/watch?v=${currentVideoId}&t=${t}s`, '_blank');
}

// ── Bookmark / Library ──
const BOOKMARKS_KEY = 'video_bookmarks';

async function getBookmarks() {
  return (await storage.get(BOOKMARKS_KEY)) || {};
}

async function saveBookmarks(bookmarks) {
  await storage.set(BOOKMARKS_KEY, bookmarks);
}

async function toggleBookmark() {
  if (!currentVideoId) return;

  const bookmarks = await getBookmarks();
  if (bookmarks[currentVideoId]) {
    delete bookmarks[currentVideoId];
    bookmarkBtn.classList.remove('bookmark-active');
    bookmarkBtn.querySelector('svg').removeAttribute('fill');
  } else {
    const info = await getVideoInfo(currentVideoId);
    bookmarks[currentVideoId] = {
      videoId: currentVideoId,
      title: info.title || videoTitle.textContent,
      author: info.author || '',
      thumbnail: info.thumbnail,
      url: urlInput.value.trim(),
      totalWords: wordLevels.size,
      learnedWords: 0,
      savedAt: Date.now(),
      lastWatched: Date.now(),
    };
    bookmarkBtn.classList.add('bookmark-active');
    bookmarkBtn.querySelector('svg').setAttribute('fill', 'currentColor');
  }

  await saveBookmarks(bookmarks);
  await renderLibrary();
}

async function updateBookmarkProgress() {
  if (!currentVideoId) return;
  const bookmarks = await getBookmarks();
  if (!bookmarks[currentVideoId]) return;

  bookmarks[currentVideoId].totalWords = wordLevels.size;
  bookmarks[currentVideoId].lastWatched = Date.now();
  await saveBookmarks(bookmarks);
  await renderLibrary();
}

async function renderLibrary() {
  const bookmarks = await getBookmarks();
  const entries = Object.values(bookmarks).sort((a, b) => b.lastWatched - a.lastWatched);

  libraryCount.textContent = entries.length;

  if (entries.length === 0) {
    libraryList.innerHTML = '<div class="library-empty"><p>保存した動画はここに表示されます</p></div>';
    return;
  }

  libraryList.innerHTML = '';
  for (const entry of entries) {
    const item = document.createElement('div');
    item.className = `library-item ${entry.videoId === currentVideoId ? 'active' : ''}`;
    item.innerHTML = `
      <img class="library-thumb" src="${escAttr(entry.thumbnail)}" alt="" loading="lazy">
      <div class="library-item-info">
        <div class="library-item-title">${escHtml(entry.title)}</div>
        <div class="library-item-meta">${entry.totalWords || 0} 語</div>
        <div class="library-item-progress">
          <div class="library-item-progress-bar" style="width: ${entry.totalWords ? Math.round((entry.learnedWords / entry.totalWords) * 100) : 0}%"></div>
        </div>
      </div>
      <button class="library-item-delete" title="削除">&times;</button>
    `;

    item.querySelector('.library-item-info').addEventListener('click', () => {
      urlInput.value = entry.url;
      loadVideo();
    });

    item.querySelector('.library-item-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      const bm = await getBookmarks();
      delete bm[entry.videoId];
      await saveBookmarks(bm);
      renderLibrary();
    });

    libraryList.appendChild(item);
  }
}

// ── Utilities ──
function showError(msg) {
  subtitleError.textContent = msg;
  subtitleError.style.display = '';
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Start ──
init();
