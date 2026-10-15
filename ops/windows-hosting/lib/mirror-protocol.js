"use strict";
const crypto = require('node:crypto');
const ENDPOINT = '/api/desktop-mirror';
function message(url, timestamp, nonce) {
  return Buffer.from(`olympiad-desktop-mirror-v1\nGET\n${url.pathname}${url.search}\n${timestamp}\n${nonce}`, 'utf8');
}
function signedHeaders(url, privateKey, now = Date.now()) {
  const timestamp = String(now), nonce = crypto.randomBytes(16).toString('hex');
  return { Accept: 'application/json', 'X-Mirror-Time': timestamp, 'X-Mirror-Nonce': nonce,
    'X-Mirror-Signature': crypto.sign(null, message(new URL(url), timestamp, nonce), privateKey).toString('base64') };
}
function authorized(request, publicKeyBase64, now = Date.now()) {
  try {
    if (request.method !== 'GET' || new URL(request.url).pathname !== ENDPOINT || !publicKeyBase64) return false;
    const timestamp = request.headers.get('x-mirror-time'), nonce = request.headers.get('x-mirror-nonce'), signature = request.headers.get('x-mirror-signature');
    if (!/^\d{13}$/.test(timestamp || '') || Math.abs(now - Number(timestamp)) > 300000 || !/^[a-f0-9]{32}$/.test(nonce || '') || !/^[A-Za-z0-9+/]{86}==$/.test(signature || '')) return false;
    const key = crypto.createPublicKey({ key: Buffer.from(publicKeyBase64, 'base64'), format: 'der', type: 'spki' });
    return key.asymmetricKeyType === 'ed25519' && crypto.verify(null, message(new URL(request.url), timestamp, nonce), key, Buffer.from(signature, 'base64'));
  } catch { return false; }
}
function fingerprint(attempt, variant, answers, events) {
  return JSON.stringify([attempt.updated_at, Number(attempt.state_revision), variant?.updated_at || '', answers.length,
    answers.reduce((latest, row) => row.updated_at > latest ? row.updated_at : latest, ''), events.length,
    events.reduce((latest, row) => row.received_at > latest ? row.received_at : latest, '')]);
}
module.exports = { ENDPOINT, signedHeaders, authorized, fingerprint };
