/**
 * Popup script - Flashcard review, card management, and settings.
 */

import { getDueCards, getAllCards, reviewCard as reviewCardFn, removeCard, searchCards, getStats, updateBadge, setCardLearned } from '../lib/flashcard-manager.js';
import { getNextReviewLabel } from '../lib/spaced-repetition.js';
import { translateText } from '../lib/translation-api.js';
import { getSettings, saveSettings } from '../lib/storage.js';
import { sendMagicLink, getSession, clearSession, isLoggedIn, syncCardsToSupabase } from '../lib/supabase-sync.js';

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

// DOM
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const dueCountEl = document.getElementById('dueCount');

// Review elements
const reviewInfo = document.getElementById('reviewInfo');
const reviewEmpty = document.getElementById('reviewEmpty');
const reviewEmptyText = document.getElementById('reviewEmptyText');
const reviewCard = document.getElementById('reviewCard');
const reviewComplete = document.getElementById('reviewComplete');
const reviewProgress = document.getElementById('reviewProgress');
const cardFront = document.getElementById('cardFront');
const cardBack = document.getElementById('cardBack');
const cardWord = document.getElementById('cardWord');
const cardWordBack = document.getElementById('cardWordBack');
const cardTranslation = document.getElementById('cardTranslation');
const cardDefinition = document.getElementById('cardDefinition');
const showAnswerBtn = document.getElementById('showAnswerBtn');
const ratingBtns = document.querySelectorAll('.rating-btn');
const reviewAgainBtn = document.getElementById('reviewAgainBtn');

// Cards elements
const cardSearch = document.getElementById('cardSearch');
const cardCount = document.getElementById('cardCount');
const cardList = document.getElementById('cardList');
const cardDetail = document.getElementById('cardDetail');
const cardDetailBack = document.getElementById('cardDetailBack');
const cardDetailContent = document.getElementById('cardDetailContent');
const hideLearnedCheck = document.getElementById('hideLearnedCheck');
const cardsEmpty = document.getElementById('cardsEmpty');

// Settings elements
const settingSystem = document.getElementById('settingSystem');
const settingLang = document.getElementById('settingLang');
const settingTheme = document.getElementById('settingTheme');
const openSidePanel = document.getElementById('openSidePanel');
const statTotal = document.getElementById('statTotal');
const statDue = document.getElementById('statDue');

// State
let dueCards = [];
let currentIndex = 0;

async function init() {
  const settings = await getSettings();
  settingSystem.value = settings.classificationSystem || '5level';
  settingLang.value = settings.nativeLanguage || 'ja';
  settingTheme.value = settings.theme || 'light';
  hideLearnedCheck.checked = settings.hideLearnedCards !== false;

  if (settings.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Review events
  showAnswerBtn.addEventListener('click', showAnswer);
  ratingBtns.forEach(btn => {
    btn.addEventListener('click', () => handleRating(Number(btn.dataset.quality)));
  });
  reviewAgainBtn.addEventListener('click', startReview);

  // Cards events
  cardSearch.addEventListener('input', renderCardList);
  cardDetailBack.addEventListener('click', () => {
    cardDetail.style.display = 'none';
    cardList.style.display = '';
  });
  hideLearnedCheck.addEventListener('change', async () => {
    const settings = await getSettings();
    settings.hideLearnedCards = hideLearnedCheck.checked;
    await saveSettings(settings);
    renderCardList();
  });

  // Settings events
  settingSystem.addEventListener('change', async () => {
    const settings = await getSettings();
    settings.classificationSystem = settingSystem.value;
    await saveSettings(settings);
  });

  settingLang.addEventListener('change', async () => {
    const settings = await getSettings();
    settings.nativeLanguage = settingLang.value;
    await saveSettings(settings);
  });

  settingTheme.addEventListener('change', async () => {
    const settings = await getSettings();
    settings.theme = settingTheme.value;
    await saveSettings(settings);

    if (settingTheme.value === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  });

  openSidePanel.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.sidePanel.open({ tabId: tab.id });
      window.close();
    }
  });

  // Open Video Learning page
  const openVideoPage = document.getElementById('openVideoPage');
  openVideoPage.addEventListener('click', async () => {
    // Check if current tab is a YouTube video
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let videoUrl = '';
    if (tab && tab.url && tab.url.includes('youtube.com/watch')) {
      videoUrl = tab.url;
    }
    chrome.runtime.sendMessage({ type: 'OPEN_VIDEO_TAB', url: videoUrl });
    window.close();
  });

  // Show YouTube hint if on a YouTube watch page
  try {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTab && currentTab.url && currentTab.url.includes('youtube.com/watch')) {
      const ytHint = document.getElementById('ytHint');
      if (ytHint) ytHint.style.display = '';
    }
  } catch (e) {}

  // Anpanda sync UI
  await initSyncUI();

  // Initial load
  await loadReviewTab();
  await loadCardsTab();
  await loadSettingsTab();
}

