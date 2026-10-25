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
    const hero=doc.querySelector('.landing-hero-media');
    if(!hero.querySelector('.restaurant-pizza-cover')){
      hero.style.backgroundImage='none';
      const cover=image('/assets/olympiad/landing/hero-national-cuisines.webp','','restaurant-pizza-cover');
      cover.width=1584;cover.height=993;cover.fetchPriority='high';hero.replaceChildren(cover);
    }
    const note=doc.querySelector('.landing-pilot-note');
    if(note)note.textContent=olympiad.story?.admissionMode==='open'?'Организатор открыл вход вручную. Можно начинать. Каждому — минута на каждое задание. Между турами — пауза.':olympiad.story?.admissionMode==='closed'?'Организатор закрыл новые старты. Уже начатые попытки продолжаются.':olympiad.story?.entryMode==='anytime'
      ? (olympiad.story.entryOpen?`Начните в любое время. На каждое задание — одна минута, между турами — пауза. Всего ${root.formatLimitMinutes(olympiad.durationMinutes)}.`:olympiad.story.publishedAt?'Итоги опубликованы. Новые попытки этого проведения закрыты.':'Организатор остановил новые старты. Начатые попытки продолжаются.')
      : olympiad.story?`Вход ${olympiad.story.date}: с ${new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}).format(new Date(olympiad.story.entryStartsAt))} до ${new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}).format(new Date(olympiad.story.entryEndsAt))}${Date.parse(olympiad.story.entryEndsAt)-Date.parse(olympiad.story.entryStartsAt)===86400000?' следующего дня':''} по Москве. Каждому — ${root.formatLimitMinutes(olympiad.durationMinutes)}.`:'Дата проведения будет объявлена организатором.';
    if(note&&olympiad.story?.entryMode==='scheduled'&&(!olympiad.story.admissionMode||olympiad.story.admissionMode==='auto')){
      const formatter=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',dateStyle:'medium',timeStyle:'short'});
      note.textContent=`Вход: ${formatter.format(new Date(olympiad.story.entryStartsAt))} — ${formatter.format(new Date(olympiad.story.entryEndsAt))} по Москве. Каждому — ${root.formatLimitMinutes(olympiad.durationMinutes)}.`;
    }
    let section=doc.getElementById('story-introduction');
    if(!section){
    section=el('section','story-introduction');section.id='story-introduction';
    section.append(el('p','story-invitation','Гость приглашает вас за стол'),el('blockquote','story-welcome-line','«Я привёз альбом из путешествий. Поможете собрать меню для моих друзей? В конце вечера нас ждёт целый стол историй».'));
    const route=el('ol','story-chapters');chapters.forEach(([name],i)=>route.append(el('li','',`${i+1}. ${name}`)));
    section.append(route);
    const guide=el('div','story-tour-guide');guide.append(el('h3','','Как проходить пять глав'));
    for(const text of [
      'Фотоальбом: узнайте десять блюд по фотографиям. Выберите один ответ и подтвердите его. За верный ответ — 2 балла; 10 минут, максимум 20.',
      'Карта: пять блоков по четыре блюда. Нажмите блюдо, затем страну, или перетащите карточку. Одна страна соответствует одному блюду. До подтверждения выбор можно изменить. За каждую верную пару — 1 балл; 5 минут, максимум 20.',
      'Записная книжка: восстановите десять названий по трём подсказкам. Введите название; регистр букв не важен. За верное название — 3 балла; 10 минут, максимум 30.',
      'Пожелания компании: восемь заказов. Прочитайте все условия и выберите одну из четырёх готовых подач. За подходящую подачу — 4 балла; 8 минут, максимум 32.',
      'Финальная кухня: три блюда. Выберите ровно четыре компонента для указанной версии рецепта, выполните показанные действия и нажмите «Подать». Каждый верный компонент — 4 балла, максимум 16 за блюдо; 3 минуты, максимум 48.',
      'Соевый соус, имбирь и васаби сопровождают подачу роллов. Их выбирать не нужно; они не влияют на баллы.',
      'Перед каждым туром прочитайте пояснение и нажмите «Начать тур». До нажатия таймеры на паузе. На каждое задание, блок сопоставления или блюдо — 1 минута. Выбор автоматически сохраняется на сервере; по истечении минуты сохранённый выбор учитывается даже без кнопки «Далее». Неизменённый пустой ответ даёт 0 баллов. После перехода вернуться к заданию нельзя; время не переносится. Внутри тура таймер идёт и при уходе со страницы. Для уже начатых попыток действуют их исходные лимиты.',
      'Сюжет не добавляет баллов. Сразу после личного завершения появляются общий стол истории и свидетельство с набранными баллами из 150. Правильные ответы не показываются. Ваше заработанное меню, реакции гостя и общие итоги открываются после публикации организатором.'
    ])guide.append(el('p','',text));doc.getElementById('rules-details').append(guide);
    }
    const entry=doc.getElementById('prestart-section'),copy=doc.querySelector('.landing-hero-copy');
    if(section.parentNode!==copy)copy.append(section);
    if(entry.parentNode!==doc.getElementById('hero-section').parentNode)doc.getElementById('hero-section').after(entry);
    const rule=doc.querySelector('#prestart-section .landing-pilot-note');if(rule)rule.hidden=true;
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
    const q=attempt.currentQuestion,number=attempt.story.currentChapter;
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
      copy.append(more,exchange,status);
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
    doc.getElementById('result-award')?.classList.add('hidden');
    if(session?.id!==attempt.id){loaded=null;resultMount?.remove();resultMount=null;}
    session=attempt;request=api;onAvailable=notify;
    for(const id of ['result-overview','result-next','result-tours'])doc.getElementById(id)?.classList.add('hidden');
    if(!resultMount){resultMount=el('section','story-result');doc.getElementById('result-tours').after(resultMount);}
    const certificate=doc.getElementById('certificate-section');
    doc.getElementById('result-section').append(certificate);
    doc.getElementById('certificate-heading').textContent=attempt.demonstration?'Демонстрационный образец сертификата':'Ваше свидетельство об участии';
    doc.getElementById('certificate-open').textContent=attempt.demonstration?'Открыть образец':'Открыть свидетельство';
    certificate.querySelector('p').textContent=attempt.demonstration?'Пробное прохождение завершено. Образец с демонстрационными баллами можно сохранить как PDF; он не подтверждает участие в официальной олимпиаде.':'Олимпиада завершена. В свидетельстве указаны ваши баллы из 150 и приказ № 199 / 05.10.2026. Документ можно сохранить как PDF.';
    if(loaded){if(resultMount._publishedData!==loaded||resultMount._decorationsDisabled!==Boolean(session.story.decorationsDisabled))renderTable(loaded);return;}
    doc.getElementById('result-title').textContent='Меню принято. Спасибо за этот вечер!';
    doc.getElementById('result-subtitle').textContent='Ответы сохранены. Ужин на общем столе — финальная сцена нашей истории. Свидетельство с баллами доступно в конце страницы. Ваше заработанное меню и реакции гостя откроются после публикации итогов.';
    root.T5DishService?.hideInline();
    if(resultMount._waitingAttemptId!==attempt.id||resultMount._decorationsDisabled!==Boolean(attempt.story.decorationsDisabled)){
      resultMount.replaceChildren();resultMount._waitingAttemptId=attempt.id;resultMount._decorationsDisabled=Boolean(attempt.story.decorationsDisabled);
      if(!attempt.story.decorationsDisabled&&root.StoryBanquet)resultMount.append(root.StoryBanquet.render(null));
      resultMount.append(el('p','story-poll-status','Заработанное меню откроется после публикации общих итогов.'),button('Обновить итоги',refresh));
    }
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
    resultMount._publishedData=data;resultMount._decorationsDisabled=Boolean(session.story.decorationsDisabled);
    resultMount._waitingAttemptId=null;
    root.T5DishService?.hideInline();
    doc.getElementById('result-title').textContent='Вечер вкусов завершён';
    doc.getElementById('result-subtitle').textContent='В меню — заработанные подачи. Нажмите на блюдо, чтобы посмотреть свой сохранённый ответ. Правильные ответы не показываются.';
    const notice=el('p','story-publish-notice',data.demonstration?'Ваш демонстрационный результат. В официальный зачёт не включается.':'Общие итоги опубликованы.');notice.setAttribute('role','status');resultMount.append(notice);
    const facts=el('div','story-result-facts');facts.append(el('strong','',`Блюд в меню: ${data.plates.length} из ${data.collectionMax}`),el('strong','',`Баллы: ${data.summary.totalFinalScore} из ${data.summary.totalMaxScore}`));resultMount.append(facts);
    if(!session.story.decorationsDisabled&&root.StoryBanquet)resultMount.append(root.StoryBanquet.render(data,showPlate));
    const list=el('details','story-plate-list'),summary=el('summary','','Ваше заработанное меню');list.open=true;list.append(summary);
    const filter=el('input','story-search');filter.type='search';filter.placeholder='Найти блюдо';filter.setAttribute('aria-label','Поиск среди заработанных подач');list.append(filter);
    const rows=el('ul','story-plate-rows');
    for(const p of data.plates){const row=el('li');const b=button(p.title,()=>showPlate(p,b),'story-plate-link');row.dataset.search=p.title.toLocaleLowerCase('ru');row.append(b,el('span','',p.actions.map(a=>a.tour).join(', ')));rows.append(row);}
    filter.addEventListener('input',()=>{for(const row of rows.children)row.hidden=!row.dataset.search.includes(filter.value.toLocaleLowerCase('ru'));});list.append(rows);if(!data.plates.length)list.append(el('p','','В этом прохождении заработанных подач нет. Ваши баллы сохранены.'));resultMount.append(list);
    const kitchen=el('details','story-kitchen-review story-answer-review');kitchen.append(el('summary','','Что получилось на кухне'));
    if(!data.kitchen.length)kitchen.append(el('p','','Подтверждённых подач на кухне нет.'));
    for(const row of data.kitchen){const article=el('article','story-kitchen-row');article.append(el('h3','',row.receipt.dishTitle),el('p','',`Баллы: ${row.score} из ${row.maxScore}. ${row.fullyCorrect?'Блюдо добавлено в меню.':'Сохранён фактический состав вашей подачи.'}`),el('p','',row.receipt.composition.join(' · ')),button('Посмотреть подачу и реакцию',()=>{
      root.T5DishService?.sync({id:session.id+':review:'+Date.now(),status:'reviewed',dishService:row.receipt},()=>{});root.T5DishService?.setLocked(false);
    }));kitchen.append(article);}resultMount.append(kitchen);
    const certificate=doc.getElementById('certificate-section');
    doc.getElementById('result-section').append(certificate);
    doc.getElementById('certificate-heading').textContent=session?.demonstration?'Демонстрационный образец сертификата':'Ваше свидетельство об участии';
    doc.getElementById('certificate-open').textContent=session?.demonstration?'Открыть образец':'Открыть свидетельство';
  }
  doc.addEventListener('visibilitychange',()=>{clearTimer();if(!doc.hidden&&session&&!loaded)refresh();});
  root.OlympiadStory={intro,chapter,result,draft,action,updateState,phase};
})(window);
