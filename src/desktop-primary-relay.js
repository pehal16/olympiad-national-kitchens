"use strict";
const PRIMARY_ORIGIN = 'https://xn--80aaloaqinm.xn--b1amqadnhd.xn--p1ai';
function publicRoute(path) {
  return ['/api/health','/api/public/olympiad','/api/public/register','/api/public/attempts/start'].includes(path) ||
    /^\/api\/public\/attempts\/[^/]+(?:\/(?:certificate|story-result|current|pulse|answer|draft|tour\/start|dish-selection|finish|integrity))?$/.test(path);
}
function unavailable(status, message, code) {
  return new Response(JSON.stringify({ok:false,message,...(code?{code}:{})}), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'}});
}
async function handleDesktopPrimary(request, env, fetcher = (url, options) => globalThis.fetch(url, options)) {
  if (env.OLYMPIAD_STORAGE_MODE !== 'desktop-primary') return null;
  const url = new URL(request.url);
  if (publicRoute(url.pathname)) {
    if (!['GET','HEAD','POST'].includes(request.method)) return unavailable(405,'Метод недоступен.');
    const headers = new Headers({Accept:'application/json'});
    for (const key of ['Content-Type','X-Attempt-Token']) if (request.headers.has(key)) headers.set(key,request.headers.get(key));
    try {
      let body;
      if (!['GET','HEAD'].includes(request.method)) {
        const chunks=[], reader=request.body?.getReader(); let size=0;
        if (reader) { try { while(true) {const part=await reader.read();if(part.done)break;size+=part.value.byteLength;
          if(size>1024*1024){await reader.cancel();return unavailable(413,'Слишком большой запрос.');}chunks.push(part.value);
        }} finally {reader.releaseLock();} }
        body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
      }
      const response=await fetcher(PRIMARY_ORIGIN+url.pathname+url.search,{method:request.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(20000)});
      if(!/application\/json/i.test(response.headers.get('content-type')||''))return unavailable(502,'Нет связи с сервером на ПК. Откройте основной адрес олимпиады.','DESKTOP_UPSTREAM_HTTP_'+response.status);
      const text=await response.text();if(request.method!=='HEAD')JSON.parse(text);
      return new Response(request.method==='HEAD'?null:text,{status:response.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store',...(response.headers.has('retry-after')?{'Retry-After':response.headers.get('retry-after')}:{})}});
    } catch(error) {return unavailable(502,'Нет связи с сервером на ПК. Откройте основной адрес олимпиады.','DESKTOP_FETCH_'+(['TypeError','TimeoutError','AbortError','SyntaxError'].includes(error.name)?error.name:'Error')+(url.pathname==='/api/health'&&!url.search&&!request.headers.has('X-Attempt-Token')?': '+String(error.message).slice(0,180):''));}
  }
  // Never silently resume writes to the old D1 database after its quota resets.
  if (url.pathname === '/api/desktop-mirror') return unavailable(410,'Облачный снимок сохранён как архив. Основная база находится на ПК.');
  if (url.pathname.startsWith('/api/admin/')) return unavailable(503,'Откройте защищённую панель организатора на основном адресе /organizer.');
  if (['/admin','/admin.html','/organizer','/organizer.html'].includes(url.pathname)) return new Response(null,{status:307,headers:{Location:PRIMARY_ORIGIN+'/organizer','Cache-Control':'no-store'}});
  // Keep the Pages browser origin for its existing local owner tokens and
  // queued drafts. Its participant API uses the same desktop DB above.
  return null;
}
module.exports={PRIMARY_ORIGIN,publicRoute,handleDesktopPrimary};