async function initSyncUI() {
  const loggedOut = document.getElementById('syncLoggedOut');
  const loggedIn = document.getElementById('syncLoggedIn');
  const emailInput = document.getElementById('syncEmail');
  const sendLinkBtn = document.getElementById('syncSendLink');
  const emailSent = document.getElementById('syncEmailSent');
  const userEmailEl = document.getElementById('syncUserEmail');
  const syncNowBtn = document.getElementById('syncNow');
  const syncStatus = document.getElementById('syncStatus');
  const logoutBtn = document.getElementById('syncLogout');

  async function refreshUI() {
    const loggedIn_ = await isLoggedIn();
    if (loggedIn_) {
      const session = await getSession();
      loggedOut.style.display = 'none';
      loggedIn.style.display = '';
      // Decode email from JWT
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        userEmailEl.textContent = payload.email || 'ログイン中';
      } catch { userEmailEl.textContent = 'ログイン中'; }
    } else {
      loggedOut.style.display = '';
      loggedIn.style.display = 'none';
    }
  }

  const connectBtn = document.getElementById('syncConnect');
  const tokenInput = document.getElementById('syncToken');
  const connectError = document.getElementById('syncConnectError');

  connectBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (!token) return;
    connectBtn.disabled = true;
    connectError.style.display = 'none';
    try {
      // Decode JWT to get email and expiry
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('無効なトークンです');
      const payload = JSON.parse(atob(parts[1]));
      const expiresAt = payload.exp;
      if (!expiresAt || expiresAt < Date.now() / 1000) throw new Error('トークンが期限切れです。Anpandaで再度コピーしてください。');

      await saveSession({ access_token: token, refresh_token: null, expires_at: expiresAt });
      tokenInput.value = '';
      await refreshUI();
    } catch (e) {
      connectError.textContent = 'エラー: ' + e.message;
      connectError.style.display = '';
    }
    connectBtn.disabled = false;
  });

  syncNowBtn.addEventListener('click', async () => {
    syncStatus.textContent = '同期中...';
    syncNowBtn.disabled = true;
    try {
      const cards = await getAllCards();
      const result = await syncCardsToSupabase(cards);
      syncStatus.textContent = `完了: ${result.synced}/${result.total} 件`;
    } catch (e) {
      syncStatus.textContent = 'エラー: ' + e.message;
    }
    syncNowBtn.disabled = false;
  });

  logoutBtn.addEventListener('click', async () => {
    await clearSession();
    await refreshUI();
  });

  await refreshUI();
}

