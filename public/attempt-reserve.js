(function(root){
  'use strict';
  const origins=['https://xn--80aaloaqinm.xn--b1amqadnhd.xn--p1ai','https://olympiad-gkts.pages.dev'];
  function validate(value,now=Date.now()){
    if(!value||value.version!==1||!origins.includes(value.from)||!Number.isFinite(value.createdAt)||Math.abs(now-value.createdAt)>30*60000||
      !/^[A-Za-z0-9_-]{1,160}$/.test(value.attemptId||'')||!/^[A-Za-z0-9_-]{20,200}$/.test(value.token||''))throw Error('Ссылка продолжения недействительна. Откройте её заново с исходной страницы.');
    if(value.queue!==undefined&&(!Array.isArray(value.queue)||value.queue.length>40))throw Error('Некорректный черновик продолжения.');
    return {version:1,from:value.from,createdAt:value.createdAt,attemptId:value.attemptId,token:value.token,
      ...(value.draft?{draft:value.draft}:{}),...(value.queue?{queue:value.queue}:{} )};
  }
  function encode(value){
    const bytes=new TextEncoder().encode(JSON.stringify(validate(value)));if(bytes.length>24000)throw Error('Черновик слишком большой для перехода. Дождитесь сохранения ответа.');
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function decode(hash,origin,now=Date.now()){
    if(!hash.startsWith('#resume='))return null;
    if(!origins.includes(origin)||hash.length>33000||!/^#resume=[A-Za-z0-9_-]+$/.test(hash))throw Error('Некорректная ссылка продолжения.');
    try{const text=hash.slice(8).replace(/-/g,'+').replace(/_/g,'/');return validate(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(text),c=>c.charCodeAt(0)))),now);}
    catch{throw Error('Ссылка продолжения недействительна. Откройте её заново с исходной страницы.');}
  }
  function link(target,value){if(!origins.includes(target))throw Error('Недопустимый адрес продолжения.');return target+'/#resume='+encode(value);}
  const api={origins,encode,decode,link};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AttemptReserve=api;
})(typeof window==='undefined'?globalThis:window);
