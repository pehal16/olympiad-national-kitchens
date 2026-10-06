"use strict";
const { readJson, writeJson } = require('./utils');
let env = null;
function configureStoryStorage(value) { env = value; }
function enabled() { return String(env?.STORY_ENABLED ?? process.env.STORY_ENABLED ?? 'false')==='true'; }
function localFile() { return require('path').join(require('./store').STORAGE_DIR, 'story-runs.json'); }
function decode(row) {
  return row ? { ...JSON.parse(row.payload_json), publishedAt: row.published_at || null, stopped: Boolean(row.stopped) } : null;
}
function entryOpen(run, now = Date.now()) {
  return Boolean(run && !run.stopped && !run.publishedAt && now >= Date.parse(run.entryStartsAt) && now < Date.parse(run.entryEndsAt));
}
function makeRun(date, id = require('crypto').randomUUID()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error('Укажите дату проведения.');
  const start = new Date(`${date}T00:00:00+03:00`);
  if (!Number.isFinite(start.getTime()) || new Date(start.getTime()+10800000).toISOString().slice(0,10)!==date) throw new Error('Некорректная дата.');
  return { id, date, timeZone:'Europe/Moscow', entryStartsAt:start.toISOString(), entryEndsAt:new Date(start.getTime()+86400000).toISOString(),
    blueprintVersion:15, storyVersion:1, assetVersion:1, createdAt:new Date().toISOString(), publishedAt:null, stopped:false, decorationsDisabled:false };
}
async function listRuns() {
  if (env?.DB) return (await env.DB.prepare('SELECT * FROM olympiad_story_runs ORDER BY event_date DESC').all()).results.map(decode);
  return readJson(localFile(), []).sort((a,b)=>b.date.localeCompare(a.date));
}
async function getRun(id) {
  if (env?.DB) return decode(await env.DB.prepare('SELECT * FROM olympiad_story_runs WHERE id=?').bind(id).first());
  return readJson(localFile(), []).find(r=>r.id===id) || null;
}
async function createRun(date) {
  const run = makeRun(date);
  if (env?.DB) {
    await env.DB.prepare('INSERT INTO olympiad_story_runs(id,event_date,entry_starts_at,entry_ends_at,payload_json) VALUES(?,?,?,?,?)')
      .bind(run.id,run.date,run.entryStartsAt,run.entryEndsAt,JSON.stringify(run)).run();
  } else {
    const runs=readJson(localFile(),[]);
    if(runs.some(r=>r.date===date)) throw new Error('Для этой даты проведение уже создано.');
    runs.push(run); writeJson(localFile(),runs);
  }
  return run;
}
async function updateRun(id, patch) {
  const run=await getRun(id); if(!run) throw new Error('Проведение не найдено.');
  const next={...run};
  for(const key of ['stopped','decorationsDisabled']) if(typeof patch[key]==='boolean') next[key]=patch[key];
  if(env?.DB) await env.DB.prepare('UPDATE olympiad_story_runs SET stopped=?,payload_json=? WHERE id=?')
    .bind(Number(next.stopped),JSON.stringify(next),id).run();
  else { const runs=readJson(localFile(),[]); runs[runs.findIndex(r=>r.id===id)]=next; writeJson(localFile(),runs); }
  return getRun(id);
}
async function publishRun(id, now=Date.now()) {
  const stamp=new Date(now).toISOString();
  if(env?.DB) {
    await env.DB.prepare(`UPDATE olympiad_story_runs SET published_at=?1 WHERE id=?2 AND published_at IS NULL
      AND entry_ends_at<=?1 AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.story_run_id=?2
        AND json_extract(a.payload_json,'$.status')='in_progress')`).bind(stamp,id).run();
    const run=await getRun(id); if(!run?.publishedAt) throw new Error('Публикация доступна после закрытия входа и завершения всех попыток.');
    return run;
  }
  // No await between the file guard and write: start/publication share one process.
  const runs=readJson(localFile(),[]), run=runs.find(r=>r.id===id);
  if(!run) throw new Error('Проведение не найдено.');
  if(run.publishedAt) return run;
  const attempts=readJson(require('path').join(require('./store').STORAGE_DIR,'attempts.json'),[]);
  if(now<Date.parse(run.entryEndsAt)||attempts.some(a=>a.storyRunId===id&&a.status==='in_progress')) throw new Error('Вход ещё открыт или есть активные попытки.');
  run.publishedAt=stamp; writeJson(localFile(),runs); return run;
}
async function currentRun(now=Date.now()) {
  const runs=await listRuns();
  return runs.find(r=>now>=Date.parse(r.entryStartsAt)&&now<Date.parse(r.entryEndsAt)) ||
    [...runs].reverse().find(r=>Date.parse(r.entryStartsAt)>now) || runs[0] || null;
}
function publicRun(run, now=Date.now()) {
  if(!run) return null;
  return { id:run.id,date:run.date,timeZone:run.timeZone,entryStartsAt:run.entryStartsAt,entryEndsAt:run.entryEndsAt,
    blueprintVersion:run.blueprintVersion,storyVersion:run.storyVersion,assetVersion:run.assetVersion,
    entryOpen:entryOpen(run,now),stopped:run.stopped,publishedAt:run.publishedAt,decorationsDisabled:run.decorationsDisabled };
}
async function hydrate(attempt) {
  if(attempt?.storyRunId) Object.defineProperty(attempt,'_storyRun',{value:await getRun(attempt.storyRunId),writable:true,enumerable:false,configurable:true});
  return attempt;
}
function storyView(attempt) {
  if(!attempt.storyRunId) return null;
  const run=attempt._storyRun;
  return { runId:attempt.storyRunId,storyVersion:1,assetVersion:attempt.variant?.assetVersion||1,currentChapter:Math.min(5,Math.max(1,Number(attempt.variant?.questions?.[attempt.currentStepIndex]?.tourOrder)||5)),
    resultAvailable:Boolean(run?.publishedAt&&attempt.status!=='in_progress'),entryEndsAt:run?.entryEndsAt||null,decorationsDisabled:Boolean(run?.decorationsDisabled) };
}
function scoresVisible(attempt,settings) {
  return attempt.status!=='in_progress' && (attempt.storyRunId ? Boolean(attempt._storyRun?.publishedAt) : Boolean(settings.showParticipantScore));
}
module.exports={configureStoryStorage,enabled,makeRun,entryOpen,listRuns,getRun,createRun,updateRun,publishRun,currentRun,publicRun,hydrate,storyView,scoresVisible};
