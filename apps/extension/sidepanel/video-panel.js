/**
 * VocabLens Video Side Panel - YouTube subtitle analysis in the side panel.
 * Communicates with youtube-content.js via the service worker for playback sync.
 */

import { groupSubtitles, formatTime } from '../lib/subtitle-extractor.js';
import { processText, tokenize, lemmatize, isStopWord } from '../lib/text-processor.js';
import { classifyWords, getLevelDefinitions, getLevelOrder } from '../lib/classifier.js';
import { detectSlang, lookupSlang } from '../lib/slang-detector.js';
import { detectIdioms, lookupIdiom } from '../lib/idiom-detector.js';
import { lookupWord } from '../lib/dictionary-api.js';
import { translateText } from '../lib/translation-api.js';
import { addCard, hasCard } from '../lib/flashcard-manager.js';
import { getSettings, saveSettings } from '../lib/storage.js';

// ── State ──
let currentVideoId = null;
let currentVideoTitle = '';
let segments = [];
let wordLevels = new Map();
let levelDefs = {};
let slangMatches = [];
let idiomMatches = [];
let currentSystem = '5level';
let currentTime = 0;
let activeSegmentIndex = -1;

// ── DOM ──
const pipBtn = document.getElementById('pipBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const settingSystem = document.getElementById('settingSystem');
const settingLang = document.getElementById('settingLang');
const settingTheme = document.getElementById('settingTheme');
const videoInfo = document.getElementById('videoInfo');
const videoTitle = document.getElementById('videoTitle');
const currentTimeDisplay = document.getElementById('currentTimeDisplay');
const playbackState = document.getElementById('playbackState');
const toggleBar = document.getElementById('toggleBar');
const toggleTranslation = document.getElementById('toggleTranslation');
const toggleVocab = document.getElementById('toggleVocab');
const toggleSlang = document.getElementById('toggleSlang');
const toggleIdiom = document.getElementById('toggleIdiom');
const minLevelSelect = document.getElementById('minLevelSelect');
const autoSync = document.getElementById('autoSync');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const errorState = document.getElementById('errorState');
const subtitleTimeline = document.getElementById('subtitleTimeline');
const subtitleList = document.getElementById('subtitleList');
const wordDetail = document.getElementById('wordDetail');
const detailBack = document.getElementById('detailBack');
const detailContent = document.getElementById('detailContent');

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
  pipBtn.addEventListener('click', enterPiP);
  settingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? '' : 'none';
  });
  analyzeBtn.addEventListener('click', analyzeSubtitles);
  detailBack.addEventListener('click', hideDetail);

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

  // Listen for YouTube state via storage changes (written by content script)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.vocablens_yt_state) {
      const state = changes.vocablens_yt_state.newValue;
      if (state) {
        if (state.videoId && state.videoId !== currentVideoId) {
          currentVideoId = state.videoId;
          currentVideoTitle = state.title || '';
          videoTitle.textContent = currentVideoTitle;
          videoInfo.style.display = '';
        }
        currentTime = state.currentTime || 0;
        currentTimeDisplay.textContent = formatTimeShort(currentTime);
        playbackState.textContent = state.paused ? '一時停止' : '再生中';
        if (autoSync.checked && segments.length > 0) {
          syncToTime(currentTime);
        }
      }
    }
  });

  // Also listen for direct runtime messages
  chrome.runtime.onMessage.addListener(handleMessage);

  // Try to get current YouTube tab state
  requestCurrentState();
}

// ── Message Handling ──
function handleMessage(msg) {
  if (msg.type === 'YT_VIDEO_DETECTED') {
    currentVideoId = msg.videoId;
    currentVideoTitle = msg.title || '';
    videoTitle.textContent = currentVideoTitle;
    videoInfo.style.display = '';
    emptyState.querySelector('p').textContent =
      '「字幕を分析」をクリックして字幕を取得してください。';
  }

  if (msg.type === 'YT_TIME_UPDATE') {
    currentTime = msg.currentTime;
    currentTimeDisplay.textContent = formatTimeShort(msg.currentTime);
    if (autoSync.checked && segments.length > 0) {
      syncToTime(msg.currentTime);
    }
  }

  if (msg.type === 'YT_STATE_CHANGE') {
    if (msg.state === 'playing') {
      playbackState.textContent = '再生中';
    } else if (msg.state === 'paused') {
      playbackState.textContent = '一時停止';
    } else if (msg.state === 'ended') {
      playbackState.textContent = '終了';
    }
  }
}

