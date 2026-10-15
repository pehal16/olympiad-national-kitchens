"use strict";
const crypto=require('node:crypto'),{readJson,writeJson}=require('./utils'),{retryD1}=require('./d1-retry');
let env=null;
function configureRegistry(value){env=value;}
function file(){return require('node:path').join(require('./store').STORAGE_DIR,'olympiad-registrations.json');}
function key(runId,signature){return crypto.createHash('sha256').update(runId+'\n'+signature).digest('hex');}
async function list(runId){
 if(env?.DB)return (await retryD1(()=>env.DB.prepare('SELECT * FROM olympiad_registrations WHERE run_id=? ORDER BY id').bind(runId).all())).results;
 return readJson(file(),[]).filter(r=>r.run_id===runId);
}
async function register(runId,signature,participant,{expected=false}={}){
 const id=key(runId,signature),stamp=new Date().toISOString();
 if(env?.DB){
  await retryD1(()=>env.DB.prepare(`INSERT INTO olympiad_registrations(id,run_id,participant_signature,participant_json,expected,registered_at,mentor_override,updated_at)
   VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(run_id,participant_signature) DO UPDATE SET
   expected=MAX(olympiad_registrations.expected,excluded.expected),
   participant_json=CASE WHEN excluded.registered_at IS NOT NULL THEN excluded.participant_json ELSE olympiad_registrations.participant_json END,
   registered_at=COALESCE(olympiad_registrations.registered_at,excluded.registered_at),
   updated_at=excluded.updated_at`).bind(id,runId,signature,JSON.stringify(participant),Number(expected),expected?null:stamp,expected&&participant.mentorName?participant.mentorName:null,stamp).run());
 }else{
  const rows=readJson(file(),[]),old=rows.find(r=>r.id===id);
  if(old){old.expected=Number(Boolean(old.expected||expected));if(!expected){old.participant_json=JSON.stringify(participant);if(!old.registered_at)old.registered_at=stamp;}old.updated_at=stamp;}
  else rows.push({id,run_id:runId,participant_signature:signature,participant_json:JSON.stringify(participant),expected:Number(expected),registered_at:expected?null:stamp,mentor_override:expected&&participant.mentorName?participant.mentorName:null,updated_at:stamp});
  writeJson(file(),rows);
 }
 return id;
}
async function mentor(runId,signature,participant,name){
 if(typeof name!=='string'||name.trim().length>160||/[\u0000-\u001f]/.test(name))throw new Error('Наставник: до160 символов, без переноса строки.');
 const id=key(runId,signature),stamp=new Date().toISOString(),value=name.trim();
 if(env?.DB){
  await retryD1(()=>env.DB.batch([
   env.DB.prepare(`INSERT INTO olympiad_registrations(id,run_id,participant_signature,participant_json,mentor_override,updated_at)
    VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET mentor_override=excluded.mentor_override,updated_at=excluded.updated_at`).bind(id,runId,signature,JSON.stringify(participant),value,stamp),
   // Field-only update plus revision preserves answers and makes concurrent
   // grading/finish retry against the latest participant metadata.
   env.DB.prepare(`UPDATE attempts SET payload_json=json_set(payload_json,'$.participant.mentorName',?),
    state_revision=state_revision+1,updated_at=? WHERE COALESCE(story_run_id,'legacy')=?
    AND json_extract(payload_json,'$.participantSignature')=?`).bind(value,stamp,runId,signature)
  ]));
 }else{
  const rows=readJson(file(),[]);let row=rows.find(r=>r.id===id);
  if(!row){row={id,run_id:runId,participant_signature:signature,participant_json:JSON.stringify(participant),expected:0,registered_at:null};rows.push(row);}
  row.mentor_override=value;row.updated_at=stamp;writeJson(file(),rows);
  const target=require('node:path').join(require('./store').STORAGE_DIR,'attempts.json'),attempts=readJson(target,[]);
  for(const a of attempts)if((a.storyRunId||'legacy')===runId&&a.participantSignature===signature){a.participant.mentorName=value;a.stateRevision=(a.stateRevision||0)+1;}
  writeJson(target,attempts);
 }
 return {id,mentorName:value};
}
function parseImport(text,defaults={}){
 if(typeof text!=='string'||text.length>200000)throw new Error('Вставьте список до500 строк.');
 const delimiter=text.includes('\t')?'\t':';',rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&(c===delimiter||c==='\n')){row.push(cell.replace(/\r$/,''));cell='';if(c==='\n'){if(row.some(x=>x.trim()))rows.push(row);row=[];}}
  else cell+=c;
 }
 if(quoted)throw new Error('В списке не закрыта кавычка.');row.push(cell.replace(/\r$/,''));if(row.some(x=>x.trim()))rows.push(row);
 if(!rows.length||rows.length>501)throw new Error('Нужен список от1до500 участников.');
 const aliases={fullName:['фио','ф.и.о.','участник','студент','fullname'],institution:['учреждение','учебное заведение','колледж','institution'],groupName:['группа','groupname'],mentorName:['наставник','фио наставника','mentorname']};
 const header=rows[0].map(s=>s.trim().toLowerCase().replace(/^\uFEFF/,''));
 const named=header.some(s=>aliases.fullName.includes(s));
 const indexes=Object.fromEntries(Object.entries(aliases).map(([k,values],i)=>[k,named?header.findIndex(s=>values.includes(s)):i]));
 const people=(named?rows.slice(1):rows).map((cells,i)=>{
  if(cells.length>4)throw new Error(`Строка${i+1}: ожидаются четыре столбца — ФИО, учреждение, группа, наставник.`);
  return Object.fromEntries(Object.keys(aliases).map(k=>[k,(indexes[k]>=0?cells[indexes[k]]:'')?.trim()||String(defaults[k]||'').trim()]));
 });
 if(!people.length||people.length>500)throw new Error('Нужен список от1до500 участников.');return people;
}
module.exports={configureRegistry,key,list,register,mentor,parseImport};
