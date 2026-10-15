"use strict";
const { ORIGIN, createNetworkFetch } = require('./lib/desktop-network-fetch');
const nativeFetch = globalThis.fetch, adaptiveFetch = createNetworkFetch();
globalThis.fetch = (input, options) => {
  let url; try { url = new URL(typeof input === 'string' ? input : input.url || input); } catch { return nativeFetch(input, options); }
  return url.origin === ORIGIN && url.pathname.startsWith('/api/') ? adaptiveFetch(url, options) : nativeFetch(input, options);
};
