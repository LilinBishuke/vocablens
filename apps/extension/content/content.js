/**
 * Content script - extracts visible text from the page.
 * Uses TreeWalker to traverse DOM, excluding script/style/nav elements.
 */

const EXCLUDED_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'MATH', 'CODE', 'PRE',
  'NAV', 'HEADER', 'FOOTER', 'IFRAME', 'OBJECT', 'EMBED',
]);

const MAX_TEXT_LENGTH = 100000;

/**
 * Extract visible text content from the page.
 */
function extractPageText() {
  const textParts = [];
  let totalLength = 0;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip invisible elements
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (EXCLUDED_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;

        // Skip hidden elements
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip empty text
        const text = node.textContent.trim();
        if (!text) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.trim();
    if (text && totalLength < MAX_TEXT_LENGTH) {
      textParts.push(text);
      totalLength += text.length;
    }
    if (totalLength >= MAX_TEXT_LENGTH) break;
  }

  return textParts.join(' ');
}

// Listen for messages from the background or sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_TEXT') {
    try {
      const text = extractPageText();
      sendResponse({ success: true, text, url: window.location.href, title: document.title });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }
  return true;
});
