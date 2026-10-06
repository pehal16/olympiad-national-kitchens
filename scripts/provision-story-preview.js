"use strict";
// Only preview resources are mutated. Production bindings and secrets are preserved.
const fs=require('node:fs'),crypto=require('node:crypto');
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const project='olympiad-gkts',databaseName='olympiad-gkts-story-preview-db';
async function api(path,method='GET',body){
  const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json();if(!r.ok||!data.success)throw Error(`Cloudflare ${method} ${path}: ${JSON.stringify(data.errors)}`);return data.result;
}
async function main(){
  if(!account||!token)throw Error('Cloudflare CI credentials are required.');
  const databases=await api('/d1/database?per_page=100');
  let db=databases.find(d=>d.name===databaseName);if(!db)db=await api('/d1/database','POST',{name:databaseName});
  if(db.uuid==='4c30c9ab-0c53-4b8a-865a-7c9078d48c2f')throw Error('Refusing production database.');
  const admin=crypto.randomBytes(32).toString('base64url'),attemptSecret=crypto.randomBytes(40).toString('base64url');
  console.log(`::add-mask::${admin}`);console.log(`::add-mask::${attemptSecret}`);
  const current=await api(`/pages/projects/${project}`);
  await api(`/pages/projects/${project}`,'PATCH',{deployment_configs:{preview:{env_vars:{
    ADMIN_PASSWORD:{type:'secret_text',value:admin},ATTEMPT_ID_SECRET:{type:'secret_text',value:attemptSecret}},
    wrangler_config_hash:current.deployment_configs.preview.wrangler_config_hash}}});
  const file='wrangler.toml',config=fs.readFileSync(file,'utf8');
  fs.writeFileSync(file,config.replace(/(\[\[env\.preview\.d1_databases\]\][\s\S]*?database_id = ")[^"]+/,`$1${db.uuid}`));
  fs.appendFileSync(process.env.GITHUB_ENV,`STORY_PREVIEW_DB_ID=${db.uuid}\nSTORY_PREVIEW_ADMIN_PASSWORD=${admin}\n`);
  fs.mkdirSync('output/story',{recursive:true});fs.writeFileSync('output/story/cloudflare-preview.json',JSON.stringify({databaseName,databaseId:db.uuid,project},null,2));
  console.log('Isolated preview D1 and independent preview credentials configured.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
