'use strict';
const $=id=>document.getElementById(id),state={runs:[],people:[],results:[],runId:'',resultRunId:'',busy:false,refreshing:false,editing:null,editingAttemptId:null,detailRequest:0,preview:null,view:'admission'};
const statusLabels={not_started:'Не начал',in_progress:'Проходит',completed:'Завершил',reviewed:'Завершил',finished:'Завершил',expired:'Время истекло'};
const formatDate=value=>value?new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;};
const btn=(text,fn,cls='button secondary')=>{const n=el('button',text,cls);n.type='button';n.addEventListener('click',fn);return n;};
function message(id,text,error=false){const n=$(id);n.textContent=text;n.className=text?'message '+(error?'error':'success'):'message hidden';}
async function api(route,options={}){
 let r;try{r=await fetch(route,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers},...(options.body===undefined?{}:{body:JSON.stringify(options.body)})});}catch{throw Error('Нет связи с сервером. Изменение не подтверждено. Повторите после подключения.');}
 let j;try{j=await r.json();}catch{throw Error('Сервер вернул неполный ответ. Обновите панель.');}
 if(!r.ok||j.ok===false){const error=Error(j.message||`Ошибка сервера: ${r.status}`);error.status=r.status;throw error;}return j.data;
}
function localValue(value){return new Date(Date.parse(value)+10800000).toISOString().slice(0,16);}
function isoValue(value){const d=new Date(value+':00+03:00');if(!Number.isFinite(d.getTime()))throw Error('Укажите дату и время.');return d.toISOString();}
function view(name){state.view=name;document.querySelectorAll('[data-panel]').forEach(n=>n.hidden=n.dataset.panel!==name);document.querySelectorAll('[data-view]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.view===name)));}
function option(select,value,text){const n=el('option',text);n.value=value;select.append(n);}
function fill(select,items,placeholder,empty=false){const old=select.value;select.replaceChildren();option(select,'',placeholder);if(empty)option(select,'__empty','Не указан');for(const value of [...new Set(items.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru')))option(select,value,value);if([...select.options].some(o=>o.value===old))select.value=old;}
function runLabel(run){return run.entryMode==='anytime'?'Пробный свободный вход':formatDate(run.entryStartsAt)+(run.isCurrent?' · основное':'');}
async function mutate(route,body,method='PATCH',messageId='admin-message'){
 if(state.busy)return;state.busy=true;
 try{await api(route,{method,body});message(messageId,'Сохранено. Изменение подтверждено сервером.');await refresh();}
 catch(e){message(messageId,e.message,true);}finally{state.busy=false;renderRuns(true);}
}
function renderRuns(force=false){
 if(!force&&(document.activeElement?.closest('#schedule-form')||state.busy))return;
 const run=state.runs.find(r=>r.isCurrent),mount=$('story-run-current');mount.replaceChildren();$('story-run-list').replaceChildren();
 if(!run){mount.append(el('p','Проведение ещё не создано. Создайте его ниже.'));return;}
 const row=el('article',undefined,'admin-current-run');row.dataset.runId=run.id;
 const head=el('div',undefined,'admin-section-head');head.append(el('h3',runLabel(run)),el('span',run.publishedAt?'Итоги опубликованы':run.entryOpen?'Вход открыт':'Вход закрыт','admin-badge '+(run.entryOpen?'is-open':'')));row.append(head);
 const toggle=btn(run.entryOpen?'Включено':'Выключено',()=>mutate(`/api/admin/story-runs/${run.id}`,{admissionMode:run.entryOpen?'closed':'open'},'PATCH','story-run-message'),'button admission-switch');toggle.setAttribute('role','switch');toggle.setAttribute('aria-label','Олимпиада');toggle.setAttribute('aria-checked',String(run.entryOpen));toggle.disabled=Boolean(run.publishedAt);
 const track=el('span',undefined,'admission-switch-track');track.setAttribute('aria-hidden','true');toggle.prepend(track);
 const auto=btn('Вернуть расписание',()=>mutate(`/api/admin/story-runs/${run.id}`,{admissionMode:'auto'},'PATCH','story-run-message'));auto.disabled=Boolean(run.publishedAt)||(!run.stopped&&run.admissionMode==='auto');
 const controls=el('div',undefined,'admin-toolbar');controls.append(toggle,auto);row.append(controls);
 row.append(el('p',run.publishedAt?'Это проведение завершено. Для нового старта создайте отдельное проведение.':run.admissionMode==='open'?'Включено вручную для всех до вашего выключения.':run.admissionMode==='closed'||run.stopped?'Выключено вручную до вашего включения. Начатые попытки продолжаются.':'Режим: по расписанию. Вход откроется и закроется автоматически.','admin-mode-note'));
 const metrics=el('div',undefined,'admin-counts');for(const [label,value]of [['Начали',run.started],['Проходят',run.active],['Завершили',run.completed]]){const card=el('div');card.append(el('strong',value),el('span',label));metrics.append(card);}row.append(metrics);
 const form=el('form');form.id='schedule-form';form.className='admin-schedule';form.append(el('h3','Дата и время входа'),el('p','Время московское. Сохранение включает режим по расписанию. Уже начатые попытки сохраняют своё личное время.','muted'));
 const fields=el('div',undefined,'admin-form-grid');for(const [name,label,value]of [['entryStartsAt','Открытие',run.entryStartsAt],['entryEndsAt','Закрытие',run.entryEndsAt]]){const l=el('label',label,'field'),input=el('input');input.type='datetime-local';input.name=name;input.required=true;input.disabled=Boolean(run.publishedAt);input.value=value?localValue(value):'';l.append(input);fields.append(l);}
 const save=el('button','Сохранить расписание','button primary');save.type='submit';save.disabled=Boolean(run.publishedAt);fields.append(save);form.append(fields);form.addEventListener('submit',async e=>{e.preventDefault();try{const d=new FormData(form);save.disabled=true;await mutate(`/api/admin/story-runs/${run.id}/schedule`,{entryStartsAt:isoValue(d.get('entryStartsAt')),entryEndsAt:isoValue(d.get('entryEndsAt'))},'PATCH','story-run-message');}catch(error){message('story-run-message',error.message,true);}finally{save.disabled=Boolean(run.publishedAt);}});row.append(form);
 const details=el('details',undefined,'admin-run-publication');details.append(el('summary','Оформление и публикация общих итогов'));
 const decor=btn(run.decorationsDisabled?'Включить оформление':'Отключить оформление',()=>mutate(`/api/admin/story-runs/${run.id}`,{decorationsDisabled:!run.decorationsDisabled},'PATCH','story-run-message'));
 const publish=btn(run.publishedAt?'Итоги опубликованы':'Опубликовать общие итоги',()=>mutate(`/api/admin/story-runs/${run.id}/publish`,{},'POST','story-run-message'),'button primary');publish.disabled=!run.canPublish;
 details.append(el('p','Окончание олимпиады не публикует общие результаты автоматически. Они откроются только после вашего нажатия «Опубликовать общие итоги». Личные свидетельства доступны участникам после финиша.','muted'),decor,publish);
 if(run.publicationBlockers?.length)details.append(el('p',run.publicationBlockers.join(' '),'muted'));row.append(details);mount.append(row);
 for(const r of state.runs.filter(r=>!r.isCurrent)){const line=el('div',undefined,'admin-archive-run');line.append(el('strong',runLabel(r)),el('span',r.publishedAt?'Итоги опубликованы':`${r.started} начали · ${r.completed} завершили`));if(!r.publishedAt)line.append(btn('Сделать основным',()=>mutate('/api/admin/story-runs/current',{runId:r.id})));$('story-run-list').append(line);}
}
function populateRuns(){const current=state.runs.find(r=>r.isCurrent)?.id||'legacy';for(const [id,key]of [['people-run','runId'],['results-run','resultRunId']]){if(!state[key])state[key]=current;const select=$(id);select.replaceChildren();for(const run of state.runs)option(select,run.id,runLabel(run));option(select,'legacy','Ранние попытки без проведения');select.value=state[key];}}
function attemptHistory(person){
 if(Array.isArray(person.attempts))return person.attempts;
 return person.attemptId?[{id:person.attemptId,number:person.attemptNumber||1,status:person.status,attemptStatus:person.attemptStatus,startedAt:person.startedAt,finishedAt:person.finishedAt,totalFinalScore:person.totalFinalScore,isLatest:true}]:[];
}
const formatAttemptDate=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',dateStyle:'short',timeStyle:'medium'}).format(new Date(value)):'—';
function attemptCount(person){return Number(person.attemptCount??attemptHistory(person).length);}
function matchesAttemptCount(person,filter){const count=attemptCount(person);return filter==='repeated'?count>1:filter==='single'?count===1:filter==='none'?count===0:true;}
function orderRows(rows,order){
 const tie=(a,b)=>a.participant.fullName.localeCompare(b.participant.fullName,'ru')||String(a.attemptId||a.id).localeCompare(String(b.attemptId||b.id));
 return [...rows].sort((a,b)=>{
  if(order==='name')return tie(a,b);
  if(order==='score'){const left=a.totalFinalScore,right=b.totalFinalScore;return (left==null)!==(right==null)?(left==null?1:-1):(Number(right||0)-Number(left||0))||tie(a,b);}
  const field=order.startsWith('registered_')?'registeredAt':order.startsWith('first_')?'firstStartedAt':'startedAt',left=Date.parse(a[field]),right=Date.parse(b[field]),hasLeft=Number.isFinite(left),hasRight=Number.isFinite(right);
  if(hasLeft!==hasRight)return hasLeft?-1:1;
  return (hasLeft?(order.endsWith('_desc')?right-left:left-right):0)||tie(a,b);
 });
}
function peopleFiltered(){
 const search=$('filter-search').value.trim().toLocaleLowerCase('ru');
 const people=state.people.filter(p=>{const a=p.participant,mentor=$('filter-mentor').value;return (!search||Object.values(a).join(' ').toLocaleLowerCase('ru').includes(search))&&(!$('filter-status').value||p.status===$('filter-status').value)&&(!$('filter-group').value||a.groupName===$('filter-group').value)&&(!$('filter-institution').value||a.institution===$('filter-institution').value)&&(!mentor||(mentor==='__empty'?!a.mentorName:a.mentorName===mentor))&&matchesAttemptCount(p,$('filter-attempts').value);});
 return orderRows(people,$('people-order').value);
}
function renderPeople(){
 fill($('filter-institution'),state.people.map(p=>p.participant.institution),'Все учреждения');fill($('filter-group'),state.people.map(p=>p.participant.groupName),'Все группы');fill($('filter-mentor'),state.people.map(p=>p.participant.mentorName),'Все наставники',true);
 const counts=$('people-counts');counts.replaceChildren();for(const [key,label]of [['','В списке'],['not_started','Не начали'],['in_progress','Проходят'],['completed','Завершили']]){const button=btn('',()=>{$('filter-status').value=key;renderPeople();},'admin-count-card');button.setAttribute('aria-pressed',String($('filter-status').value===key));button.append(el('strong',state.people.filter(p=>!key||p.status===key).length),el('span',label));counts.append(button);}
 const people=peopleFiltered();$('attempts-filter-meta').textContent='Показано '+people.length+' из '+state.people.length+' участников · статус последней попытки';renderList($('people-list'),people);
}
function renderList(mount,people){
 mount.replaceChildren();if(!people.length){mount.append(el('p','По выбранным условиям участников нет.','admin-empty'));return;}
 for(const person of people){
  const p=person.participant,count=attemptCount(person),row=el('article',undefined,'admin-person');row.dataset.personId=person.id;row.dataset.attemptId=person.attemptId||'';
  const who=el('div');who.append(el('strong',p.fullName),el('p',p.institution+' · '+p.groupName,'muted'),el('p',p.mentorName?'Наставник: '+p.mentorName:'Наставник не указан','admin-person-mentor'));
  who.append(el('span',person.isAttemptRow?'Попытка '+person.attemptNumber+' из '+count:'Прохождений: '+count,'admin-attempt-count'));
  if(person.registeredAt)who.append(el('small','Регистрация: '+formatAttemptDate(person.registeredAt)));else if(person.status==='not_started')who.append(el('small','Добавлен в ожидаемый список'));
  const status=el('div');status.append(el('span',statusLabels[person.status]||person.status,'admin-badge status-'+person.status));
  if(person.startedAt)status.append(el('small',(person.isAttemptRow||count<=1?'Начало: ':'Последний старт: ')+formatAttemptDate(person.startedAt)));
  if(!person.isAttemptRow&&count>1)status.append(el('small','Первый старт: '+formatAttemptDate(person.firstStartedAt)));
  if(person.isAttemptRow&&person.isLatest)status.append(el('small','Последняя попытка'));
  if(person.totalFinalScore!==null&&person.totalFinalScore!==undefined)status.append(el('strong',person.totalFinalScore+' / 150'));
  row.append(who,status,btn(person.isAttemptRow?'Открыть попытку':'Карточка / наставник',()=>openPerson(person)));mount.append(row);
 }
}
function renderResults(){
 const query=$('results-search').value.trim().toLowerCase(),filter=$('results-status').value,all=$('results-scope').value==='all';
 const people=state.results.filter(p=>matchesAttemptCount(p,$('results-attempts').value));
 const rows=all?people.flatMap(person=>attemptHistory(person).map(attempt=>({...person,attemptId:attempt.id,attemptNumber:attempt.number,status:attempt.status,attemptStatus:attempt.attemptStatus,startedAt:attempt.startedAt,finishedAt:attempt.finishedAt,totalFinalScore:attempt.totalFinalScore,isLatest:attempt.isLatest,isAttemptRow:true}))):people;
 const filtered=rows.filter(p=>(!filter||p.status===filter)&&(!query||Object.values(p.participant).join(' ').toLowerCase().includes(query)));
 const ordered=orderRows(filtered,$('results-order').value);renderList($('results-list'),ordered);$('results-filter-meta').textContent='Показано '+ordered.length+(all?' попыток':' участников')+' · участников: '+new Set(ordered.map(p=>p.id)).size;
}
async function loadPeople(){const data=await api('/api/admin/participants?runId='+encodeURIComponent(state.runId));state.people=data.participants;renderPeople();}
async function loadResults(){const data=state.resultRunId===state.runId?{participants:state.people}:await api('/api/admin/participants?runId='+encodeURIComponent(state.resultRunId));state.results=data.participants.filter(p=>p.attemptId);renderResults();}
const answerVerdicts={correct:'Верно',incorrect:'Неверно',partial:'Частично верно',unanswered:'Нет ответа',neutral:''};
function answerStatus(value){return Object.hasOwn(answerVerdicts,value)?value:'neutral';}
function questionHeading(question){
 const row=el('div',undefined,'admin-question-heading'),status=answerStatus(question.answerReview?.status);
 row.append(el('strong',question.prompt));if(answerVerdicts[status])row.append(el('span',answerVerdicts[status],'admin-answer-badge answer-'+status));return row;
}
function renderAnswerReview(question){
 const list=el('ul',undefined,'admin-answer-list');
 const lines=question.answerReview?.lines||[{text:question.participantAnswer||(question.answer?'Обновите страницу для загрузки текста ответа.':'Нет ответа'),status:'neutral'}];
 for(const line of lines){const status=answerStatus(line.status),row=el('li',undefined,'admin-answer-line answer-'+status);row.dataset.answerStatus=status;row.append(el('span',line.text,'admin-answer-text'));if(answerVerdicts[status])row.append(el('span',(status==='correct'?'✓ ':status==='incorrect'?'✕ ':'')+answerVerdicts[status],'admin-answer-verdict'));list.append(row);}return list;
}
function appendCertificateAccess(mount,data){
 const row=el('div',undefined,'admin-certificate-access');
 if(data.attempt.certificateAvailable){
  const link=el('a','Открыть сертификат / PDF','button primary admin-certificate-link');link.href='/certificate.html?attempt='+encodeURIComponent(data.attempt.id)+'&organizer=1';link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';row.append(link,el('p','Откройте документ и нажмите «Сохранить как PDF».','muted'));
 }else row.append(el('p','Сертификат станет доступен после завершения попытки участником.','muted'));
 mount.append(row);
}
async function openPerson(person){
 state.editing=person;state.detailRequest++;state.editingAttemptId=null;
 $('participant-title').textContent=person.participant.fullName;$('participant-profile').replaceChildren(el('p',person.participant.institution+' · '+person.participant.groupName),el('p','Прохождений в этом проведении: '+attemptCount(person)));
 $('mentor-input').value=person.participant.mentorName||'';message('mentor-message','');$('attempt-detail').replaceChildren();
 const history=attemptHistory(person),mount=$('attempt-history');mount.replaceChildren();mount.hidden=!history.length;
 if(history.length){
  mount.append(el('p','Всего прохождений: '+history.length+'. Первое начало: '+formatAttemptDate(person.firstStartedAt||history[0].startedAt)+'. Последнее начало: '+formatAttemptDate(person.lastStartedAt||history.at(-1).startedAt)+'.'));
  const label=el('label','Выберите попытку','field'),select=el('select');select.id='participant-attempt-select';
  for(const attempt of [...history].reverse())option(select,attempt.id,'№ '+attempt.number+' · '+formatAttemptDate(attempt.startedAt)+' · '+(statusLabels[attempt.status]||attempt.status)+(attempt.totalFinalScore==null?'':' · '+attempt.totalFinalScore+' / 150'));
  select.value=person.attemptId;label.append(select);mount.append(label);select.addEventListener('change',()=>loadPersonAttempt(person,select.value));
 }
 if(!$('participant-dialog').open)$('participant-dialog').showModal();
 if(!person.attemptId){$('attempt-detail').append(el('p','Попытка ещё не начата. Назначенный наставник будет перенесён в попытку и свидетельство.','muted'));return;}
 await loadPersonAttempt(person,person.attemptId);
}
async function loadPersonAttempt(person,attemptId){
 if(!attemptHistory(person).some(a=>a.id===attemptId))return;
 const request=++state.detailRequest;state.editingAttemptId=attemptId;const mount=$('attempt-detail');delete mount.dataset.attemptId;mount.replaceChildren(el('p','Загрузка ответов…'));
 try{
  const data=await api('/api/admin/attempts/'+encodeURIComponent(attemptId));
  if(state.editing?.id!==person.id||state.detailRequest!==request||state.editingAttemptId!==attemptId)return;
  const selected=attemptHistory(person).find(a=>a.id===attemptId);
  mount.replaceChildren(el('h3','Попытка '+selected.number+' из '+attemptCount(person)),el('p',data.summary.totalFinalScore+' / '+data.summary.totalMaxScore+' баллов · Начало: '+formatAttemptDate(data.attempt.startedAt)),el('p','Статус: '+(statusLabels[data.attempt.status]||data.attempt.status)+(data.attempt.finishedAt?' · Завершение: '+formatAttemptDate(data.attempt.finishedAt):''),'muted'));
  mount.dataset.attemptId=attemptId;appendCertificateAccess(mount,data);
  for(const tour of data.tours){
   const section=el('details');section.append(el('summary',tour.code+' · '+tour.title+' · '+(tour.score?.finalScore??0)+' / '+tour.maxScore));
   for(const q of tour.questions){const card=el('div',undefined,'admin-question');card.append(questionHeading(q),el('p','Ответ участника:'),renderAnswerReview(q),el('p','Правильный ответ:'),el('pre',q.correctAnswer||'—'),el('p','Баллы: '+(q.answer?.finalScore??0)+' / '+q.maxScore));section.append(card);}mount.append(section);
  }
  const events=el('details');events.append(el('summary','События контроля: '+data.integrityEvents.length),el('p','Сигналы не уменьшают баллы автоматически.','muted'));for(const event of data.integrityEvents)events.append(el('p',formatDate(event.receivedAt||event.occurredAt)+' · '+event.eventType+' · '+(event.reason||'')));mount.append(events);
 }catch(e){if(state.detailRequest===request&&state.editing?.id===person.id)mount.replaceChildren(el('p',e.message,'message error'));}
}
async function saveMentor(event){event.preventDefault();const person=state.editing;if(!person)return;const button=event.currentTarget.querySelector('button');button.disabled=true;try{await api('/api/admin/participants/'+person.id,{method:'PATCH',body:{runId:person.runId,mentorName:$('mentor-input').value}});message('mentor-message','Наставник сохранён. Ответы, баллы и время попытки не изменены.');person.participant.mentorName=$('mentor-input').value.trim();await loadPeople();await loadResults();}catch(e){message('mentor-message',e.message,true);}finally{button.disabled=false;}}
function csvCell(value){let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function downloadPeople(){const rows=[['ФИО','Учреждение','Группа','Наставник','Статус последней попытки','Прохождений','Регистрация','Первый старт','Последний старт','Баллы последней попытки'],...peopleFiltered().map(p=>[p.participant.fullName,p.participant.institution,p.participant.groupName,p.participant.mentorName,statusLabels[p.status],attemptCount(p),formatAttemptDate(p.registeredAt),formatAttemptDate(p.firstStartedAt),formatAttemptDate(p.startedAt),p.totalFinalScore])];download('\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8','Участники.csv');}
async function previewImport(e){e.preventDefault();state.preview=null;$('import-preview').hidden=true;try{const data=await api('/api/admin/participants/import',{method:'POST',body:{runId:state.runId,preview:true,text:$('import-text').value,defaults:{institution:$('import-institution').value,groupName:$('import-group').value}}});state.preview={runId:state.runId,people:data.participants};const mount=$('import-preview');mount.replaceChildren(el('h3',`Готово к добавлению: ${data.count}`));if(data.duplicates)mount.append(el('p',`Повторы в списке: ${data.duplicates}. Они будут добавлены один раз.`));const list=el('ol',undefined,'admin-import-list');for(const p of data.participants)list.append(el('li',`${p.fullName} · ${p.institution} · ${p.groupName}${p.mentorName?' · '+p.mentorName:''}`));mount.append(list,btn(`Добавить участников (${data.count})`,applyImport,'button primary'));mount.hidden=false;message('import-message','Проверьте фамилии, группы и проведение перед добавлением.');}catch(error){message('import-message',error.message,true);}}
async function applyImport(){const preview=state.preview;if(!preview||state.busy)return;state.busy=true;let added=0,existing=0;try{for(let i=0;i<preview.people.length;i+=70){const data=await api('/api/admin/participants/import',{method:'POST',body:{runId:preview.runId,participants:preview.people.slice(i,i+70)}});added+=data.added;existing+=data.alreadyPresent;message('import-message',`Сохраняется список: ${Math.min(i+70,preview.people.length)} из ${preview.people.length}`);}state.preview=null;$('import-preview').hidden=true;message('import-message',`Добавлено: ${added}. Уже были в списке: ${existing}. Дубли не создаются.`);await loadPeople();}catch(error){message('import-message',`Уже добавлено: ${added}. ${error.message} Можно повторить сохранение без дублей.`,true);}finally{state.busy=false;}}
async function exportResults(kind){try{const response=await fetch(`/api/admin/exports/${kind}/download?runId=${encodeURIComponent(state.resultRunId)}`,{credentials:'same-origin'});if(!response.ok)throw Error('Не удалось скачать результаты. Обновите страницу и повторите.');download(await response.text(),kind==='csv'?'text/csv;charset=utf-8':'application/json;charset=utf-8',`Результаты-${state.resultRunId}.${kind}`);message('admin-message','Файл результатов скачан.');}catch(e){message('admin-message',e.message,true);}}
async function loadSystem(){const data=await api('/api/admin/summary'),s=data.diagnostics||{},mount=$('system-info');mount.replaceChildren();for(const [name,value]of [['Хранилище',s.storageBackend||data.diagnostics?.storageBackend||'—'],['Версия',s.appVersion||'1.7.0'],['Попыток',data.counts?.attempts??'—'],['Активных',data.counts?.activeAttempts??'—'],['Последняя активность',formatDate(s.lastActivityAt)]]){const card=el('div');card.append(el('span',name),el('strong',value));mount.append(card);}const analytics=$('system-analytics');analytics.replaceChildren();for(const tour of data.tourAnalytics||[])analytics.append(el('p',`${tour.code} · ${tour.title}: средний балл ${tour.averageScore} / ${tour.maxScore}`));for(const p of data.suspiciousAttempts||[])analytics.append(el('p',`${p.fullName||p.participant?.fullName||'Попытка'} · ${p.reasons?.join('; ')||'Требуется проверка'}`));if(!analytics.childElementCount)analytics.append(el('p','Пока нет данных для аналитики.'));}
async function refresh(){if(state.refreshing)return;state.refreshing=true;try{state.runs=await api('/api/admin/story-runs');populateRuns();renderRuns();await loadPeople();await loadResults();if(state.view==='system')await loadSystem();$('admin-refresh-state').textContent='Обновлено '+formatDate(new Date().toISOString());}catch(e){$('admin-refresh-state').textContent='Обновление не завершено';if(e.status===401){$('admin-panel').hidden=true;$('admin-login-card').hidden=false;message('admin-login-message','Сессия закончилась. Войдите снова.',true);}else message('admin-message',e.message,true);}finally{state.refreshing=false;}}
async function login(event){event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;try{await api('/api/admin/login',{method:'POST',body:{password:$('admin-password').value}});$('admin-password').value='';showPanel();await refresh();}catch(e){message('admin-login-message',e.message,true);}finally{button.disabled=false;}}
function showPanel(){$('admin-panel').hidden=false;$('admin-login-card').hidden=true;$('admin-refresh').hidden=false;}
$('admin-login-form').addEventListener('submit',login);$('admin-refresh').addEventListener('click',()=>refresh());document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{view(button.dataset.view);if(state.view==='system')loadSystem().catch(e=>message('admin-message',e.message,true));}));
for(const id of ['filter-search','filter-status','filter-institution','filter-group','filter-mentor','filter-attempts','people-order'])$(id).addEventListener(id==='filter-search'?'input':'change',renderPeople);
$('filter-reset').addEventListener('click',()=>{for(const id of ['filter-search','filter-status','filter-institution','filter-group','filter-mentor','filter-attempts'])$(id).value='';$('people-order').value='start_asc';renderPeople();});
$('people-run').addEventListener('change',()=>{state.runId=$('people-run').value;state.preview=null;$('import-preview').hidden=true;loadPeople().catch(e=>message('admin-message',e.message,true));});$('results-run').addEventListener('change',()=>{state.resultRunId=$('results-run').value;loadResults().catch(e=>message('admin-message',e.message,true));});
for(const id of ['results-order','results-scope','results-attempts'])$(id).addEventListener('change',renderResults);$('results-search').addEventListener('input',renderResults);$('results-status').addEventListener('change',renderResults);$('people-csv').addEventListener('click',downloadPeople);$('participant-close').addEventListener('click',()=>$('participant-dialog').close());$('participant-dialog').addEventListener('close',()=>{state.editing=null;state.editingAttemptId=null;state.detailRequest++;});$('mentor-form').addEventListener('submit',saveMentor);
$('import-form').addEventListener('submit',previewImport);for(const id of ['import-text','import-group','import-institution'])$(id).addEventListener('input',()=>{state.preview=null;$('import-preview').hidden=true;});
$('export-csv').addEventListener('click',()=>exportResults('csv'));$('export-json').addEventListener('click',()=>exportResults('json'));$('upload-disk').addEventListener('click',()=>mutate('/api/admin/disk/upload',{},'POST'));
$('create-run-form').addEventListener('submit',async e=>{e.preventDefault();await mutate('/api/admin/story-runs',Object.fromEntries(new FormData(e.currentTarget)),'POST');});$('create-run-form').elements.date.value=new Date(Date.now()+10800000).toISOString().slice(0,10);
setInterval(()=>{if(!$('admin-panel').hidden&&!document.hidden&&!state.busy&&!state.editing&&!document.activeElement?.closest('#schedule-form,#create-run-form,#import-form'))refresh();},15000);
(async()=>{try{await api('/api/admin/session');showPanel();await refresh();}catch(e){if(e.status!==401)message('admin-login-message',e.message,true);}})();
