"use strict";

// A separate Pages project and separate D1 database own all demonstration data.
// Neither this backend nor its relay falls back to the college PC or old D1.
const DEMO_ORIGIN = 'https://olympiad-gkts-demo.pages.dev';
let active = false;
function configureDemo(env) { active = String(env?.OLYMPIAD_DEMO_MODE || '') === 'true'; }
function demoEnabled() { return active; }
function anonymousProfile(req) {
  const session = String(req.headers?.['x-demo-session'] || '');
  if (!/^[a-f0-9]{32}$/.test(session)) {
    return null;
  }
  return { fullName: 'Демонстрационный Участник', institution: 'Демонстрационная площадка',
    groupName: 'ДЕМО-' + require('node:crypto').createHash('sha256').update(session).digest('hex').slice(0,16), mentorName: '' };
}
function publicRoute(path) { return require('./desktop-primary-relay').publicRoute(path); }
async function handleDemoRelay(request, env, fetcher = (url, options) => globalThis.fetch(url, options)) {
  if (String(env?.OLYMPIAD_PUBLIC_DEMO || '') !== 'true' || !publicRoute(new URL(request.url).pathname)) return null;
  const url = new URL(request.url);
  const headers = new Headers({Accept:'application/json'});
  for (const key of ['Content-Type','X-Attempt-Token','X-Demo-Session']) if (request.headers.has(key)) headers.set(key,request.headers.get(key));
  if (!['GET','HEAD','POST'].includes(request.method)) return failure(405,'Метод недоступен.');
  try {
    let body;
    if (!['GET','HEAD'].includes(request.method)) {
      const reader = request.body?.getReader(), chunks=[]; let size=0;
      if(reader)try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;
        if(size>1024*1024){await reader.cancel();return failure(413,'Слишком большой запрос.');}chunks.push(item.value);
      }}finally{reader.releaseLock();}
      body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
    }
    const response=await fetcher(DEMO_ORIGIN+url.pathname+url.search,{method:request.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(20000)});
    if (!/application\/json/i.test(response.headers.get('Content-Type')||'')) return failure(502,'Демонстрационная площадка временно недоступна.');
    return new Response(request.method==='HEAD'?null:await response.text(),{status:response.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'}});
  } catch { return failure(502,'Не удалось подключиться к демонстрационной площадке. Попробуйте ещё раз.'); }
}
function failure(status,message){return new Response(JSON.stringify({ok:false,message}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'}});}
module.exports={DEMO_ORIGIN,configureDemo,demoEnabled,anonymousProfile,handleDemoRelay};
