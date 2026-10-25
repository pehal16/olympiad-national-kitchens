"use strict";
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),config=path.join(root,'wrangler.demo.toml');
const project='olympiad-gkts-demo',database='olympiad-gkts-public-demo-20261025';
async function main(){
 const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
 if(!/^[a-f0-9]{32}$/.test(account||'')||!token)throw Error('Cloudflare deployment credentials are required.');
 const endpoint='https://api.cloudflare.com/client/v4/accounts/'+account;
 async function api(route,method='GET',body){
  const response=await fetch(endpoint+route,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
  const result=await response.json();if(!response.ok||!result.success){const e=Error('Cloudflare '+method+' '+route+' failed: HTTP '+response.status);e.status=response.status;throw e;}return result.result;
 }
 try{await api('/pages/projects/'+project);}catch(e){if(e.status!==404)throw e;await api('/pages/projects','POST',{name:project,production_branch:'main'});}
 const databases=await api('/d1/database?per_page=100');
 const db=databases.find(d=>d.name===database)||await api('/d1/database','POST',{name:database});
 const id=db.uuid;
 if(!/^[a-f0-9-]{36}$/.test(id||'')||['4c30c9ab-0c53-4b8a-865a-7c9078d48c2f','5986e1bf-dd54-4260-86fe-db0ac794254f'].includes(id))throw Error('Demo must never bind an archive or rehearsal database.');
 const contents=fs.readFileSync(config,'utf8');
 if(!contents.includes('database_name = "'+database+'"'))throw Error('Unexpected demonstration database configuration.');
 fs.writeFileSync(config,contents.replace(/database_id = "[a-f0-9-]+"/,'database_id = "'+id+'"'));
 const wrangler=path.join(root,'node_modules/wrangler/bin/wrangler.js');
 const command=(args,input)=>execFileSync(process.execPath,[wrangler,...args],{cwd:root,input,stdio:[input?'pipe':'inherit','inherit','inherit']});
 command(['d1','migrations','apply',database,'--remote','--config','wrangler.demo.toml']);
 for(const key of ['ADMIN_PASSWORD','ATTEMPT_ID_SECRET']){
  if(!process.env[key])throw Error('Missing deployment secret '+key);
  const value=crypto.createHmac('sha256',process.env[key]).update('public-demo-isolated-v1:'+key).digest('hex');
  console.log('::add-mask::'+value);
  command(['pages','secret','put',key,'--project-name',project],value);
 }
 console.log('Dedicated anonymous demonstration resources are ready: '+project+' / '+database);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
