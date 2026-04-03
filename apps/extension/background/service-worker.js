/**
 * Background service worker.
 * - Proxies dictionary API calls (CORS bypass)
 * - Proxies translation API calls
 * - Manages side panel behavior
 * - Updates badge on startup
 */

var DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(function(e) {});

// ── Port management for video side panel ──
var videoPanelPorts = [];
chrome.runtime.onConnect.addListener(function(port) {
  if (port.name === 'video-panel') {
    videoPanelPorts.push(port);
    port.onDisconnect.addListener(function() {
      videoPanelPorts = videoPanelPorts.filter(function(p) { return p !== port; });
    });
  }
});

// ── Side panel switching based on active tab ──
chrome.tabs.onActivated.addListener(async function(activeInfo) {
  try {
    var tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.includes('youtube.com/watch')) {
      chrome.sidePanel.setOptions({ tabId: tab.id, path: 'sidepanel/video-panel.html' });
    } else {
      chrome.sidePanel.setOptions({ tabId: tab.id, path: 'sidepanel/sidepanel.html' });
    }
  } catch (e) {}
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.url || changeInfo.status === 'complete') {
    try {
      if (tab.url && tab.url.includes('youtube.com/watch')) {
        chrome.sidePanel.setOptions({ tabId: tabId, path: 'sidepanel/video-panel.html' });
      } else {
        chrome.sidePanel.setOptions({ tabId: tabId, path: 'sidepanel/sidepanel.html' });
      }
    } catch (e) {}
  }
});

// Listen for messages
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'DICTIONARY_LOOKUP') {
    handleDictionaryLookup(message.word).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_PAGE_TEXT') {
    handleGetPageText().then(sendResponse);
    return true;
  }

  if (message.type === 'TRANSLATE') {
    handleTranslate(message.text, message.from, message.to).then(sendResponse);
    return true;
  }

  if (message.type === 'UPDATE_BADGE') {
    updateBadge();
  }

  if (message.type === 'FETCH_SUBTITLES') {
    handleFetchSubtitles(message.videoId, message.lang).then(sendResponse);
    return true;
  }

  if (message.type === 'OPEN_VIDEO_TAB') {
    chrome.tabs.create({ url: chrome.runtime.getURL('video/video.html') + (message.url ? '?url=' + encodeURIComponent(message.url) : '') });
  }

  // ── Side panel requests current YouTube state ──
  if (message.type === 'GET_YT_STATE_RELAY') {
    chrome.tabs.query({ url: '*://www.youtube.com/watch*' }, function(tabs) {
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_YT_STATE' }, function(response) {
          sendResponse(response || { success: false });
        });
      } else {
        sendResponse({ success: false, error: 'No YouTube tab found' });
      }
    });
    return true;
  }

  // ── YouTube content script → side panel routing (via port) ──
  if (message.type === 'YT_TIME_UPDATE' || message.type === 'YT_STATE_CHANGE' || message.type === 'YT_VIDEO_DETECTED') {
    for (var i = 0; i < videoPanelPorts.length; i++) {
      try { videoPanelPorts[i].postMessage(message); } catch (e) {}
    }
  }

  // ── Side panel → YouTube content script routing ──
  if (message.type === 'SEEK' || message.type === 'PLAY' || message.type === 'PAUSE' || message.type === 'ENTER_PIP') {
    chrome.tabs.query({ url: '*://www.youtube.com/watch*' }, function(tabs) {
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, message).catch(function() {});
      }
    });
  }
});

async function handleGetPageText() {
  try {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    var tab = tabs[0];
    if (!tab) return { success: false, error: 'No active tab' };

    try {
      var response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_TEXT' });
      if (response && response.success) return response;
    } catch (e) {}

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js'],
      });
    } catch (e) {
      return { success: false, error: 'Cannot access this page. Try a regular web page.' };
    }

    await new Promise(function(r) { setTimeout(r, 150); });

    try {
      var response2 = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_TEXT' });
      return response2 || { success: false, error: 'Content script did not respond' };
    } catch (e) {
      return { success: false, error: 'Failed to communicate with page. Please refresh and try again.' };
    }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to extract text from page' };
  }
}

