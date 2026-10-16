"use strict";
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync,backup}=require('node:sqlite');
const {atomicFile}=require('./desktop-mirror-store');
function csvCell(value){let text=String(value??'');if(/^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
async function backupPrimaryOnce({filename,directory,previous={},now=()=>new Date().toISOString()}){
 if(!fs.existsSync(filename))throw Error('Primary database is missing.');
 fs.mkdirSync(directory,{recursive:true,mode:0o700});
 const db=new DatabaseSync(filename,{readOnly:true,timeout:5000});
 try{
  db.exec('BEGIN');let attempts,registrations,answerCounts;
  try{
   attempts=db.prepare('SELECT payload_json FROM attempts ORDER BY id').all().map(row=>JSON.parse(row.payload_json));
   registrations=db.prepare('SELECT * FROM olympiad_registrations ORDER BY id').all();
   answerCounts=new Map(db.prepare("SELECT attempt_id,COUNT(*) n FROM attempt_answers WHERE json_type(payload_json,'$.answer')='object' GROUP BY attempt_id").all().map(r=>[r.attempt_id,r.n]));
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  const results=attempts.map(a=>({id:a.id,participant:a.participant||{},status:a.status,startedAt:a.startedAt,finishedAt:a.finishedAt||null,totalFinalScore:a.status==='in_progress'?null:a.totalFinalScore??null,totalMaxScore:a.totalMaxScore??150,answeredCount:answerCounts.get(a.id)||0,runId:a.storyRunId||null}));
  const checkedAt=now(),counts={attempts:results.length,finished:results.filter(a=>a.status!=='in_progress').length,answers:results.reduce((n,a)=>n+a.answeredCount,0),registrations:registrations.length};
  atomicFile(path.join(directory,'results.json'),JSON.stringify({exportedAt:checkedAt,attempts:results},null,2));
  atomicFile(path.join(directory,'registrations.json'),JSON.stringify({exportedAt:checkedAt,registrations},null,2));
  const headers=['ID','ФИО','Учреждение','Группа','Наставник','Статус','Начало','Завершение','Баллы','Максимум','Сохранено ответов'];
  const rows=results.map(a=>[a.id,a.participant.fullName,a.participant.institution,a.participant.groupName,a.participant.mentorName,a.status,a.startedAt,a.finishedAt,a.totalFinalScore,a.totalMaxScore,a.answeredCount]);
  const csv='\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n';
  let exportWarning=null;try{atomicFile(path.join(directory,'Результаты.csv'),csv);}catch(error){if(!['EACCES','EBUSY','EPERM'].includes(error.code))throw error;atomicFile(path.join(directory,'Результаты-ожидают-закрытия-Excel.csv'),csv);exportWarning='Закройте Результаты.csv в Excel для обновления основной CSV.';}
  let lastBackupAt=previous.lastBackupAt||null,lastBackup=previous.lastBackup||null;
  const elapsed=Date.parse(checkedAt)-Date.parse(lastBackupAt||'1970-01-01');
  // A complete SQLite backup contains the frozen variants, owner hashes and
  // event journal too. CSV/JSON are private conveniences, never a source DB.
  if(!lastBackupAt||elapsed>=300000||(counts.finished>(previous.backedUpFinished??-1)&&elapsed>=60000)){
   const folder=path.join(directory,'snapshots');fs.mkdirSync(folder,{recursive:true});
   lastBackup=path.join(folder,'desktop-primary-'+Date.parse(checkedAt)+'-'+crypto.randomBytes(3).toString('hex')+'.sqlite');
   await backup(db,lastBackup);
   const copy=new DatabaseSync(lastBackup,{readOnly:true});try{if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Primary backup integrity failed.');}finally{copy.close();}
   lastBackupAt=checkedAt;
  }
  const status={state:'ok',checkedAt,lastSuccessAt:checkedAt,source:'desktop-primary',counts,lastBackupAt,lastBackup,backedUpFinished:lastBackupAt===checkedAt?counts.finished:previous.backedUpFinished,exportWarning};
  atomicFile(path.join(directory,'status.json'),JSON.stringify(status,null,2));
  atomicFile(path.join(directory,'Состояние копии.txt'),'\uFEFFОСНОВНАЯ БАЗА ОЛИМПИАДЫ НА ЭТОМ ПК\r\nПроверено: '+new Date(checkedAt).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})+' МСК\r\nПопыток: '+counts.attempts+'; завершено: '+counts.finished+'; ответов: '+counts.answers+'\r\nCSV и JSON обновляются каждые 15 секунд. Полные проверенные снимки SQLite — не реже 5 минут.\r\nОблачная база и прежнее зеркало сохранены отдельно как архив; автоматического обратного импорта нет.\r\n');
  return status;
 }finally{db.close();}
}
async function main(){
 const state=path.join(process.env.LOCALAPPDATA,'GKTSOlympiadTrial/v1'),directory=path.join(state,'desktop-primary/results'),filename=path.join(state,'desktop-primary/olympiad.sqlite');
 let previous={};try{previous=JSON.parse(fs.readFileSync(path.join(directory,'status.json'),'utf8'));}catch{}
 // Verify a fresh complete snapshot after every agent restart.
 previous.lastBackupAt=null;
 do{
  try{previous=await backupPrimaryOnce({filename,directory,previous});console.log(JSON.stringify({source:'desktop-primary',state:'ok',counts:previous.counts,lastBackupAt:previous.lastBackupAt}));}
  catch{console.error('Desktop primary backup unavailable; preserved previous snapshots; automatic retry pending.');}
  if(process.argv.includes('--once'))break;
  await new Promise(resolve=>setTimeout(resolve,15000));
 }while(true);
}
module.exports={backupPrimaryOnce,main};
