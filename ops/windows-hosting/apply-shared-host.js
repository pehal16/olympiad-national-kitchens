"use strict";
// Installed at OlympiadTrial/.update-shared-host/apply-shared-host.js.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),payload=path.join(__dirname,'payload');
const state=path.join(process.env.LOCALAPPDATA,'GKTSOlympiadTrial','v1');
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const literal=text=>"'"+text.replace(/'/g,"''")+"'";
const ps=code=>cp.execFileSync('powershell.exe',['-NoProfile','-Command',code],{encoding:'utf8',windowsHide:true}).trim();
const allowed=new Set(['olympiad-server.js','src/shared-olympiad-api.js','scripts/windows-trial.js','public/index.html','public/app.js','public/attempt-reserve.js','public/sw.js','public/olympiad-story.js','public/olympiad-ready.css','public/olympiad-device.js','public/t2-country-match.js','public/restaurant-layout.js','public/t5-photo-kitchen.js']);
function findNode(){
 const raw=ps("Get-NetTCPConnection -State Listen -LocalPort 3100 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $_) } | Select-Object ProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress");
 if(!raw)return null;const entries=JSON.parse(raw),nodes=Array.isArray(entries)?entries:[entries];assert.equal(nodes.length,1,'Port3100 has an unexpected listener.');const n=nodes[0];
 assert.equal(path.resolve(n.ExecutablePath).toLowerCase(),path.join(root,'runtime','node.exe').toLowerCase(),'Port3100 belongs to another application.');
 assert.ok(n.CommandLine.includes('windows-trial.js'),'Unexpected application on port3100.');return n;
}
async function metadata(base){const r=await fetch(base+'/api/public/olympiad',{signal:AbortSignal.timeout(15000)});assert.ok(r.ok,'Olympiad metadata unavailable.');const j=await r.json();assert.equal(j.data?.recovery?.backend,'shared-d1','Shared backend is not deployed yet.');assert.equal(j.data.story?.entryStartsAt,'2026-10-16T05:00:00.000Z');assert.equal(j.data.story?.entryEndsAt,'2026-10-16T13:00:00.000Z');return j.data;}
(async()=>{
 assert.equal(process.platform,'win32');assert.ok(fs.existsSync(path.join(root,'runtime','node.exe')),'Extract beside start-olympiad.cmd.');
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
 assert.equal(manifest.version,'shared-host-v1');assert.equal(manifest.files.length,allowed.size);
 for(const entry of manifest.files){assert.ok(allowed.has(entry.path));assert.equal(digest(fs.readFileSync(path.join(payload,...entry.path.split('/')))),entry.sha256,'Update file hash mismatch.');}
 await metadata('https://olympiad-gkts.pages.dev');
 const database=path.join(state,'olympiad.sqlite'),credentialFile=path.join(state,'credentials.json');
 assert.ok(fs.existsSync(database)&&fs.existsSync(credentialFile),'Original server data not found. No update applied.');
 const credentialHash=digest(fs.readFileSync(credentialFile)),{DatabaseSync}=require('node:sqlite');
 let db=new DatabaseSync(database,{readOnly:true});
 const before=db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN json_extract(payload_json,'$.status')='in_progress' AND json_extract(payload_json,'$.expiresAt')>strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN 1 ELSE 0 END) AS active FROM attempts").get();db.close();
 assert.equal(Number(before.active||0),0,'Active local attempts exist. Finish them before switching to the shared backend.');
 const owned=findNode();
 const {backupTrial,trialPaths}=require(path.join(root,'scripts','windows-trial.js'));await backupTrial(trialPaths(state));
 const backup=path.join(state,'backups','shared-host-'+Date.now());fs.mkdirSync(backup,{recursive:true});
 for(const entry of manifest.files){const target=path.resolve(root,...entry.path.split('/'));assert.ok(path.relative(root,target)&&!path.relative(root,target).startsWith('..'));if(fs.existsSync(target)){const saved=path.join(backup,entry.path);fs.mkdirSync(path.dirname(saved),{recursive:true});fs.copyFileSync(target,saved);}fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(payload,entry.path),target);}
 const settingsFile=path.join(state,'hosting-settings.json');if(fs.existsSync(settingsFile))fs.copyFileSync(settingsFile,path.join(backup,'hosting-settings.json'));
 if(fs.existsSync(path.join(state,'Организатор.txt')))fs.copyFileSync(path.join(state,'Организатор.txt'),path.join(backup,'organizer-private.txt'));
 fs.writeFileSync(settingsFile,JSON.stringify({publicApiOrigin:'https://olympiad-gkts.pages.dev',addonVersion:manifest.version},null,2));
 // Re-check ownership just before stopping this one process; no Caddy/SSH change.
 assert.equal(findNode()?.ProcessId,owned?.ProcessId,'Listener changed during preparation; original process retained.');
 if(owned)ps('Stop-Process -Id '+Number(owned.ProcessId)+' -ErrorAction Stop');
 await new Promise(r=>setTimeout(r,1000));
 if(!findNode()){
  const exe=path.join(root,'runtime','node.exe'),launcher=path.join(root,'scripts','windows-trial.js');
  ps('Start-Process -FilePath '+literal(exe)+' -ArgumentList '+literal('"'+launcher+'" --no-browser')+' -WorkingDirectory '+literal(root)+' -WindowStyle Hidden -RedirectStandardOutput '+literal(path.join(backup,'restart.stdout.log'))+' -RedirectStandardError '+literal(path.join(backup,'restart.stderr.log')));
 }
 let ready=false,last;
 for(let i=0;i<20;i++){try{await metadata('http://127.0.0.1:3100');ready=true;break;}catch(e){last=e;await new Promise(r=>setTimeout(r,1500));}}
 assert.ok(ready,last?.message||'Updated server did not start. Preserve the backup.');
 assert.equal(digest(fs.readFileSync(credentialFile)),credentialHash,'Original keys changed unexpectedly.');
 db=new DatabaseSync(database,{readOnly:true});assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM attempts').get().n,before.total);db.close();
 const report={date:new Date().toISOString(),version:manifest.version,sharedBackend:'https://olympiad-gkts.pages.dev',originalAttempts:before.total,originalActiveAttempts:before.active||0,credentialsPreserved:true,sqliteIntegrity:'ok',officialEntryStartsAt:'2026-10-16T05:00:00.000Z',officialEntryEndsAt:'2026-10-16T13:00:00.000Z'};
 fs.writeFileSync(path.join(state,'shared-host-update-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));console.log('Update verified. Official organizer: https://olympiad-gkts.pages.dev/admin.html');
})().catch(e=>{console.error('UPDATE NOT VERIFIED: '+e.message);process.exitCode=1;});