async function handleDictionaryLookup(word) {
  try {
    var response = await fetch(DICTIONARY_API + '/' + encodeURIComponent(word));
    if (!response.ok) return { success: false, error: 'API returned ' + response.status };
    var data = await response.json();
    return { success: true, data: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleTranslate(text, from, to) {
  try {
    var url = 'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(text) + '&langpair=' + from + '|' + to;
    var response = await fetch(url);
    if (!response.ok) return { success: false, error: 'Translation API returned ' + response.status };
    var data = await response.json();
    if (data.responseData && data.responseData.translatedText) {
      return { success: true, translation: data.responseData.translatedText };
    }
    return { success: false, error: 'No translation found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch YouTube subtitles via a hidden tab + content script injection.
 * This approach works because the fetch happens from youtube.com's origin,
 * bypassing the chrome-extension:// origin block.
 */
async function handleFetchSubtitles(videoId, lang) {
  var tab = null;
  try {
    // Step 1: Create a hidden tab to YouTube watch page
    tab = await chrome.tabs.create({
      url: 'https://www.youtube.com/watch?v=' + videoId,
      active: false,
    });

    // Step 2: Wait for the page to finish loading
    await new Promise(function(resolve, reject) {
      var timeout = setTimeout(function() { reject(new Error('Page load timeout')); }, 15000);
      function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          clearTimeout(timeout);
          setTimeout(resolve, 500); // extra wait for JS to execute
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });

    // Step 3: Call ANDROID innertube API from youtube.com origin (bypasses exp=xpe issue)
    var playerResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: async function(vid) {
        try {
          var resp = await fetch('/youtubei/v1/player?prettyPrint=false', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoId: vid,
              context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } },
            }),
          });
          if (!resp.ok) return null;
          var data = await resp.json();
          if (!data.captions || !data.captions.playerCaptionsTracklistRenderer) return null;
          return data.captions.playerCaptionsTracklistRenderer.captionTracks || null;
        } catch (e) { return null; }
      },
      args: [videoId],
    });

    var tracks = playerResults && playerResults[0] && playerResults[0].result;
    if (!tracks || tracks.length === 0) {
      return { success: false, error: 'No captions found for this video.' };
    }

    // Step 4: Select the best language track
    var track = tracks.find(function(t) { return t.languageCode === lang; });
    if (!track) track = tracks.find(function(t) { return t.languageCode.startsWith(lang); });
    if (!track && lang !== 'en') {
      track = tracks.find(function(t) { return t.languageCode === 'en' || t.languageCode.startsWith('en'); });
    }
    if (!track) track = tracks[0];
    if (!track.baseUrl) return { success: false, error: 'No caption URL found' };

    // Step 5: Fetch caption XML from youtube.com's origin (via content script)
    var captionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: async function(url) {
        try {
          var resp = await fetch(url);
          if (!resp.ok) return null;
          return await resp.text();
        } catch (e) {
          return null;
        }
      },
      args: [track.baseUrl],
    });

    var captionXml = captionResults && captionResults[0] && captionResults[0].result;
    if (!captionXml || captionXml.length === 0) {
      return { success: false, error: 'Caption data was empty' };
    }

    // Step 6: Parse the XML
    var subtitles = parseTimedTextXml(captionXml);
    if (subtitles.length === 0) {
      return { success: false, error: 'Failed to parse caption XML' };
    }

    return { success: true, subtitles: subtitles, language: track.languageCode };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch subtitles' };
  } finally {
    // Always close the hidden tab
    if (tab && tab.id) {
      try { chrome.tabs.remove(tab.id); } catch (e) {}
    }
  }
}

/**
 * Parse YouTube timedtext XML into subtitle objects.
 * Handles both formats:
 *  - Format 3 (ANDROID): <p t="ms" d="ms"><s>word</s><s t="ms">word</s>...</p>
 *  - Legacy format: <text start="sec" dur="sec">text</text>
 */