/**
 * Request the current state from the YouTube content script.
 */
async function requestCurrentState() {
  try {
    // Read from storage (written by content script)
    const result = await chrome.storage.local.get('vocablens_yt_state');
    const state = result.vocablens_yt_state;
    if (state && state.videoId && (Date.now() - state.updatedAt) < 10000) {
      currentVideoId = state.videoId;
      currentVideoTitle = state.title || '';
      videoTitle.textContent = currentVideoTitle;
      videoInfo.style.display = '';
      currentTime = state.currentTime || 0;
      currentTimeDisplay.textContent = formatTimeShort(currentTime);
      playbackState.textContent = state.paused ? '一時停止' : '再生中';
    }
  } catch (e) {}
}

// ── Playback Controls ──
async function sendToYouTubeTab(msg) {
  try {
    const tabs = await chrome.tabs.query({ url: '*://www.youtube.com/watch*' });
    if (tabs.length > 0) {
      await chrome.tabs.sendMessage(tabs[0].id, msg);
    }
  } catch (e) {}
}

function enterPiP() {
  sendToYouTubeTab({ type: 'ENTER_PIP' });
}

function seekTo(seconds) {
  sendToYouTubeTab({ type: 'SEEK', time: seconds });
}

// ── Time Sync ──
function syncToTime(time) {
  let newIndex = -1;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const end = seg.start + (seg.duration || 5);
    if (time >= seg.start && time < end) {
      newIndex = i;
      break;
    }
  }

  // If no exact match, find the closest previous segment
  if (newIndex === -1) {
    for (let i = segments.length - 1; i >= 0; i--) {
      if (time >= segments[i].start) {
        newIndex = i;
        break;
      }
    }
  }

  if (newIndex !== activeSegmentIndex && newIndex >= 0) {
    activeSegmentIndex = newIndex;
    highlightSegment(newIndex);
  }
}

function highlightSegment(index) {
  // Remove previous active
  const prev = subtitleList.querySelector('.vp-subtitle-segment.active');
  if (prev) prev.classList.remove('active');

  // Set new active
  const segEl = subtitleList.querySelector(`[data-index="${index}"]`);
  if (segEl) {
    segEl.classList.add('active');
    // Scroll into view
    segEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ── Subtitle Analysis ──
async function analyzeSubtitles() {
  // If we don't have a video ID yet, try to get it from the active YouTube tab
  if (!currentVideoId) {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_YT_STATE_RELAY' });
      if (resp && resp.success && resp.videoId) {
        currentVideoId = resp.videoId;
        currentVideoTitle = resp.title || '';
        videoTitle.textContent = currentVideoTitle;
        videoInfo.style.display = '';
      }
    } catch (e) {}
  }

  // Still no video ID? Try extracting from the tab URL directly
  if (!currentVideoId) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].url) {
        const match = tabs[0].url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (match) {
          currentVideoId = match[1];
          videoTitle.textContent = tabs[0].title || '';
          videoInfo.style.display = '';
        }
      }
    } catch (e) {}
  }

  if (!currentVideoId) {
    showError('YouTube動画ページを開いてください。');
    return;
  }

  loadingState.style.display = '';
  emptyState.style.display = 'none';
  errorState.style.display = 'none';
  subtitleTimeline.style.display = 'none';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_SUBTITLES',
      videoId: currentVideoId,
      lang: 'en',
    });

    if (!response || !response.success) {
      loadingState.style.display = 'none';
      showError(response?.error || '字幕の取得に失敗しました');
      return;
    }

    segments = groupSubtitles(response.subtitles);
    await analyzeSegments();

    loadingState.style.display = 'none';
    toggleBar.style.display = '';
    subtitleTimeline.style.display = '';
    renderSubtitles();
  } catch (err) {
    loadingState.style.display = 'none';
    showError('字幕の取得に失敗しました: ' + err.message);
  }
}

