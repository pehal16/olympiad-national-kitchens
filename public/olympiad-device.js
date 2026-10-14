(function (root) {
  'use strict';
  // Phone browsers keep the same visibility control without requiring an
  // unavailable fullscreen API. Desktop requirements are unchanged.
  function isMobile(navigator) {
    return /Android|iPhone|iPad|iPod/i.test(navigator?.userAgent || '') ||
      (/Macintosh/i.test(navigator?.userAgent || '') && Number(navigator?.maxTouchPoints) > 1);
  }
  const api = { isMobile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OlympiadDevice = api;
})(typeof window !== 'undefined' ? window : globalThis);
