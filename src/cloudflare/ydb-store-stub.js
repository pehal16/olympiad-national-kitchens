"use strict";

function unavailable() {
  throw new Error("YDB storage is not available in the Cloudflare runtime.");
}

module.exports = new Proxy(
  {},
  {
    get() {
      return unavailable;
    }
  }
);
