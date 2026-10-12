"use strict";
const {execFileSync}=require('node:child_process'),fs=require('node:fs');
const output=execFileSync('node',['node_modules/wrangler/bin/wrangler.js','pages','deploy','dist-cloudflare','--project-name','olympiad-gkts','--branch','restaurant-story-qa','--commit-dirty=true'],{encoding:'utf8',stdio:['ignore','pipe','inherit']});
const urls=output.match(/https:\/\/[a-z0-9-]+\.olympiad-gkts\.pages\.dev/g)||[];
if(!urls.length)throw Error('Preview deployment URL missing.');
const deploymentUrl=urls[0],alias='https://restaurant-story-qa.olympiad-gkts.pages.dev';
async function inspect(){
 const headers={Authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`},base=`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/olympiad-gkts`;
 const response=await fetch(base,{headers}),data=await response.json();if(!data.success)throw Error('Preview configuration inspection failed');
 const vars=data.result.deployment_configs.preview.env_vars||{};console.log('Preview secret binding types:',JSON.stringify(Object.fromEntries(['ADMIN_PASSWORD','ATTEMPT_ID_SECRET'].map(key=>[key,vars[key]?.type||'missing']))));
 const list=await fetch(base+'/deployments?env=preview&per_page=20',{headers}),deployments=await list.json();
 if(!deployments.success)throw Error('Preview deployment inspection failed');
 const deployed=deployments.result.find(d=>d.url===deploymentUrl);
 if(!deployed||deployed.environment!=='preview'||!(deployed.aliases||[]).some(value=>String(value).replace(/^https:\/\//,'').replace(/\/$/,'')===new URL(alias).hostname))throw Error('Dedicated preview branch alias is not linked to the uploaded deployment.');
 fs.appendFileSync(process.env.GITHUB_ENV,`STORY_PREVIEW_URL=${alias}\n`);
 const p='output/story/cloudflare-preview.json',meta=JSON.parse(fs.readFileSync(p));Object.assign(meta,{url:alias,deploymentUrl,commit:process.env.GITHUB_SHA});fs.writeFileSync(p,JSON.stringify(meta,null,2));console.log(`Preview deployed: ${deploymentUrl}; rehearsal alias: ${alias}`);
}
inspect().catch(e=>{console.error(e.message);process.exitCode=1;});
