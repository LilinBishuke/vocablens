/**
 * YouTube subtitle/caption extractor.
 * Fetches captions from YouTube videos using the timedtext API.
 */

/**
 * Extract video ID from various YouTube URL formats.
 * @param {string} url
 * @returns {string|null}
 */
export function extractVideoId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // youtube.com/watch?v=xxx
    if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
      return u.searchParams.get('v');
    }
    // youtu.be/xxx
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('/')[0];
    }
    // youtube.com/embed/xxx
    if (u.pathname.startsWith('/embed/')) {
      return u.pathname.split('/')[2];
    }
    // youtube.com/shorts/xxx
    if (u.pathname.startsWith('/shorts/')) {
      return u.pathname.split('/')[2];
    }
  } catch {
    // Try regex fallback
    const match = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }
  return null;
}

/**
 * Get YouTube video info (title, thumbnail).
 * Uses oEmbed API (no key needed).
 * @param {string} videoId
 * @returns {Promise<Object>}
 */
export async function getVideoInfo(videoId) {
  try {
    const resp = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!resp.ok) throw new Error('Failed to fetch video info');
    const data = await resp.json();
    return {
      title: data.title || '',
      author: data.author_name || '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return {
      title: '',
      author: '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

/**
 * Fetch subtitles for a YouTube video.
 * Strategy: fetch the video page HTML and extract caption track URLs.
 * @param {string} videoId
 * @param {string} [lang='en'] - Preferred language
 * @returns {Promise<Array<{start: number, duration: number, text: string}>>}
 */
export async function fetchSubtitles(videoId, lang = 'en') {
  // Fetch via background service worker to avoid CORS
  const response = await chrome.runtime.sendMessage({
    type: 'FETCH_SUBTITLES',
    videoId,
    lang,
  });

  if (response && response.success) {
    return response.subtitles;
  }

  throw new Error(response?.error || 'Failed to fetch subtitles');
}

/**
 * Parse YouTube timedtext XML into subtitle array.
 * @param {string} xml
 * @returns {Array<{start: number, duration: number, text: string}>}
 */
export function parseTimedTextXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const textElements = doc.querySelectorAll('text');
  const subtitles = [];

  for (const el of textElements) {
    const start = parseFloat(el.getAttribute('start') || '0');
    const duration = parseFloat(el.getAttribute('dur') || '0');
    // Decode HTML entities in text
    const text = decodeHtmlEntities(el.textContent || '');

    if (text.trim()) {
      subtitles.push({ start, duration, text: text.trim() });
    }
  }

  return subtitles;
}

/**
 * Group subtitles into segments (merge nearby subtitles).
 * @param {Array} subtitles
 * @param {number} [gapThreshold=1.5] - Max gap in seconds to merge
 * @returns {Array<{start: number, end: number, text: string}>}
 */
export function groupSubtitles(subtitles, gapThreshold = 0.3, maxChars = 120) {
  if (subtitles.length === 0) return [];

  const segments = [];
  let current = {
    start: subtitles[0].start,
    end: subtitles[0].start + subtitles[0].duration,
    texts: [subtitles[0].text],
    charCount: subtitles[0].text.length,
  };

  for (let i = 1; i < subtitles.length; i++) {
    const sub = subtitles[i];
    const gap = sub.start - current.end;
    const newCharCount = current.charCount + sub.text.length + 1;

    if (gap <= gapThreshold && newCharCount <= maxChars) {
      // Merge into current segment
      current.end = sub.start + sub.duration;
      current.texts.push(sub.text);
      current.charCount = newCharCount;
    } else {
      // Finalize current and start new
      segments.push({
        start: current.start,
        end: current.end,
        text: current.texts.join(' '),
      });
      current = {
        start: sub.start,
        end: sub.start + sub.duration,
        texts: [sub.text],
        charCount: sub.text.length,
      };
    }
  }

  // Push last segment
  segments.push({
    start: current.start,
    end: current.end,
    text: current.texts.join(' '),
  });

  return segments;
}

/**
 * Format seconds to MM:SS or HH:MM:SS.
 */
export function formatTime(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = n => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

function decodeHtmlEntities(str) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
}
