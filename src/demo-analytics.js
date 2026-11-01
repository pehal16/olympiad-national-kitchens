"use strict";
const {createHash} = require('node:crypto');
const BASE = '/api/public/demo/';
function visitorKey(session) { return /^[a-f0-9]{32}$/.test(session||'') ? createHash('sha256').update(session).digest('hex') : null; }
function analyticsRoute(path) { return [BASE+'visit', BASE+'statistics'].includes(path); }
function json(status, data) {
  return new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
async function smallJson(request) {
  const reader = request.body?.getReader();
  const chunks=[]; let size=0;
  if(reader) try {
    while(true) {
      const {value,done}=await reader.read(); if(done)break;
      size+=value.byteLength;
      if(size>512) { await reader.cancel(); const error=new Error('Слишком большой запрос.');error.status=413;throw error; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function handleDemoAnalytics(request, env) {
  const path=new URL(request.url).pathname;
  if(!analyticsRoute(path))return null;
  if(String(env?.OLYMPIAD_DEMO_MODE)!=='true')return json(404,{ok:false,message:'Страница не найдена.'});
  try {
    if(path===BASE+'visit') {
      if(request.method!=='POST')return json(405,{ok:false,message:'Метод недоступен.'});
      if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return json(415,{ok:false,message:'Требуется JSON.'});
      const session=request.headers.get('X-Demo-Session')||'';
      if(!/^[a-f0-9]{32}$/.test(session))return json(400,{ok:false,message:'Некорректная демосессия.'});
      let body;
      try {body=await smallJson(request);}catch(error){return json(error.status||400,{ok:false,message:'Некорректный запрос счётчика.'});}
      if(!body||!/^[a-f0-9]{32}$/.test(body.viewId||'')||typeof body.persistent!=='boolean'||Object.keys(body).some(k=>!['viewId','persistent'].includes(k)))return json(400,{ok:false,message:'Некорректный запрос счётчика.'});
      // Reuse only a digest of the already-existing random demo identity.
      // Neither raw IDs, IPs, user agents, referrers nor page URLs are saved.
      const visitor=visitorKey(session);
      await env.DB.prepare('INSERT OR IGNORE INTO demo_page_views(view_id,visitor_hash,persistent,created_at) VALUES (?1,?2,?3,?4)')
        .bind(body.viewId,visitor,body.persistent?1:0,new Date().toISOString()).run();
      return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
    }
    if(!['GET','HEAD'].includes(request.method))return json(405,{ok:false,message:'Метод недоступен.'});
    const row=await env.DB.prepare(`SELECT s.started_at,s.page_views,s.unique_browsers,
      (SELECT COUNT(*) FROM attempts a
       WHERE json_extract(a.payload_json,'$.demonstration')=1
       AND json_extract(a.payload_json,'$.startedAt')>=s.started_at
       AND EXISTS (SELECT 1 FROM demo_page_views v
         WHERE json_extract(a.payload_json,'$.demoVisitorHash')=v.visitor_hash)) AS started_attempts
      FROM demo_visit_summary s WHERE s.id=1`).first();
    if(!row)throw Error('Analytics not initialized');
    const response=json(200,{ok:true,data:{countingSince:row.started_at,timeZone:'Europe/Moscow',pageViews:Number(row.page_views),uniqueBrowsers:Number(row.unique_browsers),startedAttempts:Number(row.started_attempts),uniqueMetric:'persistent_browser'}});
    return request.method==='HEAD'?new Response(null,{status:200,headers:response.headers}):response;
  }catch {return json(503,{ok:false,message:'Статистика временно недоступна. Прохождение продолжает работать.'});}
}
module.exports={analyticsRoute,handleDemoAnalytics,visitorKey};
