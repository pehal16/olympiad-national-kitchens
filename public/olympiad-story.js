(function(root){
  'use strict';
  const doc=root.document,base='/assets/olympiad/story/v1/scenes/';
  const chapters=[
    ['Фотоальбом','album','В моём альбоме достопримечательностей почти нет. Зато ужины сняты со всех сторон. Помогите подписать фотографии.'],
    ['Карта путешествий','map','Фотографии записаны. Теперь восстановим маршрут: соедините блюда с кухнями мира.'],
    ['Записная книжка','notes','Карта стала закладкой. В заметках сохранились три подсказки к каждому блюду — восстановите названия.'],
    ['Пожелания компании','orders','Компания уже собирается за столом. Для каждого пожелания выберите одну подходящую подачу из четырёх.'],
    ['Финальная кухня','neutral','Пора на кухню: выберите четыре компонента, выполните сборку и нажмите «Подать». Гость принимает блюда; разбор появится после общего финала.']
  ];
  let session=null,timer=null,request=null,onAvailable=null,resultMount=null,loaded=null,inFlight=false,chapterNode=null;
  function el(tag,cls,text){const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function button(text,fn,cls='button secondary'){const n=el('button',cls,text);n.type='button';n.addEventListener('click',fn);return n;}
  function image(path,alt,cls){const n=el('img',cls);n.src=path;n.alt=alt;n.decoding='async';n.addEventListener('error',()=>{n.hidden=true;});return n;}
  function arrow(direction,fn){const n=button('',fn,'story-arrow');n.setAttribute('aria-label',direction<0?'Предыдущие подачи':'Следующие подачи');n.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction<0?'M15 5 8 12l7 7':'m9 5 7 7-7 7'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;return n;}
  function intro(olympiad){
    if(!olympiad.storyEnabled)return;
    doc.body.classList.add('has-restaurant-story');
    const title=doc.getElementById('hero-title'),sub=doc.getElementById('hero-subtitle');
    title.textContent='Ресторан путешествий. Вечер вкусов';
    sub.textContent='Гость принёс гастрономический альбом. Помогите собрать дегустационное меню для его компании — через пять глав олимпиады «Национальные кухни мира».';
    doc.querySelector('.landing-hero-media').style.backgroundImage=`url("${base}arrival.webp")`;
    const note=doc.querySelector('.landing-pilot-note');
    if(note)note.textContent=olympiad.story?`Вход ${olympiad.story.date}: с 00:00 до 00:00 следующего дня по Москве. Каждому — полные 45 минут.`:'Дата проведения будет объявлена организатором.';
    const existing=doc.getElementById('story-introduction');if(existing)existing.remove();
    const section=el('section','story-introduction');section.id='story-introduction';
    section.append(el('h2','','Один вечер. Пять глав.'),el('p','','«В моём альбоме достопримечательностей почти нет. Зато ужины сняты со всех сторон».'));
    const route=el('ol','story-chapters');chapters.forEach(([name],i)=>route.append(el('li','',`${i+1}. ${name}`)));
    section.append(route,el('p','','Фотографии → карта → заметки → заказы → кухня. Ответ считается записанным после подтверждения сервера. Сюжет и настроение гостя дополнительных баллов не дают.'),el('p','','До начала ознакомьтесь с правилами. Во время прохождения правильность и баллы скрыты. После закрытия входа и завершения всех попыток организатор откроет персональный стол, разбор и свидетельство.'));
    const guide=el('details','story-answer-review');guide.append(el('summary','','Как проходить пять глав'));
    for(const text of [
      'Фотоальбом: узнайте десять блюд по фотографиям. Выберите один ответ и подтвердите его. За верный ответ — 2 балла; 6 минут, максимум 20.',
      'Карта: пять блоков по четыре блюда. Нажмите блюдо, затем страну, или перетащите карточку. Одна страна соответствует одному блюду. До подтверждения выбор можно изменить. За каждую верную пару — 1 балл; 6 минут, максимум 20.',
      'Записная книжка: восстановите десять названий по трём подсказкам. Введите название; регистр букв не важен. За верное название — 3 балла; 8 минут, максимум 30.',
      'Пожелания компании: восемь заказов. Прочитайте все условия и выберите одну из четырёх готовых подач. За подходящую подачу — 4 балла; 10 минут, максимум 32.',
      'Финальная кухня: три блюда. Выберите ровно четыре компонента для указанной версии рецепта, выполните показанные действия и нажмите «Подать». Каждый верный компонент — 4 балла, максимум 16 за блюдо; 15 минут, максимум 48.',
      'Соевый соус, имбирь и васаби сопровождают подачу роллов. Их выбирать не нужно; они не влияют на баллы.',
      'После подтверждения вернуться к заданию нельзя. Ошибки не дают штрафных баллов. По истечении лимита тура открывается следующий; при общем лимите 45 минут попытка завершается. Неподтверждённый выбор не считается ответом.'
    ])guide.append(el('p','',text));section.append(guide);
    doc.getElementById('prestart-section').before(section);
    const rule=doc.querySelector('#prestart-section .landing-pilot-note');if(rule)rule.textContent='Время начинается только после явного старта. Даже при старте перед полуночью у вас будут свои 45 минут. Итоги публикуются организатором после общего завершения.';
  }
  function chapter(attempt){
    if(attempt?.story)doc.getElementById('story-introduction')?.setAttribute('hidden','');
    if(!attempt?.story||attempt.story.decorationsDisabled){chapterNode?.remove();chapterNode=null;return;}
    if(!chapterNode){chapterNode=el('section','story-chapter');doc.getElementById('question-card').before(chapterNode);}
    const number=attempt.story.currentChapter,[name,scene,text]=chapters[number-1];
    if(chapterNode.dataset.chapter!==String(number)){
      chapterNode.replaceChildren(image(base+scene+'.webp','Гость и предметы этой главы','story-chapter-scene'));
      const copy=el('div','story-chapter-copy');copy.append(el('h2','',`${number}. ${name}`),el('p','',text),el('p','story-recorded'));
      chapterNode.append(copy);chapterNode.dataset.chapter=number;
    }
    chapterNode.querySelector('.story-recorded').textContent=`Записано ответов: ${attempt.progress.answeredCount} из ${attempt.progress.totalQuestions}. Правильность пока не раскрывается.`;
  }
  function clearTimer(){root.clearTimeout(timer);timer=null;}
  function schedule(){clearTimer();if(!session||loaded||doc.hidden||session.status==='in_progress')return;timer=root.setTimeout(refresh,Date.now()<Date.parse(session.story.entryEndsAt)?300000:60000);}
  async function refresh(){
    if(!session||loaded||inFlight||doc.hidden)return;inFlight=true;
    const id=session.id;
    try {
      const data=await request(`/api/public/attempts/${encodeURIComponent(id)}/story-result`);
      if(session?.id!==id)return;
      if(data.state==='published'){loaded=data;renderTable(data);onAvailable?.();clearTimer();}
      else {const message=resultMount?.querySelector('.story-poll-status');if(message)message.textContent='Ответы сохранены. Публикация итогов ещё ожидается.';}
    } catch(error){const message=resultMount?.querySelector('.story-poll-status');if(message)message.textContent='Не удалось обновить итоги. Сохранённая попытка остаётся на сервере; повторите обновление.';}
    finally{inFlight=false;schedule();}
  }
  function result(attempt,api,notify){
    if(attempt?.story)doc.getElementById('story-introduction')?.setAttribute('hidden','');
    clearTimer();if(!attempt?.story){resultMount?.remove();resultMount=null;session=null;loaded=null;return;}
    if(session?.id!==attempt.id){loaded=null;resultMount?.remove();resultMount=null;}
    session=attempt;request=api;onAvailable=notify;
    for(const id of ['result-overview','result-next','result-tours'])doc.getElementById(id)?.classList.add('hidden');
    if(!resultMount){resultMount=el('section','story-result');doc.getElementById('result-tours').after(resultMount);}
    if(loaded){renderTable(loaded);return;}
    doc.getElementById('result-title').textContent='Меню принято. Спасибо за этот вечер!';
    doc.getElementById('result-subtitle').textContent='Ответы сохранены. Персональный стол, баллы, разбор и свидетельство откроются после публикации итогов организатором. Можно закрыть страницу и вернуться в этом браузере.';
    resultMount.replaceChildren();
    if(!attempt.story.decorationsDisabled)resultMount.append(image(base+'waiting.webp','Гость закрывает альбом и ожидает общего финала','story-waiting-scene'));
    resultMount.append(el('p','story-poll-status','Ожидаем общего финала.'),button('Обновить итоги',refresh));
    refresh();
  }
  function showPlate(p,source){
    const modal=el('dialog','story-dish-dialog');
    const close=button('Закрыть',()=>modal.close());
    if(p.imageUrl)modal.append(image(p.imageUrl,p.imageAlt||p.title,'story-detail-image'));
    modal.append(el('h2','',p.title),el('p','',p.recipeVersion),el('p','',p.explanation));
    for(const a of p.actions)modal.append(el('p','',`${a.tour}, задание ${a.number}. Ваш ответ: ${a.savedAnswer}. Баллы: ${a.score} из ${a.maxScore}.`));
    modal.append(close);doc.body.append(modal);modal.addEventListener('close',()=>{modal.remove();source?.focus({preventScroll:true});},{once:true});modal.showModal();
  }
  function renderTable(data){
    if(!resultMount)return;resultMount._resizeObserver?.disconnect();resultMount.replaceChildren();
    doc.getElementById('result-title').textContent='Ваш дегустационный стол';
    doc.getElementById('result-subtitle').textContent='В меню — полностью правильные блюда. Нажмите на подачу, чтобы посмотреть ваш ответ и объяснение.';
    const facts=el('div','story-result-facts');facts.append(el('strong','',`Блюд в меню: ${data.plates.length} из ${data.collectionMax}`),el('strong','',`Баллы: ${data.summary.totalFinalScore} из ${data.summary.totalMaxScore}`));resultMount.append(facts);
    if(!session.story.decorationsDisabled){
      const viewport=el('div','story-table');viewport.classList.toggle('is-compact',data.plates.length<=3);viewport.tabIndex=0;viewport.setAttribute('aria-label','Дегустационный стол. Стрелки влево и вправо перемещают подачи.');
      const track=el('div','story-table-track');viewport.append(track);
      const mobile=root.matchMedia('(max-width: 600px)'),pageSize=()=>mobile.matches?2:6;
      const guest=image(base+'table-guest.webp','Гость смотрит на еду перед собой','story-table-guest');track.append(guest);
      const items=el('div','story-table-items');track.append(items);
      for(const p of data.plates){let b; b=button('',()=>showPlate(p,b),'story-serving');b.setAttribute('aria-label',p.title);const photo=el('img','story-serving-image');photo.dataset.src=p.imageUrl||'';photo.alt=p.imageAlt||p.title;photo.decoding='async';photo.addEventListener('error',()=>{photo.hidden=true;});b.append(photo,el('span','',p.title));items.append(b);}
      if(!data.plates.length)items.append(el('p','story-empty','В этом меню пока нет полностью правильных блюд. Все сохранённые ответы и баллы доступны в разборе ниже.'));
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
    for(const row of data.kitchen){const article=el('article','story-kitchen-row');article.append(el('h3','',row.receipt.dishTitle),el('p','',`Баллы: ${row.score} из ${row.maxScore}. ${row.fullyCorrect?'Блюдо добавлено в меню.':'Эта подача сохранена для разбора.'}`),el('p','',row.receipt.composition.join(' · ')),button('Посмотреть подачу и реакцию',()=>{
      root.T5DishService?.sync({id:session.id+':review:'+Date.now(),status:'reviewed',dishService:row.receipt},()=>{});root.T5DishService?.setLocked(false);
    }));kitchen.append(article);}resultMount.append(kitchen);
    const review=el('details','story-answer-review');review.append(el('summary','','Разбор всех ответов'));
    for(const row of data.review){const article=el('article','story-review-row');article.append(el('h3','',`${row.tour} · задание ${row.number}`),el('p','',`Ваш ответ: ${row.savedAnswer}`),el('p','',`Верный ответ: ${row.expectedAnswer}`),el('p','',`${row.score} из ${row.maxScore}. ${row.explanation}`));review.append(article);}resultMount.append(review);
  }
  doc.addEventListener('visibilitychange',()=>{clearTimer();if(!doc.hidden&&session&&!loaded)refresh();});
  root.OlympiadStory={intro,chapter,result};
})(window);