async function analyzeSegments() {
  const allText = segments.map(s => s.text).join(' ');

  // Vocabulary classification
  const wordCounts = processText(allText);
  const { groups, levelDefs: ld } = await classifyWords(wordCounts, currentSystem, 1);
  levelDefs = ld;

  // Build word -> level map
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
    segEl.className = 'vp-subtitle-segment';
    segEl.dataset.index = idx;

    // Time
    const timeEl = document.createElement('div');
    timeEl.className = 'vp-subtitle-time';
    timeEl.textContent = formatTime(seg.start);
    timeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      seekTo(seg.start);
    });

    // Text wrap
    const textWrap = document.createElement('div');
    textWrap.className = 'vp-subtitle-text-wrap';

    // Annotated text
    const textEl = document.createElement('div');
    textEl.className = 'vp-subtitle-text';
    textEl.innerHTML = annotateText(seg.text, idx, {
      showVocab, showSlang, showIdiom, minLevel, levelKeys,
    });
    textWrap.appendChild(textEl);

    // Translation (lazy-load: fetch when segment is visible)
    if (showTranslation) {
      const transEl = document.createElement('div');
      transEl.className = 'vp-subtitle-translation';
      transEl.textContent = '';
      transEl.dataset.needsTranslation = seg.text;
      textWrap.appendChild(transEl);
    }

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'vp-subtitle-copy-btn';
    copyBtn.title = 'コピー';
    copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 10V3a1.5 1.5 0 011.5-1.5H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(seg.text).then(() => {
        copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 10V3a1.5 1.5 0 011.5-1.5H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
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

  // Re-apply current time highlighting
  if (activeSegmentIndex >= 0) {
    highlightSegment(activeSegmentIndex);
  }

  // Lazy-load translations (staggered to avoid rate limiting)
  const transEls = subtitleList.querySelectorAll('[data-needs-translation]');
  transEls.forEach((el, i) => {
    setTimeout(() => {
      const text = el.dataset.needsTranslation;
      if (!text) return;
      delete el.dataset.needsTranslation;
      translateText(text).then(t => {
        if (t) {
          el.textContent = t;
        } else {
          el.remove();
        }
      }).catch(() => el.remove());
    }, i * 200); // 200ms stagger between each request
  });
}

function annotateText(text, segIdx, opts) {
  const { showVocab, showSlang, showIdiom, minLevel, levelKeys } = opts;
  const annotations = [];

  // Idiom annotations (higher priority)
  if (showIdiom && idiomMatches[segIdx]) {
    for (const m of idiomMatches[segIdx]) {
      annotations.push({ start: m.start, end: m.end, type: 'idiom', data: m });
    }
  }

  // Slang annotations
  if (showSlang && slangMatches[segIdx]) {
    for (const m of slangMatches[segIdx]) {
      let overlaps = false;
      for (const a of annotations) {
        if (m.start < a.end && m.end > a.start) { overlaps = true; break; }
      }
      if (!overlaps) {
        annotations.push({ start: m.start, end: m.end, type: 'slang', data: m });
      }
    }
  }

  annotations.sort((a, b) => a.start - b.start);

  let html = '';
  let pos = 0;

  for (const ann of annotations) {
    if (ann.start > pos) {
      html += tokenizeSpan(text.slice(pos, ann.start), showVocab, minLevel, levelKeys);
    }

    const matchText = text.slice(ann.start, ann.end);
    if (ann.type === 'idiom') {
      html += `<span class="idiom-token word-idiom" data-idiom="${escAttr(ann.data.key)}" title="イディオム">${escHtml(matchText)}</span>`;
      html += `<span class="inline-badge badge-idiom">慣</span>`;
    } else if (ann.type === 'slang') {
      html += `<span class="word-token word-slang" data-word="${escAttr(ann.data.key)}" data-type="slang" title="スラング">${escHtml(matchText)}</span>`;
      html += `<span class="inline-badge badge-slang">S</span>`;
    }

    pos = ann.end;
  }

  if (pos < text.length) {
    html += tokenizeSpan(text.slice(pos), showVocab, minLevel, levelKeys);
  }

  return html;
}

function tokenizeSpan(text, showVocab, minLevel, levelKeys) {
  if (!text) return '';
  const parts = text.split(/(\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b)/g);
  let html = '';

  for (const part of parts) {
    if (/^[a-zA-Z]+(?:'[a-zA-Z]+)?$/.test(part)) {
      const lower = part.toLowerCase();
      const lem = lemmatize(lower);
      const level = wordLevels.get(lem);

      if (showVocab && level && !isStopWord(lower)) {
        const levelIdx = levelKeys.indexOf(level);
        const minIdx = minLevel - 1;
        if (levelIdx >= minIdx) {
          const cssLevel = levelIdx + 1;
          html += `<span class="word-token word-level-${cssLevel}" data-word="${escAttr(lem)}" data-type="vocab" data-level="${escAttr(level)}">${escHtml(part)}</span>`;
          continue;
        }
      }

      if (!isStopWord(lower) && lower.length > 2) {
        html += `<span class="word-token" data-word="${escAttr(lem)}" data-type="vocab">${escHtml(part)}</span>`;
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
  document.querySelectorAll('.word-token.selected, .idiom-token.selected').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');

  const word = el.dataset.word;
  const type = el.dataset.type;

  showDetail();
  detailContent.innerHTML = '<div class="vp-loading"><div class="loading-spinner"></div><span>読み込み中...</span></div>';

  if (type === 'slang') {
    const entry = await lookupSlang(word);
    if (entry) {
      renderSlangDetail(word, entry);
      return;
    }
  }

  const def = await lookupWord(word);
  const level = wordLevels.get(word);
  renderVocabDetail(word, def, level);
}

async function handleIdiomClick(el) {
  document.querySelectorAll('.word-token.selected, .idiom-token.selected').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');

  const key = el.dataset.idiom;
  showDetail();

  const entry = await lookupIdiom(key);
  if (entry) {
    renderIdiomDetail(key, entry);
  }
}

// ── Detail Renderers ──
async function renderVocabDetail(word, def, level) {
  let html = '<div class="detail-word-header">';
  html += `<div class="detail-word">${escHtml(word)}</div>`;

  if (def?.phonetic) {
    html += `<div class="detail-phonetic">${escHtml(def.phonetic)}</div>`;
  }

  const audioUrl = def?.phonetics?.find(p => p.audio)?.audio;
  if (audioUrl) {
    html += `<button class="detail-audio-btn" data-audio="${escAttr(audioUrl)}">
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path d="M7 1L3.5 4H1v6h2.5L7 13V1z" fill="currentColor"/>
        <path d="M10 4.5a3.5 3.5 0 010 5M11.5 2.5a6 6 0 010 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg> 再生</button>`;
  }

  if (level && levelDefs[level]) {
    const ld = levelDefs[level];
    html += `<div class="detail-level-badge" style="background:${ld.bgColor};color:${ld.color}">${escHtml(ld.label)}</div>`;
  }

  html += '</div>';

  html += '<div class="detail-translation" id="vocabTranslation">翻訳中...</div>';
  html += '<div class="detail-divider"></div>';

  if (def?.meanings) {
    for (const meaning of def.meanings.slice(0, 3)) {
      html += '<div class="detail-meaning-section">';
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
      html += '</div>';
    }
  } else {
    html += '<p style="color:var(--text-muted)">辞書データがありません</p>';
  }

  const alreadyAdded = await hasCard(word);
  html += `<button class="detail-add-btn ${alreadyAdded ? 'added' : ''}" id="addCardBtn" data-word="${escAttr(word)}">${alreadyAdded ? '✓ 追加済み' : '＋ フラッシュカードに追加'}</button>`;

  detailContent.innerHTML = html;
  bindDetailEvents(word, def);
  loadDetailTranslations();
}

function renderSlangDetail(word, entry) {
  const formalityStars = '\u2605'.repeat(entry.formality || 1) + '\u2606'.repeat(5 - (entry.formality || 1));

  let html = '<div class="detail-word-header">';
  html += `<div class="detail-word">${escHtml(word)}</div>`;
  html += `<div class="detail-type-badge detail-type-slang">S ${escHtml(entry.type || 'slang')}</div>`;
  html += '</div>';

  if (entry.formal) {
    html += '<div class="detail-formal">';
    html += '<span class="detail-formal-label">正式形: </span>';
    html += `<strong>${escHtml(entry.formal)}</strong>`;
    html += '</div>';
  }

  if (entry.meaning_ja) {
    html += `<div class="detail-translation">${escHtml(entry.meaning_ja)}</div>`;
  }

  html += '<div class="detail-divider"></div>';

  if (entry.explanation) {
    html += `<div class="detail-explanation">${escHtml(entry.explanation)}</div>`;
  }

  html += '<div class="detail-formality">';
  html += '<span class="detail-formal-label">フォーマル度: </span>';
  html += `<span class="detail-formality-stars">${formalityStars}</span>`;
  html += '</div>';

  if (entry.contexts) {
    const contextMap = {
      casual: { label: '友人同士' },
      sns: { label: 'SNS' },
      business: { label: 'ビジネス' },
      interview: { label: '面接' },
      academic: { label: '論文' },
    };
    html += '<div class="detail-contexts">';
    for (const ctx of ['casual', 'sns', 'business', 'interview', 'academic']) {
      const isOk = entry.contexts.includes(ctx);
      const info = contextMap[ctx];
      html += `<span class="context-chip ${isOk ? 'ok' : 'ng'}">${isOk ? 'OK' : 'NG'} ${info.label}</span>`;
    }
    html += '</div>';
  }

  if (entry.examples?.length) {
    html += '<div class="detail-examples">';
    html += '<div class="detail-formal-label" style="margin-bottom:4px">例文:</div>';
    for (const ex of entry.examples) {
      html += `<div class="detail-example">${escHtml(ex)}</div>`;
    }
    html += '</div>';
  }

  html += `<button class="detail-add-btn" id="addCardBtn" data-word="${escAttr(word)}" data-type="slang">＋ フラッシュカードに追加</button>`;

  detailContent.innerHTML = html;
  bindDetailEvents(word, { slangEntry: entry });
}

function renderIdiomDetail(key, entry) {
  const formalityStars = '\u2605'.repeat(entry.formality || 3) + '\u2606'.repeat(5 - (entry.formality || 3));

  let html = '<div class="detail-word-header">';
  html += `<div class="detail-word">${escHtml(key)}</div>`;
  html += '<div class="detail-type-badge detail-type-idiom">慣用句</div>';
  html += '</div>';

  html += `<div class="detail-translation">${escHtml(entry.meaning_ja || entry.meaning)}</div>`;
  html += '<div class="detail-divider"></div>';

  html += '<div class="detail-meaning-section">';
  html += '<div class="detail-pos">意味</div>';
  html += `<div class="detail-def">${escHtml(entry.meaning)}</div>`;
  html += '</div>';

  if (entry.explanation) {
    html += `<div class="detail-explanation">${escHtml(entry.explanation)}</div>`;
  }

  html += '<div class="detail-formality">';
  html += '<span class="detail-formal-label">フォーマル度: </span>';
  html += `<span class="detail-formality-stars">${formalityStars}</span>`;
  html += '</div>';

  if (entry.examples?.length) {
    html += '<div class="detail-examples">';
    html += '<div class="detail-formal-label" style="margin-bottom:4px">例文:</div>';
    for (const ex of entry.examples) {
      html += `<div class="detail-example">${escHtml(ex)}</div>`;
    }
    html += '</div>';
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
      await addCard(word, definition);
      addBtn.textContent = '✓ 追加済み';
      addBtn.classList.add('added');
    });
  }
}

function loadDetailTranslations() {
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

  detailContent.querySelectorAll('[data-translate]').forEach(el => {
    const text = decodeURIComponent(el.dataset.translate);
    translateText(text).then(t => {
      el.textContent = t ? `\u2192 ${t}` : '';
    });
  });
}

// ── Detail Show/Hide ──
function showDetail() {
  wordDetail.style.display = '';
}

function hideDetail() {
  wordDetail.style.display = 'none';
  document.querySelectorAll('.word-token.selected, .idiom-token.selected').forEach(e => e.classList.remove('selected'));
}

// ── Utilities ──
function showError(msg) {
  errorState.textContent = msg;
  errorState.style.display = '';
}

function formatTimeShort(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
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
