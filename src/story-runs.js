"use strict";
const { readJson, writeJson } = require('./utils');
const { retryD1 } = require('./d1-retry');
let env = null;
function configureStoryStorage(value) { env = value; }
function enabled() { return String(env?.STORY_ENABLED ?? process.env.STORY_ENABLED ?? 'false')==='true'; }
function anytimeEntryEnabled() { return String(env?.STORY_ANYTIME_ENTRY ?? process.env.STORY_ANYTIME_ENTRY ?? 'false')==='true'; }
const ANYTIME_RUN_ID = 'anytime-v1';
function localFile() { return require('path').join(require('./store').STORAGE_DIR, 'story-runs.json'); }
function controlFile(){return require('path').join(require('./store').STORAGE_DIR,'olympiad-control.json');}
async function selectedRunId(){
 if(env?.DB)return (await retryD1(()=>env.DB.prepare("SELECT run_id FROM olympiad_control WHERE id='current'").first()))?.run_id||null;
 return readJson(controlFile(),{}).runId||null;
}
async function selectRun(id){
 const run=await getRun(id);if(!run||run.publishedAt)throw new Error('Выберите проведение без опубликованных итогов.');
 if(env?.DB)await retryD1(()=>env.DB.prepare(`INSERT INTO olympiad_control(id,run_id) SELECT 'current',id FROM olympiad_story_runs WHERE id=? AND published_at IS NULL
  ON CONFLICT(id) DO UPDATE SET run_id=excluded.run_id`).bind(id).run());
 else writeJson(controlFile(),{runId:id});
 return getRun(id);
}
function scheduleWindow(startsAt,endsAt){
 const canonical=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
 if(!canonical(startsAt)||!canonical(endsAt)||Date.parse(endsAt)<=Date.parse(startsAt))throw new Error('Укажите корректные дату и время открытия и закрытия. Закрытие должно быть позже открытия.');
 return {entryStartsAt:startsAt,entryEndsAt:endsAt,date:new Date(Date.parse(startsAt)+10800000).toISOString().slice(0,10),entryMode:'scheduled',fixedAdmission:true};
}
async function rescheduleRun(id,patch){
 const run=await getRun(id);if(!run||run.publishedAt)throw new Error('Нельзя изменить расписание после публикации итогов. Создайте новое проведение.');
 const window=scheduleWindow(patch.entryStartsAt,patch.entryEndsAt),next={...run,...window,admissionMode:'auto',stopped:false};
 if(env?.DB){
  await retryD1(()=>env.DB.batch([
   env.DB.prepare(`UPDATE olympiad_story_runs SET event_date=?,entry_starts_at=?,entry_ends_at=?,entry_mode='scheduled',stopped=0,
    payload_json=json_set(payload_json,'$.date',?,'$.entryStartsAt',?,'$.entryEndsAt',?,'$.entryMode','scheduled','$.fixedAdmission',json('true'),'$.admissionMode','auto','$.stopped',json('false')) WHERE id=? AND published_at IS NULL`)
    .bind(next.date,next.entryStartsAt,next.entryEndsAt,next.date,next.entryStartsAt,next.entryEndsAt,id),
   env.DB.prepare(`INSERT INTO olympiad_control(id,run_id) SELECT 'current',id FROM olympiad_story_runs WHERE id=? AND published_at IS NULL
    ON CONFLICT(id) DO UPDATE SET run_id=excluded.run_id`).bind(id)
  ]));
  const stored=await getRun(id);if(stored.publishedAt)throw new Error('Итоги уже опубликованы. Расписание не изменено.');return stored;
 }
 const runs=readJson(localFile(),[]);if(runs.some(r=>r.id!==id&&r.date===next.date))throw new Error('На эту дату уже есть проведение. Выберите его или другую дату.');
 runs[runs.findIndex(r=>r.id===id)]=next;writeJson(localFile(),runs);writeJson(controlFile(),{runId:id});return next;
}
function decode(row) {
  return row ? { ...JSON.parse(row.payload_json), entryMode:row.entry_mode||'scheduled', publishedAt: row.published_at || null, stopped: Boolean(row.stopped) } : null;
}
function entryOpen(run, now = Date.now()) {
  return Boolean(run && !run.stopped && !run.publishedAt && run.admissionMode!=='closed' &&
    (run.admissionMode==='open' || run.entryMode==='anytime' || (now >= Date.parse(run.entryStartsAt) && now < Date.parse(run.entryEndsAt))));
}
function publicationClosed(run, now = Date.now()) {
  // A manual opening after the scheduled end must still block publication.
  return !entryOpen(run,now) && (run.entryMode==='anytime'
    ? run.stopped || run.admissionMode==='closed' : now>=Date.parse(run.entryEndsAt));
}
function makeRun(date, id = require('crypto').randomUUID(), window = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error('Укажите дату проведения.');
  const start = new Date(`${date}T00:00:00+03:00`);
  if (!Number.isFinite(start.getTime()) || new Date(start.getTime()+10800000).toISOString().slice(0,10)!==date) throw new Error('Некорректная дата.');
  const bounded=window.startTime!==undefined||window.endTime!==undefined;
  const startTime=window.startTime??'00:00',endTime=window.endTime??'24:00';
  const minutes=(time,end=false)=>{
    if(end&&time==='24:00')return 1440;
    if(typeof time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Время входа указывается в формате ЧЧ:ММ по Москве.');
    return Number(time.slice(0,2))*60+Number(time.slice(3));
  };
  const from=minutes(startTime),to=minutes(endTime,true);
  if(to<=from)throw new Error('Закрытие входа должно быть позже открытия в выбранную дату.');
  return { id, date, entryMode:'scheduled', timeZone:'Europe/Moscow', entryStartsAt:new Date(start.getTime()+from*60000).toISOString(), entryEndsAt:new Date(start.getTime()+to*60000).toISOString(),
    ...(bounded?{fixedAdmission:true}:{}),
    blueprintVersion:15, storyVersion:1, assetVersion:1, createdAt:new Date().toISOString(), publishedAt:null, stopped:false, decorationsDisabled:false };
}
async function listRuns() {
  if (env?.DB) return (await retryD1(() => env.DB.prepare('SELECT * FROM olympiad_story_runs ORDER BY event_date DESC').all())).results.map(decode);
  return readJson(localFile(), []).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
async function getRun(id) {
  if (env?.DB) return decode(await retryD1(() => env.DB.prepare('SELECT * FROM olympiad_story_runs WHERE id=?').bind(id).first()));
  return readJson(localFile(), []).find(r=>r.id===id) || null;
}
async function createRun(date, window = {}) {
  const run = makeRun(date,undefined,window);
  if (env?.DB) {
    await retryD1(() => env.DB.prepare('INSERT INTO olympiad_story_runs(id,event_date,entry_starts_at,entry_ends_at,payload_json) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING')
      .bind(run.id,run.date,run.entryStartsAt,run.entryEndsAt,JSON.stringify(run)).run());
  } else {
    const runs=readJson(localFile(),[]);
    if(runs.some(r=>r.date===date)) throw new Error('Для этой даты проведение уже создано.');
    runs.push(run); writeJson(localFile(),runs);
  }
  return run;
}
async function ensureAnytimeRun() {
  const existing=await getRun(ANYTIME_RUN_ID);
  if(existing)return existing;
  const run={id:ANYTIME_RUN_ID,date:null,entryMode:'anytime',timeZone:'Europe/Moscow',entryStartsAt:null,entryEndsAt:null,
    blueprintVersion:15,storyVersion:1,assetVersion:1,createdAt:new Date().toISOString(),publishedAt:null,stopped:false,decorationsDisabled:false};
  if(env?.DB) {
    // Fixed identity makes simultaneous initial visits create one shared run.
    // Empty bounds belong only to this explicit mode; no event date is invented.
    await retryD1(() => env.DB.prepare(`INSERT INTO olympiad_story_runs(id,event_date,entry_starts_at,entry_ends_at,entry_mode,payload_json)
      VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(run.id,'anytime','','','anytime',JSON.stringify(run)).run());
    return getRun(run.id);
  }
  // No await between the local guard and write.
  const runs=readJson(localFile(),[]), stored=runs.find(r=>r.id===run.id);
  if(stored)return stored;
  runs.push(run);writeJson(localFile(),runs);return run;
}
async function updateRun(id, patch) {
  const run=await getRun(id); if(!run) throw new Error('Проведение не найдено.');
  if(patch.admissionMode!==undefined && !['auto','open','closed'].includes(patch.admissionMode)) throw new Error('Выберите ручное включение, выключение или расписание.');
  if(run.publishedAt && (patch.admissionMode!==undefined || patch.stopped===false)) throw new Error('Итоги уже опубликованы. Новые старты этого проведения закрыты.');
  const next={...run};
  for(const key of ['stopped','decorationsDisabled']) if(typeof patch[key]==='boolean') next[key]=patch[key];
  if(patch.admissionMode!==undefined){next.admissionMode=patch.admissionMode;next.stopped=false;}
  if(env?.DB){
    // Patch individual JSON fields so another organizer's decoration change
    // cannot restore an obsolete admission state. Publication wins any race.
    const keys=['stopped','decorationsDisabled'].filter(key=>typeof patch[key]==='boolean');
    if(patch.admissionMode!==undefined){if(!keys.includes('stopped'))keys.push('stopped');keys.push('admissionMode');}
    if(keys.length){
      const jsonArgs=keys.map(()=>"?,json(?)").join(','),values=keys.flatMap(key=>['$.'+key,JSON.stringify(next[key])]);
      await retryD1(() => env.DB.prepare(`UPDATE olympiad_story_runs SET ${keys.includes('stopped')?'stopped=?,':''}payload_json=json_set(payload_json,${jsonArgs}) WHERE id=?${patch.admissionMode!==undefined||patch.stopped===false?' AND published_at IS NULL':''}`)
        .bind(...(keys.includes('stopped')?[Number(next.stopped)]:[]),...values,id).run());
    }
  }
  else { const runs=readJson(localFile(),[]); runs[runs.findIndex(r=>r.id===id)]=next; writeJson(localFile(),runs); }
  const stored=await getRun(id);
  if(stored.publishedAt && (patch.admissionMode!==undefined || patch.stopped===false))throw new Error('Итоги уже опубликованы. Новые старты этого проведения закрыты.');
  return stored;
}
async function publishRun(id, now=Date.now()) {
  const stamp=new Date(now).toISOString();
  if(env?.DB) {
    await retryD1(() => env.DB.prepare(`UPDATE olympiad_story_runs SET published_at=?1 WHERE id=?2 AND published_at IS NULL
      AND (stopped=1 OR COALESCE(json_extract(payload_json,'$.admissionMode'),'auto')!='open')
      AND ((entry_mode='anytime' AND (stopped=1 OR json_extract(payload_json,'$.admissionMode')='closed')) OR (entry_mode='scheduled' AND entry_ends_at<=?1))
      AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.story_run_id=?2
        AND json_extract(a.payload_json,'$.status')='in_progress')`).bind(stamp,id).run());
    const run=await getRun(id); if(!run?.publishedAt) throw new Error('Публикация доступна после закрытия входа и завершения всех попыток.');
    return run;
  }
  // No await between the file guard and write: start/publication share one process.
  const runs=readJson(localFile(),[]), run=runs.find(r=>r.id===id);
  if(!run) throw new Error('Проведение не найдено.');
  if(run.publishedAt) return run;
  const attempts=readJson(require('path').join(require('./store').STORAGE_DIR,'attempts.json'),[]);
  const closed=publicationClosed(run,now);
  if(!closed||attempts.some(a=>a.storyRunId===id&&a.status==='in_progress')) throw new Error('Вход ещё открыт или есть активные попытки.');
  run.publishedAt=stamp; writeJson(localFile(),runs); return run;
}
async function currentRun(now=Date.now()) {
  const selected=await selectedRunId();if(selected){const run=await getRun(selected);if(run)return run;}
  const officialDate=env?.OFFICIAL_OLYMPIAD_DATE??process.env.OFFICIAL_OLYMPIAD_DATE;
  if(officialDate){
    const wanted=makeRun(officialDate,`official-${officialDate}`,{startTime:env?.OFFICIAL_OLYMPIAD_START_TIME??process.env.OFFICIAL_OLYMPIAD_START_TIME??'08:00',endTime:env?.OFFICIAL_OLYMPIAD_END_TIME??process.env.OFFICIAL_OLYMPIAD_END_TIME??'16:00'});
    let official=(await listRuns()).find(r=>r.date===officialDate);
    if(!official){
      if(env?.DB){
        await retryD1(()=>env.DB.prepare('INSERT INTO olympiad_story_runs(id,event_date,entry_starts_at,entry_ends_at,entry_mode,payload_json) VALUES(?,?,?,?,?,?) ON CONFLICT(event_date) DO NOTHING')
          .bind(wanted.id,wanted.date,wanted.entryStartsAt,wanted.entryEndsAt,'scheduled',JSON.stringify(wanted)).run());
        official=(await listRuns()).find(r=>r.date===officialDate);
      }else official=await createRun(officialDate,{startTime:env?.OFFICIAL_OLYMPIAD_START_TIME??process.env.OFFICIAL_OLYMPIAD_START_TIME??'08:00',endTime:env?.OFFICIAL_OLYMPIAD_END_TIME??process.env.OFFICIAL_OLYMPIAD_END_TIME??'16:00'});
    }
    if(!official||official.entryStartsAt!==wanted.entryStartsAt||official.entryEndsAt!==wanted.entryEndsAt)throw new Error('Сохранённое время проведения отличается от настройки. Изменение существующих попыток не выполнено.');
    return official;
  }
  const runs=await listRuns();
  const scheduled=runs.filter(r=>r.entryMode!=='anytime');
  const active=scheduled.find(r=>now>=Date.parse(r.entryStartsAt)&&now<Date.parse(r.entryEndsAt));
  if(active)return active;
  // An explicitly timed official day closes free entry before and after its
  // window. Legacy whole-day runs retain the existing anytime behavior.
  const bounded=scheduled.filter(r=>r.fixedAdmission);
  if(bounded.length)return [...bounded].reverse().find(r=>Date.parse(r.entryStartsAt)>now)||bounded[0];
  if(anytimeEntryEnabled())return runs.find(r=>r.id===ANYTIME_RUN_ID)||ensureAnytimeRun();
  return [...scheduled].reverse().find(r=>Date.parse(r.entryStartsAt)>now) || scheduled[0] || null;
}
function recoveryPolicy(){
  return env?.DB&&String(env?.SHARED_OLYMPIAD_BACKEND??process.env.SHARED_OLYMPIAD_BACKEND)==='d1'
    ?{backend:'shared-d1',origins:['https://xn--80aaloaqinm.xn--b1amqadnhd.xn--p1ai','https://olympiad-gkts.pages.dev']}:null;
}
function publicRun(run, now=Date.now()) {
  if(!run) return null;
  return { id:run.id,date:run.date,entryMode:run.entryMode||'scheduled',timeZone:run.timeZone,entryStartsAt:run.entryStartsAt,entryEndsAt:run.entryEndsAt,
    blueprintVersion:run.blueprintVersion,storyVersion:run.storyVersion,assetVersion:run.assetVersion,
    serverTime:new Date(now).toISOString(),entryOpen:entryOpen(run,now),admissionMode:run.admissionMode||'auto',stopped:run.stopped,publishedAt:run.publishedAt,decorationsDisabled:run.decorationsDisabled };
}
async function hydrate(attempt) {
  if(attempt?.storyRunId) Object.defineProperty(attempt,'_storyRun',{value:await getRun(attempt.storyRunId),writable:true,enumerable:false,configurable:true});
  return attempt;
}
function storyView(attempt) {
  if(!attempt.storyRunId) return null;
  const run=attempt._storyRun;
  const questions=attempt.variant?.questions||[];
  const recordedPhotos=questions.filter(q=>q.tourCode==='T1'&&attempt.answers?.[q.id]).map(q=>({number:q.sequenceInTour,imageUrl:q.imageUrl}));
  const mapQuestion=[...questions].reverse().find(q=>q.tourCode==='T2'&&attempt.answers?.[q.id]);
  const recordedMap=mapQuestion?mapQuestion.items.map(item=>({dish:item.text,country:mapQuestion.buckets.find(b=>b.id===attempt.answers[mapQuestion.id].answerPayload?.buckets?.[item.id])?.label||'не выбрано'})):[];
  return { runId:attempt.storyRunId,storyVersion:1,assetVersion:attempt.variant?.assetVersion||1,conditionVersion:require('./story-dialogue').conditionVersion(attempt),dialogueVersion:attempt.variant?.dialogueVersion||0,currentChapter:Math.min(5,Math.max(1,Number(attempt.variant?.questions?.[attempt.currentStepIndex]?.tourOrder)||5)),
    recordedPhotos,recordedMap,
    resultAvailable:Boolean(run?.publishedAt&&attempt.status!=='in_progress'),entryMode:run?.entryMode||'scheduled',entryOpen:entryOpen(run),entryEndsAt:run?.entryEndsAt||null,decorationsDisabled:Boolean(run?.decorationsDisabled) };
}
function scoresVisible(attempt,settings) {
  return attempt.status!=='in_progress' && (attempt.storyRunId ? Boolean(attempt._storyRun?.publishedAt) : Boolean(settings.showParticipantScore));
}
module.exports={configureStoryStorage,enabled,makeRun,entryOpen,publicationClosed,listRuns,getRun,createRun,updateRun,publishRun,currentRun,publicRun,hydrate,storyView,scoresVisible,recoveryPolicy,selectRun,rescheduleRun,scheduleWindow,selectedRunId};
