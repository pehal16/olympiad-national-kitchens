"use strict";
const https = require('node:https'), http = require('node:http'), tls = require('node:tls');
const { execFileSync } = require('node:child_process');
const ORIGIN = 'https://olympiad-gkts.pages.dev';
let cachedProxy, proxyCheckedAt = 0;
function windowsProxy() {
  if (Date.now() - proxyCheckedAt < 10000) return cachedProxy;
  proxyCheckedAt = Date.now(); cachedProxy = null;
  if (process.platform !== 'win32') return cachedProxy;
  try {
    const text = execFileSync('reg.exe', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'], { encoding: 'utf8', windowsHide: true, timeout: 2000 });
    if (/ProxyEnable\s+REG_DWORD\s+0x1\b/i.test(text)) {
      const address = text.match(/ProxyServer\s+REG_SZ\s+((?:127\.0\.0\.1|localhost):\d{1,5})\s*(?:\r?\n|$)/i)?.[1];
      if (address && Number(address.split(':')[1]) > 0 && Number(address.split(':')[1]) <= 65535) cachedProxy = 'http://' + address;
    }
  } catch { /* Direct internet remains available when no usable loopback proxy is configured. */ }
  return cachedProxy;
}
class LoopbackProxyAgent extends https.Agent {
  constructor(proxy) { super({ keepAlive: true, maxSockets: 140 }); this.proxy = new URL(proxy); }
  createConnection(options, callback) {
    let done = false;
    const complete = (error, socket) => { if (!done) { done = true; callback(error, socket); } else if (error) socket?.destroy(); };
    const request = http.request({ host: this.proxy.hostname, port: this.proxy.port, method: 'CONNECT', path: `${options.host}:${options.port || 443}`, headers: { Host: `${options.host}:${options.port || 443}` }, agent: false });
    request.setTimeout(5000, () => request.destroy(new Error('Proxy connect timeout')));
    request.once('error', error => complete(error));
    request.once('connect', (response, socket, head) => {
      if (response.statusCode !== 200) { socket.destroy(); complete(new Error('Proxy connect refused')); return; }
      if (head.length) socket.unshift(head);
      const secure = tls.connect({ socket, servername: options.servername || options.host, rejectUnauthorized: true });
      secure.setTimeout(5000, () => secure.destroy(new Error('TLS connect timeout')));
      secure.once('error', error => complete(error, secure));
      secure.once('secureConnect', () => { secure.setTimeout(0); complete(null, secure); });
    });
    request.end();
  }
}
function requestHttps(url, options, agent, timeoutMs) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method: options.method || 'GET', headers: options.headers, agent, signal: options.signal }, response => {
      const chunks = []; let bytes = 0;
      response.on('data', chunk => { bytes += chunk.length; if (bytes > 8 * 1024 * 1024) { response.destroy(new Error('API response too large')); return; } chunks.push(chunk); });
      response.once('error', reject);
      response.once('end', () => {
        if (response.statusCode >= 300 && response.statusCode < 400) { reject(new Error('API redirect refused')); return; }
        resolve(new Response(Buffer.concat(chunks), { status: response.statusCode, headers: response.headers }));
      });
    });
    const timer = setTimeout(() => request.destroy(new Error('Network path timeout')), timeoutMs);
    request.once('close', () => clearTimeout(timer)); request.once('error', reject);
    if (options.body !== undefined) request.write(options.body); request.end();
  });
}
function createNetworkFetch({ getProxy = windowsProxy, request = requestHttps, timeoutMs = 5000 } = {}) {
  const direct = new https.Agent({ keepAlive: true, maxSockets: 140 }), proxies = new Map(); let preferred = null;
  const fetcher = async (input, options = {}) => {
    const url = new URL(input);
    if (url.origin !== ORIGIN || !url.pathname.startsWith('/api/')) throw new Error('Unsupported API origin');
    const proxy = getProxy(), paths = proxy ? [proxy, 'direct'] : ['direct'];
    if (paths.includes(preferred)) paths.sort((a, b) => Number(b === preferred) - Number(a === preferred));
    let last;
    for (const route of paths) {
      if (options.signal?.aborted) throw options.signal.reason;
      try {
        let agent = direct;
        if (route !== 'direct') { if (!proxies.has(route)) proxies.set(route, new LoopbackProxyAgent(route)); agent = proxies.get(route); }
        const response = await request(url, options, agent, timeoutMs); preferred = route; fetcher.lastTransport = route === 'direct' ? 'direct' : 'configured-proxy'; return response;
      } catch (error) { last = error; }
    }
    throw last || new Error('No internet path');
  };
  fetcher.close = () => { direct.destroy(); for (const agent of proxies.values()) agent.destroy(); };
  return fetcher;
}
module.exports = { ORIGIN, windowsProxy, createNetworkFetch };
