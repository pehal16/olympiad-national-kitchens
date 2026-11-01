(function(root){
  'use strict';
  let mounted=false;
  function mount(sessionId){
    if(mounted)return;mounted=true;
    const anchor=document.getElementById('hero-section');if(!anchor)return;
    const panel=document.createElement('section');panel.className='demo-statistics';panel.id='demo-statistics';panel.setAttribute('aria-labelledby','demo-statistics-title');
    panel.innerHTML='<div class="demo-statistics-head"><div><span class="eyebrow">Ресторан открыт для знакомства</span><h2 id="demo-statistics-title">Демоверсия в цифрах</h2></div><button class="button secondary" type="button">Обновить</button></div><dl><div><dt>Уникальные браузеры</dt><dd data-metric="uniqueBrowsers">—</dd></div><div><dt>Открытия страницы</dt><dd data-metric="pageViews">—</dd></div><div><dt>Начатые прохождения</dt><dd data-metric="startedAttempts">—</dd></div></dl><p class="demo-statistics-status" role="status">Загружаем статистику…</p><p class="demo-statistics-note">Это приблизительное число посетителей. Другой браузер, адрес демоверсии или очистка его данных дают новую отметку. Без доступного хранилища учитываются открытия, но не уникальный браузер. ФИО и IP для счётчика не сохраняются.</p>';
    anchor.after(panel);
    const status=panel.querySelector('[role=status]'),button=panel.querySelector('button');
    const viewId=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
    // A read-only inspection must not inflate the visitor statistics.
    const preview=new URLSearchParams(root.location.search).get('demo-preview')==='1';
    let persistent=false,recorded=preview,pending=false;
    try{persistent=localStorage.getItem('nko_anonymous_demo_session_v1')===sessionId;}catch{}
    async function request(path,options={}){
      const response=await fetch('/api/public/demo/'+path,{...options,credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json','X-Demo-Session':sessionId},signal:AbortSignal.timeout(6000)});
      if(!response.ok)throw Error('Counter unavailable');return response.status===204?null:response.json();
    }
    async function refresh(){
      if(pending||document.hidden)return;
      pending=true;button.disabled=true;
      try{
        if(!recorded){await request('visit',{method:'POST',body:JSON.stringify({viewId,persistent})});recorded=true;}
        const result=await request('statistics');if(!result.ok)throw Error('Counter unavailable');
        const data=result.data;
        for(const key of ['uniqueBrowsers','pageViews','startedAttempts']){
          if(!Number.isSafeInteger(data[key])||data[key]<0)throw Error('Counter unavailable');
          panel.querySelector('[data-metric='+key+']').textContent=data[key].toLocaleString('ru-RU');
        }
        const date=new Date(data.countingSince).toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'});
        status.textContent='Подсчёт с '+date+' · только демонстрационная версия'+(preview?' · проверочный просмотр не учитывается':'');
      }catch{status.textContent='Статистика временно недоступна. Это не мешает начать или продолжить олимпиаду.';}
      finally{pending=false;button.disabled=false;}
    }
    button.addEventListener('click',refresh);
    root.addEventListener('online',refresh);
    document.addEventListener('visibilitychange',()=>{if(!recorded)void refresh();});
    void refresh();
  }
  root.DemoAnalytics={mount};
})(window);
