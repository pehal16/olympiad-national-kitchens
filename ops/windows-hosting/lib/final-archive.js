"use strict";
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {DatabaseSync,backup}=require('node:sqlite');
const {backupPrimaryOnce}=require('./desktop-primary-backup');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const psQuote=value=>"'"+String(value).replaceAll("'","''")+"'";
async function saveFinalArchive({stateDirectory,localDirectory,cloudDirectory,stage='manual',now=new Date()}){
 if(!['manual','rehearsal','after-close','before-shutdown'].includes(stage))throw Error('Invalid archive stage.');
 const source=path.join(stateDirectory,'desktop-primary/olympiad.sqlite');if(!fs.existsSync(source))throw Error('Desktop primary is missing.');
 const date=new Date(now.getTime()+10800000).toISOString().slice(0,10),stamp=new Date(now.getTime()+10800000).toISOString().replace(/[:.]/g,'-').slice(0,19);
 const parent=path.join(localDirectory,date),name='Олимпиада-'+stage+'-'+stamp+'-'+crypto.randomBytes(3).toString('hex'),folder=path.join(parent,name);fs.mkdirSync(folder,{recursive:true,mode:0o700});
 const sqlite=path.join(folder,'olympiad.sqlite'),live=new DatabaseSync(source,{readOnly:true,timeout:5000});try{await backup(live,sqlite);}finally{live.close();}
 const copy=new DatabaseSync(sqlite,{readOnly:true});let attempts,run;
 try{
  if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||copy.prepare('PRAGMA foreign_key_check').all().length)throw Error('Archive integrity check failed.');
  const variants=new Map(copy.prepare('SELECT id,payload_json FROM attempt_variants').all().map(r=>[r.id,JSON.parse(r.payload_json)])),answerRows=copy.prepare('SELECT * FROM attempt_answers').all(),events=copy.prepare('SELECT * FROM olympiad_attempt_events').all();
  attempts=copy.prepare('SELECT id,payload_json FROM attempts ORDER BY id').all().map(row=>{const a=JSON.parse(row.payload_json),answers={},questionLog={};for(const r of answerRows.filter(r=>r.attempt_id===row.id)){const p=JSON.parse(r.payload_json);if(p.answer)answers[r.question_id]=p.answer;if(p.log)questionLog[r.question_id]=p.log;}return {...a,variant:variants.get(row.id),answers,questionLog,integrityEvents:events.filter(r=>r.attempt_id===row.id).map(r=>({...r,payload:JSON.parse(r.payload_json)}))};});
  run=copy.prepare("SELECT r.id,r.published_at,r.stopped FROM olympiad_story_runs r JOIN olympiad_control c ON c.run_id=r.id WHERE c.id='current'").get();
 }finally{copy.close();}
 const timestamp=now.toISOString(),counts=await backupPrimaryOnce({filename:sqlite,directory:folder,now:()=>timestamp,previous:{lastBackupAt:timestamp,lastBackup:sqlite,backedUpFinished:attempts.filter(a=>a.status!=='in_progress').length}});
 fs.writeFileSync(path.join(folder,'Все попытки и ответы.json'),JSON.stringify({exportedAt:timestamp,run,attempts},null,2));
 const oldCloud=path.join(stateDirectory,'updates/d1-quota-20261016/cloud-archive-ui/verified-cloud-archive.sqlite');
 if(fs.existsSync(oldCloud))fs.copyFileSync(oldCloud,path.join(folder,'Облачный архив до переключения.sqlite'),fs.constants.COPYFILE_EXCL);
 fs.writeFileSync(path.join(folder,'ПРОЧИТАЙТЕ.txt'),'Олимпиада: проверенный архив результатов.\r\nДата: '+new Date(timestamp).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})+' МСК\r\nРезультаты.csv открывается в Excel. Все попытки и ответы.json содержит отдельные прохождения, задания и ответы. olympiad.sqlite — полная согласованная база для восстановления.\r\nАрхив не публикует официальные итоги и не останавливает начатые попытки.\r\n');
 const files=fs.readdirSync(folder).map(name=>({name,bytes:fs.statSync(path.join(folder,name)).size,sha256:hash(path.join(folder,name))}));
 const manifest={createdAt:timestamp,stage,source:'desktop-primary',integrity:'ok',run,counts:counts.counts,files};fs.writeFileSync(path.join(folder,'Манифест.json'),JSON.stringify(manifest,null,2));
 const zip=folder+'.zip';
 const command="$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory("+psQuote(folder)+", "+psQuote(zip)+", [System.IO.Compression.CompressionLevel]::Optimal, $true); $archive=[System.IO.Compression.ZipFile]::OpenRead("+psQuote(zip)+"); try { $manifest=Get-Content -Encoding UTF8 -Raw -LiteralPath "+psQuote(path.join(folder,'Манифест.json'))+" | ConvertFrom-Json; foreach($file in $manifest.files){ $entries=@($archive.Entries | Where-Object {[System.IO.Path]::GetFileName($_.FullName) -eq $file.name}); if($entries.Count -ne 1 -or $entries[0].Length -ne $file.bytes){throw 'Incomplete ZIP archive'}; $stream=$entries[0].Open(); $hasher=[System.Security.Cryptography.SHA256]::Create(); try{$digest=([BitConverter]::ToString($hasher.ComputeHash($stream))).Replace('-','').ToLowerInvariant(); if($digest -ne $file.sha256){throw 'ZIP member checksum mismatch'}}finally{$stream.Dispose();$hasher.Dispose()} } } finally { $archive.Dispose() }";
 execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:180000});
 const zipSha256=hash(zip),receipt={createdAt:timestamp,stage,zip,zipSha256,bytes:fs.statSync(zip).size,counts:counts.counts,integrity:'ok',cloudQueued:false};
 if(cloudDirectory){
  if(!fs.existsSync(cloudDirectory))throw Error('Configured cloud sync root is unavailable; local archive is preserved.');
  const destination=path.join(cloudDirectory,'Олимпиада ГКТС','Архивы',date);fs.mkdirSync(destination,{recursive:true});const cloudFile=path.join(destination,path.basename(zip));fs.copyFileSync(zip,cloudFile,fs.constants.COPYFILE_EXCL);if(hash(cloudFile)!==zipSha256)throw Error('Cloud sync-folder copy differs; local archive is preserved.');receipt.cloudQueued=true;receipt.cloudFile=cloudFile;
 }
 fs.writeFileSync(zip+'.receipt.json',JSON.stringify(receipt,null,2));const receipts=path.join(stateDirectory,'final-archive-receipts');fs.mkdirSync(receipts,{recursive:true});fs.writeFileSync(path.join(receipts,stamp+'-'+stage+'.json'),JSON.stringify(receipt,null,2));return receipt;
}
module.exports={saveFinalArchive};
