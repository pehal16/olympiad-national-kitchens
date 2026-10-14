"use strict";
const ORIGIN="https://olympiad-gkts.pages.dev";
async function relayParticipantApi(req,res,url,fetcher=fetch){
  const headers={Accept:'application/json'};
  if(req.headers['content-type'])headers['Content-Type']=req.headers['content-type'];
  if(req.headers['x-attempt-token'])headers['X-Attempt-Token']=req.headers['x-attempt-token'];
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'});res.end(JSON.stringify(data));};
  try{
    let body;
    if(!['GET','HEAD'].includes(req.method)){
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>1024*1024){send(413,{ok:false,message:'Слишком большой запрос.'});return;}chunks.push(chunk);}
      body=Buffer.concat(chunks);
    }
    const upstream=await fetcher(ORIGIN+url.pathname+url.search,{method:req.method,headers,body,redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!/application\/json/i.test(upstream.headers.get('content-type')||'')){send(502,{ok:false,message:'Сервер временно недоступен. Откройте резервный адрес.'});return;}
    const text=await upstream.text();
    JSON.parse(text);
    res.writeHead(upstream.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store',...(upstream.headers.get('retry-after')?{'Retry-After':upstream.headers.get('retry-after')}:{} )});res.end(text);
  }catch{if(!res.headersSent&&!res.destroyed)send(502,{ok:false,message:'Сервер временно недоступен. Откройте резервный адрес.'});}
}
module.exports={ORIGIN,relayParticipantApi};