function switchTab(tabName) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tabName}`));

  if (tabName === 'cards') renderCardList();
  if (tabName === 'settings') loadSettingsTab();
}

// ── Review ──

async function loadReviewTab() {
  dueCards = await getDueCards();
  updateDueBadge(dueCards.length);

  if (dueCards.length === 0) {
    const { total } = await getStats();
    reviewEmpty.style.display = '';
    reviewCard.style.display = 'none';
    reviewComplete.style.display = 'none';
    reviewEmptyText.textContent = total === 0
      ? 'No flashcards yet. Add words from the side panel!'
      : 'All caught up! No cards due for review.';
    return;
  }

  startReview();
}

function startReview() {
  currentIndex = 0;
  reviewEmpty.style.display = 'none';
  reviewComplete.style.display = 'none';
  reviewInfo.style.display = 'none';
  reviewCard.style.display = '';
  showCard();
}

async function showCard() {
  if (currentIndex >= dueCards.length) {
    reviewCard.style.display = 'none';
    reviewComplete.style.display = '';
    updateBadge();
    return;
  }

  const card = dueCards[currentIndex];
  reviewProgress.textContent = `${currentIndex + 1} / ${dueCards.length}`;

  cardWord.textContent = card.word;
  cardWordBack.textContent = card.word;

  // Get translation
  cardTranslation.textContent = '';
  translateText(card.word).then(t => {
    if (t) cardTranslation.textContent = t;
  });

  // Build definition HTML
  const def = card.definition;
  if (def && def.meanings) {
    let html = '';
    for (const meaning of def.meanings.slice(0, 2)) {
      html += `<div class="def-pos">${meaning.partOfSpeech}</div>`;
      for (const d of meaning.definitions.slice(0, 2)) {
        html += `<div class="def-text">${d.definition}</div>`;
        if (d.example) {
          html += `<div class="def-example">"${d.example}"</div>`;
        }
      }
    }
    cardDefinition.innerHTML = html;
  } else {
    cardDefinition.innerHTML = '<em>No definition available</em>';
  }

  // Show front
  cardFront.style.display = '';
  cardBack.style.display = 'none';
}

function showAnswer() {
  cardFront.style.display = 'none';
  cardBack.style.display = '';
}

async function handleRating(quality) {
  const card = dueCards[currentIndex];
  await reviewCardFn(card.word, quality);
  currentIndex++;
  showCard();
  updateBadge();
}

function updateDueBadge(count) {
  if (count > 0) {
    dueCountEl.textContent = count;
    dueCountEl.style.display = '';
  } else {
    dueCountEl.style.display = 'none';
  }
}

// ── Cards ──

async function loadCardsTab() {
  await renderCardList();
}

async function renderCardList() {
  const query = cardSearch.value.trim();
  let cards = query ? await searchCards(query) : Object.values(await getAllCards());
  const hideLearned = hideLearnedCheck.checked;

  if (hideLearned) {
    cards = cards.filter(c => !c.learned);
  }

  // Sort alphabetically
  cards.sort((a, b) => a.word.localeCompare(b.word));

  const allCards = await getAllCards();
  const totalCount = Object.keys(allCards).length;
  const learnedCount = Object.values(allCards).filter(c => c.learned).length;
  cardCount.textContent = `${cards.length} / ${totalCount} cards (${learnedCount} learned)`;

  if (cards.length === 0 && totalCount === 0) {
    cardList.innerHTML = '';
    cardsEmpty.style.display = '';
    return;
  }

  cardsEmpty.style.display = 'none';

  if (cards.length === 0) {
    cardList.innerHTML = '<div class="empty-state" style="padding: 20px"><p>All cards are hidden (learned). Uncheck the filter to see them.</p></div>';
    return;
  }

  cardList.innerHTML = '';

  for (const card of cards) {
    const firstDef = card.definition?.meanings?.[0]?.definitions?.[0]?.definition || 'No definition';
    const nextReview = getNextReviewLabel(card.sm2);

    const item = document.createElement('div');
    item.className = 'card-item';
    item.innerHTML = `
      <label class="card-learned-check" title="覚えた">
        <input type="checkbox" class="learned-checkbox" data-word="${card.word}" ${card.learned ? 'checked' : ''}>
      </label>
      <div class="card-item-left" data-word="${card.word}">
        <div class="card-item-word">${card.word}</div>
        <div class="card-item-def">${firstDef}</div>
      </div>
      <div class="card-item-right">
        <span class="card-item-due">${nextReview}</span>
        <button class="card-delete-btn" data-word="${card.word}" title="Delete card">&times;</button>
      </div>
    `;

    // Click word area to show detail
    const wordArea = item.querySelector('.card-item-left');
    wordArea.addEventListener('click', () => showCardDetail(card));

    // Learned checkbox
    const learnedCb = item.querySelector('.learned-checkbox');
    learnedCb.addEventListener('change', async (e) => {
      e.stopPropagation();
      await setCardLearned(card.word, learnedCb.checked);
      if (hideLearnedCheck.checked && learnedCb.checked) {
        // Re-render to hide the card
        setTimeout(() => renderCardList(), 200);
      }
      await loadSettingsTab();
    });

    const deleteBtn = item.querySelector('.card-delete-btn');
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await removeCard(card.word);
      await renderCardList();
      await loadSettingsTab();
      updateBadge();
    });

    cardList.appendChild(item);
  }
}

async function showCardDetail(card) {
  cardList.style.display = 'none';
  cardDetail.style.display = '';

  const def = card.definition;
  const phonetic = def?.phonetic || '';
  const wordPhoneticText = phonetic ? `${card.word}  ${phonetic}` : card.word;

  let html = `<div class="detail-header-row">
    <div class="detail-word">${card.word}</div>
    <button class="copy-btn" data-copy="${escAttr(wordPhoneticText)}" title="単語と発音をコピー">${COPY_ICON}</button>
  </div>`;

  // Translation
  html += `<div class="card-detail-translation" id="popupTranslation">翻訳中...</div>`;

  if (def) {
    if (phonetic) {
      html += `<div class="detail-phonetic">${phonetic}</div>`;
    }

    // Audio
    const audioUrl = def.phonetics?.find(p => p.audio)?.audio;
    if (audioUrl) {
      html += `<button class="detail-audio-btn" data-audio="${audioUrl}">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L3.5 4H1v6h2.5L7 13V1z" fill="currentColor"/>
          <path d="M10 4.5a3.5 3.5 0 010 5M11.5 2.5a6 6 0 010 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        Play
      </button>`;
    }

    // Learned toggle
    html += `<label class="card-detail-learned">
      <input type="checkbox" id="detailLearnedCheck" ${card.learned ? 'checked' : ''}>
      <span>覚えた (Learned)</span>
    </label>`;

    // Meanings with translation
    for (const meaning of def.meanings) {
      html += `<div class="meaning-section">`;
      html += `<div class="meaning-pos">${meaning.partOfSpeech}</div>`;

      for (const d of meaning.definitions) {
        html += `<div class="definition-item">`;
        html += `<div class="definition-text-row">
          <div class="definition-text">${d.definition}</div>
          <button class="copy-btn" data-copy="${escAttr(d.definition)}" title="意味をコピー">${COPY_ICON}</button>
        </div>`;
        html += `<div class="definition-ja" data-translate="${encodeURIComponent(d.definition)}"><span class="ja-loading">翻訳中...</span></div>`;
        if (d.example) {
          html += `<div class="definition-example-row">
            <div class="definition-example">"${d.example}"</div>
            <button class="copy-btn" data-copy="${escAttr(d.example)}" title="例文をコピー">${COPY_ICON}</button>
          </div>`;
          html += `<div class="example-ja" data-translate="${encodeURIComponent(d.example)}"><span class="ja-loading">翻訳中...</span></div>`;
        }
        if (d.synonyms && d.synonyms.length > 0) {
          html += `<div class="definition-synonyms">`;
          for (const syn of d.synonyms) {
            html += `<span class="synonym-chip">${syn}</span>`;
          }
          html += `</div>`;
        }
        html += `</div>`;
      }

      html += `</div>`;
    }
  } else {
    html += `<div class="detail-error">No definition available for this word.</div>`;
  }

  cardDetailContent.innerHTML = html;

  // Bind copy buttons
  bindCopyButtons(cardDetailContent);

  // Bind audio button
  const audioBtn = cardDetailContent.querySelector('.detail-audio-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const audio = new Audio(audioBtn.dataset.audio);
      audio.play();
    });
  }

  // Bind learned checkbox
  const learnedCheck = document.getElementById('detailLearnedCheck');
  if (learnedCheck) {
    learnedCheck.addEventListener('change', async () => {
      await setCardLearned(card.word, learnedCheck.checked);
    });
  }

  // Load word translation
  translateText(card.word).then(t => {
    const el = document.getElementById('popupTranslation');
    if (el) el.textContent = t || '';
  });

  // Load definition/example translations
  const transElements = cardDetailContent.querySelectorAll('[data-translate]');
  for (const el of transElements) {
    const text = decodeURIComponent(el.dataset.translate);
    translateText(text).then(t => {
      if (t) {
        el.innerHTML = `<span class="ja-text">→ ${t}</span>`;
      } else {
        el.innerHTML = '';
      }
    });
  }
}

// ── Settings ──

async function loadSettingsTab() {
  const { total, due } = await getStats();
  statTotal.textContent = total;
  statDue.textContent = due;
}

init();
