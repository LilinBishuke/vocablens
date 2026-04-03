/**
 * YouTube Content Script - Runs on youtube.com/watch pages.
 * Monitors video playback, sends time updates, and receives control commands.
 */

(function() {
  'use strict';

  let lastVideoId = null;
  let timeUpdateInterval = null;
  let videoElement = null;

  /**
   * Extract video ID from the current URL.
   */
  function getVideoIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get('v') || null;
  }

  /**
   * Get the video title from the page.
   */
  function getVideoTitle() {
    // Try multiple selectors for resilience
    var titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
                  document.querySelector('h1.ytd-video-primary-info-renderer') ||
                  document.querySelector('#title h1') ||
                  document.querySelector('meta[name="title"]');
    if (titleEl) {
      return titleEl.textContent ? titleEl.textContent.trim() : (titleEl.content || '');
    }
    return document.title.replace(' - YouTube', '').trim();
  }

  /**
   * Find the main video element on the page.
   */
  function findVideoElement() {
    // The main player video
    return document.querySelector('video.html5-main-video') ||
           document.querySelector('#movie_player video') ||
           document.querySelector('video');
  }

  /**
   * Start monitoring the video element for time updates.
   */
  function startMonitoring() {
    stopMonitoring();

    videoElement = findVideoElement();
    if (!videoElement) {
      // Retry after a short delay - video might not be loaded yet
      setTimeout(startMonitoring, 1000);
      return;
    }

    // Write time updates to storage (read by side panel via storage.onChanged)
    timeUpdateInterval = setInterval(function() {
      if (videoElement) {
        chrome.storage.local.set({
          vocablens_yt_state: {
            currentTime: videoElement.currentTime,
            paused: videoElement.paused,
            videoId: getVideoIdFromUrl(),
            title: getVideoTitle(),
            updatedAt: Date.now()
          }
        });
      }
    }, 500);

    // State change events
    videoElement.addEventListener('play', onPlay);
    videoElement.addEventListener('pause', onPause);
    videoElement.addEventListener('ended', onEnded);
    videoElement.addEventListener('seeked', onSeeked);
  }

  /**
   * Stop monitoring and clean up listeners.
   */
  function stopMonitoring() {
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
      timeUpdateInterval = null;
    }
    if (videoElement) {
      videoElement.removeEventListener('play', onPlay);
      videoElement.removeEventListener('pause', onPause);
      videoElement.removeEventListener('ended', onEnded);
      videoElement.removeEventListener('seeked', onSeeked);
      videoElement = null;
    }
  }

  function writeState() {
    if (!videoElement) return;
    chrome.storage.local.set({
      vocablens_yt_state: {
        currentTime: videoElement.currentTime,
        paused: videoElement.paused,
        videoId: getVideoIdFromUrl(),
        title: getVideoTitle(),
        updatedAt: Date.now()
      }
    });
  }

  function onPlay() { writeState(); }
  function onPause() { writeState(); }
  function onEnded() { writeState(); }
  function onSeeked() { writeState(); }

  /**
   * Detect video page and notify the extension.
   */
  function detectVideo() {
    var videoId = getVideoIdFromUrl();
    if (!videoId) return;

    // Only act if the video ID changed (SPA navigation)
    if (videoId !== lastVideoId) {
      lastVideoId = videoId;

      // Wait a bit for the page to render the title, then start monitoring
      setTimeout(function() {
        // Write initial state to storage (side panel reads this)
        chrome.storage.local.set({
          vocablens_yt_state: {
            currentTime: 0,
            paused: true,
            videoId: videoId,
            title: getVideoTitle(),
            updatedAt: Date.now()
          }
        });
        startMonitoring();
      }, 1500);
    }
  }

  /**
   * Listen for commands from the side panel (routed via service worker).
   */
  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.type === 'SEEK') {
      var vid = findVideoElement();
      if (vid) {
        vid.currentTime = msg.time;
        vid.play();
      }
      sendResponse({ success: true });
    }

    if (msg.type === 'PLAY') {
      var vid2 = findVideoElement();
      if (vid2) vid2.play();
      sendResponse({ success: true });
    }

    if (msg.type === 'PAUSE') {
      var vid3 = findVideoElement();
      if (vid3) vid3.pause();
      sendResponse({ success: true });
    }

    if (msg.type === 'ENTER_PIP') {
      var vid4 = findVideoElement();
      if (vid4) {
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture().catch(function() {});
        } else {
          vid4.requestPictureInPicture().catch(function(err) {
            console.warn('PiP failed:', err);
          });
        }
      }
      sendResponse({ success: true });
    }

    if (msg.type === 'GET_YT_STATE') {
      var vid5 = findVideoElement();
      sendResponse({
        success: true,
        videoId: getVideoIdFromUrl(),
        title: getVideoTitle(),
        currentTime: vid5 ? vid5.currentTime : 0,
        paused: vid5 ? vid5.paused : true
      });
    }

    return true;
  });

  // Mark that content script is alive
  chrome.storage.local.set({ vocablens_yt_content_script: 'loaded_' + Date.now() });

  // Initial detection
  detectVideo();

  // Handle YouTube SPA navigation (pushState/replaceState)
  // YouTube is a single-page app, so we need to watch for URL changes
  var lastUrl = location.href;
  var urlObserver = new MutationObserver(function() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (location.pathname === '/watch') {
        detectVideo();
      } else {
        // Left a watch page
        stopMonitoring();
        lastVideoId = null;
      }
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: true });

  // Also listen for popstate (browser back/forward)
  window.addEventListener('popstate', function() {
    setTimeout(function() {
      if (location.pathname === '/watch') {
        detectVideo();
      } else {
        stopMonitoring();
        lastVideoId = null;
      }
    }, 500);
  });

  // Listen for yt-navigate-finish (YouTube's custom event for SPA navigation)
  window.addEventListener('yt-navigate-finish', function() {
    if (location.pathname === '/watch') {
      detectVideo();
    } else {
      stopMonitoring();
      lastVideoId = null;
    }
  });
})();
