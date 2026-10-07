(function(root){
  'use strict';
  const doc=root.document,base='/assets/olympiad/story/v1/scenes/';
  const chapters=[
    ['Фотоальбом','album','В моём альбоме почти нет достопримечательностей. Зато каждый ужин — отдельная история. Узнаете это блюдо?'],
    ['Карта путешествий','map','Эти вкусы я привёз из разных поездок. Давайте отметим, где началась история каждого блюда.'],
    ['Записная книжка','notes','Названия в блокноте куда-то исчезли. Хорошо, что я записывал продукты и приготовление — три заметки помогут вернуть каждое блюдо в меню.'],
    ['Пожелания компании','orders','Мои друзья уже выбирают места за столом. У каждого свои пожелания: подберите подачу, которая подойдёт гостю.'],
    ['Финальная кухня','neutral','Меню почти готово — теперь заглянем на кухню. Соберите три подачи для нашего вечера. Я приму их, а впечатлениями поделюсь после общего финала.']
  ];
  let session=null,timer=null,request=null,onAvailable=null,resultMount=null,loaded=null,inFlight=false,chapterNode=null;
  function el(tag,cls,text){const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function button(text,fn,cls='button secondary'){const n=el('button',cls,text);n.type='button';n.addEventListener('click',fn);return n;}
  function image(path,alt,cls){const n=el('img',cls);n.src=path;n.alt=alt;n.decoding='async';n.addEventListener('error',()=>{n.hidden=true;});return n;}
  function arrow(direction,fn){const n=button('',fn,'story-arrow');n.setAttribute('aria-label',direction<0?'Предыдущие подачи':'Следующие подачи');n.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction<0?'M15 5 8 12l7 7':'m9 5 7 7-7 7'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;return n;}
  function phase(name){const line=doc.querySelector('.story-welcome-line');if(line&&name==='registered')line.textContent='«Итак, познакомились! Альбом уже на столе. Подтвердите правила и начинайте, когда будете готовы: наш вечер отсчитывается только после старта». ';}
  function intro(olympiad){
    if(!olympiad.storyEnabled)return;
    doc.body.classList.add('has-restaurant-story');
    const title=doc.getElementById('hero-title'),sub=doc.getElementById('hero-subtitle');
    title.textContent='Ресторан путешествий';
    sub.textContent='Вечер вкусов · олимпиада «Национальные кухни мира»';
    const hero=doc.querySelector('.landing-hero-media');hero.style.backgroundImage='none';hero.replaceChildren(root.RestaurantLayout.picture('arrival','restaurant-arrival','Гость приходит в ресторан с гастрономическим альбомом'));
    const note=doc.querySelector('.landing-pilot-note');
    if(note)note.textContent=olympiad.story?.entryMode==='anytime'
      ? (olympiad.story.entryOpen?'Начните в любое время. После старта у вас будут полные 45 минут.':olympiad.story.publishedAt?'Итоги опубликованы. Новые попытки этого проведения закрыты.':'Организатор остановил новые старты. Начатые попытки продолжаются.')
      : olympiad.story?`Вход ${olympiad.story.date}: с 00:00 до 00:00 следующего дня по Москве. Каждому — полные 45 минут.`:'Дата проведения будет объявлена организатором.';
    const existing=doc.getElementById('story-introduction');if(existing)existing.remove();
    const section=el('section','story-introduction');section.id='story-introduction';
    section.append(el('p','story-invitation','Гость приглашает вас за стол'),el('blockquote','story-welcome-line','«Я привёз альбом из путешествий. Поможете собрать меню для моих друзей? В конце вечера нас ждёт целый стол историй».'));
    const route=el('ol','story-chapters');chapters.forEach(([name],i)=>route.append(el('li','',`${i+1}. ${name}`)));
    section.append(route);
    const guide=el('details','story-answer-review');guide.append(el('summary','','Как проходить пять глав'));
    for(const text of [
      'Фотоальбом: узнайте десять блюд по фотографиям. Выберите один ответ и подтвердите его. За верный ответ — 2 балла; 6 минут, максимум 20.',
      'Карта: пять блоков по четыре блюда. Нажмите блюдо, затем страну, или перетащите карточку. Одна страна соответствует одному блюду. До подтверждения выбор можно изменить. За каждую верную пару — 1 балл; 6 минут, максимум 20.',
      'Записная книжка: восстановите десять названий по трём подсказкам. Введите название; регистр букв не важен. За верное название — 3 балла; 8 минут, максимум 30.',
      'Пожелания компании: восемь заказов. Прочитайте все условия и выберите одну из четырёх готовых подач. За подходящую подачу — 4 балла; 10 минут, максимум 32.',
      'Финальная кухня: три блюда. Выберите ровно четыре компонента для указанной версии рецепта, выполните показанные действия и нажмите «Подать». Каждый верный компонент — 4 балла, максимум 16 за блюдо; 15 минут, максимум 48.',
      'Соевый соус, имбирь и васаби сопровождают подачу роллов. Их выбирать не нужно; они не влияют на баллы.',
      'После подтверждения вернуться к заданию нельзя. Ошибки не дают штрафных баллов. По истечении лимита тура открывается следующий; при общем лимите 45 минут попытка завершается. Неподтверждённый выбор не считается ответом.',
      'Сюжет не добавляет баллов. Сразу после личного завершения можно открыть свидетельство с набранными баллами из 150. Правильные ответы не показываются. Персональный стол, реакции гостя и общие итоги открываются после публикации организатором.'
    ])guide.append(el('p','',text));section.append(guide);
    const entry=doc.getElementById('prestart-section'),copy=doc.querySelector('.landing-hero-copy');
    copy.append(section,entry);
    const rule=doc.querySelector('#prestart-section .landing-pilot-note');if(rule)rule.textContent=olympiad.story?.entryMode==='anytime'
      ? 'Время начинается только после нажатия «Начать олимпиаду». Перед стартом зарегистрируйтесь и подтвердите правила. На прохождение — 45 минут; итоги публикуются организатором.'
      : 'Время начинается только после явного старта. Даже при старте перед полуночью у вас будут свои 45 минут. Итоги публикуются организатором после общего завершения.';
  }
  let dialogueAttempt=null,dialogueSignature='',typed=false,locked=false,extraOpen=false,busyQuestion=null,confirmedCount=0,wasBlocked=false;
  const opened=new Set();
  function dialogueKey(attempt,q){return `nko_dialogue_v1_${attempt.id}_${q.id}`;}
  function say(text){const n=chapterNode?.querySelector('.story-action-line');if(n&&n.textContent!==text)n.textContent=text;}
  function extra(show){
    extraOpen=show;
    const exchange=chapterNode?.querySelector('.story-exchange'),toggle=chapterNode?.querySelector('.story-more');
    if(!exchange||!toggle)return;
    exchange.hidden=!show;toggle.setAttribute('aria-expanded',String(show));toggle.textContent=show?'Вернуться к истории':'Расскажи ещё';
    if(show&&dialogueAttempt){const key=dialogueKey(dialogueAttempt,dialogueAttempt.currentQuestion);opened.add(key);try{root.localStorage.setItem(key,'open');}catch{}}
    else if(dialogueAttempt){const key=dialogueKey(dialogueAttempt,dialogueAttempt.currentQuestion);opened.delete(key);try{root.localStorage.removeItem(key);}catch{}}
  }
  function chapter(attempt){
    doc.body.classList.remove('story-result-active');
    if(attempt?.story)doc.getElementById('story-introduction')?.setAttribute('hidden','');
    if(!attempt?.story||attempt.story.decorationsDisabled||!attempt.currentQuestion){chapterNode?.remove();chapterNode=null;dialogueAttempt=null;return;}
    if(!chapterNode){chapterNode=el('section','story-chapter');doc.getElementById('question-card').before(chapterNode);}
    const q=attempt.currentQuestion,number=attempt.story.currentChapter,[name]=chapters[number-1];
    const changed=chapterNode.dataset.question!==q.id||chapterNode.dataset.attempt!==attempt.id;
    const previous=dialogueAttempt;if(previous?.id!==attempt.id){confirmedCount=attempt.progress.answeredCount;busyQuestion=null;}dialogueAttempt=attempt;
    if(changed){
      const d=root.StoryDialogue.forQuestion(q);dialogueSignature=JSON.stringify(q.savedAnswer||null);typed=false;
      chapterNode.dataset.question=q.id;chapterNode.dataset.attempt=attempt.id;chapterNode.dataset.chapter=number;chapterNode.dataset.pose=d.pose;
      chapterNode.setAttribute('aria-label','Разговор с гостем');
      const stage=el('div','story-narrator-stage'),portrait=image(`/assets/olympiad/story/layout-v4/portraits/${d.pose}.webp`,'Ваш гость в ресторане','story-narrator-portrait');
      portrait.width=600;portrait.height=900;portrait.fetchPriority='high';portrait.addEventListener('error',()=>stage.classList.add('is-missing'));
      const copy=el('div','story-chapter-copy'),bubble=el('div','story-speech');
      bubble.append(el('span','story-speaker','Ваш гость'),el('p','story-guest-line',d.line));
      const frame=el('div','story-portrait-frame');frame.append(portrait);stage.append(frame,bubble);
      const more=button('Расскажи ещё',()=>extra(!extraOpen),'story-more');more.setAttribute('aria-expanded','false');more.setAttribute('aria-controls','story-extra-dialogue');
      const exchange=el('div','story-exchange');exchange.id='story-extra-dialogue';exchange.hidden=true;
      const student=el('div','story-student-speech');student.append(el('span','story-speaker','Вы'),el('p','',d.student));
      const response=el('div','story-extra-speech');response.append(el('span','story-speaker','Ваш гость'),el('p','',d.extra));exchange.append(student,response);
      const status=el('p','story-action-line');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
      copy.append(el('h2','',`Глава ${number} · ${name}`),more,exchange,status);
      chapterNode.replaceChildren(stage,copy);
      let wasOpen=opened.has(dialogueKey(attempt,q));try{wasOpen ||= root.localStorage.getItem(dialogueKey(attempt,q))==='open';}catch{}
      extra(wasOpen);
      if(previous?.id===attempt.id&&attempt.progress.answeredCount>previous.progress.answeredCount)say(number===4?'Заказ принят. Следующая записка уже перед вами.':'Записал. Откроем следующую страницу.');
      else if(attempt.progress.answeredCount)say('Продолжаем с сохранённой страницы.');
      const nextPose=['album','map','notes','orders','table'][Math.min(4,number)];
      if(nextPose!==d.pose){const preload=new root.Image();preload.src=`/assets/olympiad/story/layout-v4/portraits/${nextPose}.webp`;}
    }
    chapterNode.querySelector('.story-more').disabled=locked;
  }
  function draft(questionId,payload){
    if(!dialogueAttempt||chapterNode?.dataset.question!==questionId)return;
    const signature=JSON.stringify(payload);if(signature===dialogueSignature)return;dialogueSignature=signature;
    const q=dialogueAttempt.currentQuestion;
    if(q.tourCode==='T3'){if(payload?.text?.trim()&&!typed){typed=true;say('Вижу, запись начата. Подтвердите её, когда закончите.');}}
    else if(q.tourCode==='T2')say('Отметка на карте изменена. Сохраните блок, когда закончите.');
    else if(q.tourCode==='T5')say('Рабочая поверхность обновлена. Продолжайте свою сборку.');
    else say(q.tourCode==='T4'?'Ваш выбор отмечен в меню. Подтвердите заказ.':'Подпись выбрана. Подтвердите её для альбома.');
  }
  function action(questionId,text){if(chapterNode?.dataset.question===questionId)say(text);}
  function updateState(state){
    locked=Boolean(state.locked);const b=chapterNode?.querySelector('.story-more');if(b)b.disabled=locked;
    if(!chapterNode){wasBlocked=Boolean(state.blocked);return;}
    if(Number(state.confirmedCount)>confirmedCount){confirmedCount=state.confirmedCount;say('Записал. Можем продолжать наш вечер.');}
    else if(state.blocked)say('Вернитесь в защищённый режим — мы продолжим с этой страницы.');
    else if(wasBlocked)say('Режим восстановлен. Продолжим с этой страницы.');
    else if(state.busy){busyQuestion ||= chapterNode.dataset.question;if(busyQuestion===chapterNode.dataset.question)say('Передаём вашу запись. Ждём подтверждения сервера.');}
    if(!state.busy)busyQuestion=null;
    wasBlocked=Boolean(state.blocked);
  }
  function clearTimer(){root.clearTimeout(timer);timer=null;}
  function schedule(){clearTimer();if(!session||loaded||doc.hidden||session.status==='in_progress')return;const open=session.story.entryMode==='anytime'?session.story.entryOpen:Date.now()<Date.parse(session.story.entryEndsAt);timer=root.setTimeout(refresh,open?300000:60000);}
  async function refresh(){
    if(!session||loaded||inFlight||doc.hidden)return;inFlight=true;
    const id=session.id;
    try {
      const data=await request(`/api/public/attempts/${encodeURIComponent(id)}/story-result`);
      if(session?.id!==id)return;
      if(data.state==='published'){loaded=data;renderTable(data);onAvailable?.();clearTimer();}
      else {if(typeof data.entryOpen==='boolean')session.story.entryOpen=data.entryOpen;const message=resultMount?.querySelector('.story-poll-status');if(message)message.textContent='Ответы сохранены. Публикация итогов ещё ожидается.';}
    } catch(error){const message=resultMount?.querySelector('.story-poll-status');if(message)message.textContent='Не удалось обновить итоги. Сохранённая попытка остаётся на сервере; повторите обновление.';}
    finally{inFlight=false;schedule();}
  }
  function result(attempt,api,notify){
    chapterNode?.remove();chapterNode=null;dialogueAttempt=null;
    doc.body.classList.remove('story-service-visible');
    if(attempt?.story)doc.getElementById('story-introduction')?.setAttribute('hidden','');
    clearTimer();if(!attempt?.story){doc.body.classList.remove('story-result-active');resultMount?.remove();resultMount=null;session=null;loaded=null;return;}
    doc.body.classList.add('story-result-active');
    if(session?.id!==attempt.id){loaded=null;resultMount?.remove();resultMount=null;}
    session=attempt;request=api;onAvailable=notify;
    for(const id of ['result-overview','result-next','result-tours'])doc.getElementById(id)?.classList.add('hidden');
    if(!resultMount){resultMount=el('section','story-result');doc.getElementById('result-tours').after(resultMount);}
    const certificate=doc.getElementById('certificate-section');
    doc.getElementById('result-section').append(certificate);
    doc.getElementById('certificate-heading').textContent='Ваше свидетельство об участии';
    doc.getElementById('certificate-open').textContent='Открыть свидетельство';
    certificate.querySelector('p').textContent='Олимпиада завершена. В свидетельстве указаны ваши баллы из 150 и приказ № 199 / 05.10.2026. Документ можно сохранить как PDF.';
    if(loaded){renderTable(loaded);return;}
    doc.getElementById('result-title').textContent='Меню принято. Спасибо за этот вечер!';
    doc.getElementById('result-subtitle').textContent='Ответы сохранены. Свидетельство с набранными баллами уже доступно ниже. Правильные ответы не показываются. Персональный стол откроется после публикации общих итогов. Можно закрыть страницу и вернуться в этом браузере.';
    resultMount.replaceChildren();
    if(!attempt.story.decorationsDisabled)resultMount.append(root.RestaurantLayout.picture('waiting','story-waiting-scene restaurant-waiting','Гость закрывает альбом и ожидает общего финала'));
    resultMount.append(el('p','story-poll-status','Ожидаем общего финала.'),button('Обновить итоги',refresh));
    refresh();
  }
  function showPlate(p,source){
    const modal=el('dialog','story-dish-dialog');
    const close=button('Закрыть',()=>modal.close());
    if(p.imageUrl)modal.append(image(p.imageUrl,p.imageAlt||p.title,'story-detail-image'));
    modal.append(el('h2','',p.title),el('p','',p.recipeVersion));
    for(const a of p.actions)modal.append(el('p','',`${a.tour}, задание ${a.number}. Ваш ответ: ${a.savedAnswer}. Баллы: ${a.score} из ${a.maxScore}.`));
    modal.append(close);doc.body.append(modal);modal.addEventListener('close',()=>{modal.remove();source?.focus({preventScroll:true});},{once:true});modal.showModal();
  }
  function renderTable(data){
    if(!resultMount)return;resultMount._resizeObserver?.disconnect();resultMount.replaceChildren();
    doc.getElementById('result-title').textContent='Ваш дегустационный стол';
    doc.getElementById('result-subtitle').textContent='В меню — заработанные подачи. Нажмите на блюдо, чтобы посмотреть свой сохранённый ответ. Правильные ответы не показываются.';
    const notice=el('p','story-publish-notice','Общие итоги опубликованы. Ваш дегустационный стол готов; свидетельство доступно в конце страницы.');notice.setAttribute('role','status');resultMount.append(notice);
    const facts=el('div','story-result-facts');facts.append(el('strong','',`Блюд в меню: ${data.plates.length} из ${data.collectionMax}`),el('strong','',`Баллы: ${data.summary.totalFinalScore} из ${data.summary.totalMaxScore}`));resultMount.append(facts);
    if(!session.story.decorationsDisabled){
      const viewport=el('div','story-table');viewport.classList.toggle('is-compact',data.plates.length<=3);viewport.tabIndex=0;viewport.setAttribute('aria-label','Дегустационный стол. Стрелки влево и вправо перемещают подачи.');
      const track=el('div','story-table-track');viewport.append(track);
      const mobile=root.matchMedia('(max-width: 600px)'),pageSize=()=>mobile.matches?2:6;
      const guest=image(base+'table-guest.webp','Гость смотрит на еду перед собой','story-table-guest');track.append(guest);
      const items=el('div','story-table-items');track.append(items);
      for(const p of data.plates){let b; b=button('',()=>showPlate(p,b),'story-serving');b.setAttribute('aria-label',p.title);const photo=el('img','story-serving-image');photo.dataset.src=p.imageUrl||'';photo.alt=p.imageAlt||p.title;photo.decoding='async';photo.addEventListener('error',()=>{photo.hidden=true;});b.append(photo,el('span','',p.title));items.append(b);}
      if(!data.plates.length)items.append(el('p','story-empty','В этом меню пока нет заработанных подач. Набранные баллы указаны в вашем свидетельстве.'));
      let page=0;
      const previous=arrow(-1,()=>move(-1)),next=arrow(1,()=>move(1)),position=el('p','story-table-position');
      function layout(){const size=pageSize(),pages=Math.max(1,Math.ceil(data.plates.length/size));page=Math.min(page,pages-1);const width=viewport.clientWidth;guest.style.width=`${width}px`;
        const slots=Math.min(size,Math.max(data.plates.length,1));
        track.style.width=`${pages*100}%`;items.style.gridTemplateColumns=`repeat(${Math.max(data.plates.length,1)}, ${width/slots}px)`;
        for(let i=0;i<items.children.length;i++){const node=items.children[i];node.inert=i<page*size||i>=(page+1)*size;const photo=node.querySelector('img[data-src]');if(photo&&i>=page*size&&i<(page+1)*size&&photo.dataset.src){photo.src=photo.dataset.src;delete photo.dataset.src;}}
        track.style.transform=`translateX(${-page*width}px)`;previous.disabled=page===0;next.disabled=page===pages-1;position.textContent=data.plates.length?`Подачи ${page*size+1}–${Math.min((page+1)*size,data.plates.length)} из ${data.plates.length}`:'Пустое меню';
      }
      function move(direction){page=Math.max(0,Math.min(Math.max(0,Math.ceil(data.plates.length/pageSize())-1),page+direction));layout();}
      viewport.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}});
      let pointer=null;viewport.addEventListener('pointerdown',e=>{pointer=e.clientX;});viewport.addEventListener('pointerup',e=>{if(pointer!==null&&Math.abs(e.clientX-pointer)>45)move(e.clientX<pointer?1:-1);pointer=null;});
      const nav=el('div','story-table-nav');nav.append(previous,position,next);resultMount.append(viewport,nav);
      const observer=new ResizeObserver(layout);observer.observe(viewport);requestAnimationFrame(layout);
      resultMount._resizeObserver?.disconnect();resultMount._resizeObserver=observer;
    }
    const list=el('details','story-plate-list'),summary=el('summary','','Все подачи');list.append(summary);
    const filter=el('input','story-search');filter.type='search';filter.placeholder='Найти блюдо';filter.setAttribute('aria-label','Поиск среди заработанных подач');list.append(filter);
    const rows=el('ul','story-plate-rows');
    for(const p of data.plates){const row=el('li');const b=button(p.title,()=>showPlate(p,b),'story-plate-link');row.dataset.search=p.title.toLocaleLowerCase('ru');row.append(b,el('span','',p.actions.map(a=>a.tour).join(', ')));rows.append(row);}
    filter.addEventListener('input',()=>{for(const row of rows.children)row.hidden=!row.dataset.search.includes(filter.value.toLocaleLowerCase('ru'));});list.append(rows);resultMount.append(list);
    const kitchen=el('section','story-kitchen-review');kitchen.append(el('h2','','Что получилось на кухне'));
    if(!data.kitchen.length)kitchen.append(el('p','','Подтверждённых подач на кухне нет.'));
    for(const row of data.kitchen){const article=el('article','story-kitchen-row');article.append(el('h3','',row.receipt.dishTitle),el('p','',`Баллы: ${row.score} из ${row.maxScore}. ${row.fullyCorrect?'Блюдо добавлено в меню.':'Сохранён фактический состав вашей подачи.'}`),el('p','',row.receipt.composition.join(' · ')),button('Посмотреть подачу и реакцию',()=>{
      root.T5DishService?.sync({id:session.id+':review:'+Date.now(),status:'reviewed',dishService:row.receipt},()=>{});root.T5DishService?.setLocked(false);
    }));kitchen.append(article);}resultMount.append(kitchen);
    const certificate=doc.getElementById('certificate-section');
    doc.getElementById('result-section').append(certificate);
    doc.getElementById('certificate-heading').textContent='Ваше свидетельство об участии';
    doc.getElementById('certificate-open').textContent='Открыть свидетельство';
  }
  doc.addEventListener('visibilitychange',()=>{clearTimer();if(!doc.hidden&&session&&!loaded)refresh();});
  root.OlympiadStory={intro,chapter,result,draft,action,updateState,phase};
})(window);