function parseTimedTextXml(xml) {
  var subtitles = [];

  // Try Format 3 first: <p t="..." d="...">...<s>text</s>...</p>
  var pRegex = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g;
  var pMatch;
  while ((pMatch = pRegex.exec(xml)) !== null) {
    var startMs = parseInt(pMatch[1] || '0');
    var durationMs = parseInt(pMatch[2] || '0');
    var innerHtml = pMatch[3];

    // Extract text from <s> tags or use raw text
    var text = '';
    var sRegex = /<s[^>]*>([^<]*)<\/s>/g;
    var sMatch;
    while ((sMatch = sRegex.exec(innerHtml)) !== null) {
      text += sMatch[1];
    }
    // If no <s> tags, use inner content directly
    if (!text) {
      text = innerHtml.replace(/<[^>]+>/g, '');
    }
    text = decodeXmlEntities(text).trim();

    if (text) {
      subtitles.push({
        start: startMs / 1000,
        duration: durationMs / 1000,
        text: text,
      });
    }
  }

  if (subtitles.length > 0) return subtitles;

  // Fallback: Legacy format <text start="sec" dur="sec">text</text>
  var textRegex = /<text\s+start="([^"]*)"(?:\s+dur="([^"]*)")?[^>]*>([\s\S]*?)<\/text>/g;
  var match;
  while ((match = textRegex.exec(xml)) !== null) {
    var start = parseFloat(match[1] || '0');
    var duration = parseFloat(match[2] || '0');
    var text2 = decodeXmlEntities(match[3] || '');
    text2 = text2.replace(/<[^>]+>/g, '').trim();
    if (text2) {
      subtitles.push({ start: start, duration: duration, text: text2 });
    }
  }

  return subtitles;
}

function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, function(m, num) { return String.fromCharCode(parseInt(num)); })
    .replace(/\n/g, ' ');
}

async function updateBadge() {
  try {
    var result = await chrome.storage.local.get('vocablens_flashcards');
    var cards = result.vocablens_flashcards || {};
    var now = Date.now();
    var dueCount = 0;
    var allCards = Object.values(cards);
    for (var i = 0; i < allCards.length; i++) {
      if (now >= allCards[i].sm2.nextReview) dueCount++;
    }
    var text = dueCount > 0 ? String(dueCount) : '';
    await chrome.action.setBadgeText({ text: text });
    await chrome.action.setBadgeBackgroundColor({ color: dueCount > 0 ? '#ef4444' : '#6c757d' });
  } catch (e) {}
}

chrome.runtime.onStartup.addListener(updateBadge);
chrome.runtime.onInstalled.addListener(function() {
  updateBadge();
  chrome.contextMenus.removeAll(function() {
    chrome.contextMenus.create({
      id: 'open-vocablens',
      title: 'Analyze with VocabLens',
      contexts: ['page'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'open-vocablens') {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// ── External messages from VocabLens Web ──
chrome.runtime.onMessageExternal.addListener(function(message, sender, sendResponse) {
  if (message.type === 'VOCABLENS_SYNC_CARD') {
    // Web app sends a card to sync
    handleExternalAddCard(message.card).then(sendResponse);
    return true;
  }

  if (message.type === 'VOCABLENS_SYNC_REMOVE') {
    handleExternalRemoveCard(message.word).then(sendResponse);
    return true;
  }

  if (message.type === 'VOCABLENS_GET_ALL_CARDS') {
    // Web app requests all cards
    handleExternalGetCards().then(sendResponse);
    return true;
  }

  if (message.type === 'VOCABLENS_PING') {
    sendResponse({ success: true, version: '1.3.0' });
    return false;
  }
});

async function handleExternalAddCard(card) {
  try {
    var result = await chrome.storage.local.get('vocablens_flashcards');
    var cards = result.vocablens_flashcards || {};
    var word = card.word.toLowerCase().trim();

    if (cards[word]) {
      return { success: true, exists: true };
    }

    cards[word] = {
      word: word,
      definition: card.definition || null,
      sm2: {
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReview: Date.now(),
        lastReview: null,
      },
      learned: false,
      createdAt: card.createdAt || Date.now(),
    };

    await chrome.storage.local.set({ vocablens_flashcards: cards });
    updateBadge();
    return { success: true, exists: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleExternalRemoveCard(word) {
  try {
    var result = await chrome.storage.local.get('vocablens_flashcards');
    var cards = result.vocablens_flashcards || {};
    word = word.toLowerCase().trim();
    delete cards[word];
    await chrome.storage.local.set({ vocablens_flashcards: cards });
    updateBadge();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleExternalGetCards() {
  try {
    var result = await chrome.storage.local.get('vocablens_flashcards');
    return { success: true, cards: result.vocablens_flashcards || {} };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
