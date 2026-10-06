"use strict";

// Only call this for reads or writes whose identity/revision guard makes a
// retry safe even when D1 committed the first request but lost its response.
// https://developers.cloudflare.com/d1/best-practices/retry-queries/
async function retryD1(operation, options = {}) {
  const retries = options.retries ?? 3;
  const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const random = options.random || Math.random;
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      const message = `${error?.message || error} ${error?.cause?.message || ''}`;
      const transient = /Network connection lost|storage caused object to be reset|reset because its code was updated|Replica disconnected from primary|transient issue on remote node/i.test(message);
      if (!transient || attempt >= retries) throw error;
      await sleep(Math.min(600, 75 * 2 ** attempt) * (1 + random()));
    }
  }
}

module.exports = { retryD1 };
