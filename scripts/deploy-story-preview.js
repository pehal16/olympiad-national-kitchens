"use strict";
const {execFileSync}=require('node:child_process'),fs=require('node:fs');
const output=execFileSync('node',['node_modules/wrangler/bin/wrangler.js','pages','deploy','dist-cloudflare','--project-name','olympiad-gkts','--branch','restaurant-story-qa','--commit-dirty=true'],{encoding:'utf8',stdio:['ignore','pipe','inherit']});
const urls=output.match(/https:\/\/[a-z0-9-]+\.olympiad-gkts\.pages\.dev/g)||[];
if(!urls.length)throw Error('Preview deployment URL missing.');
const url=urls[0];fs.appendFileSync(process.env.GITHUB_ENV,`STORY_PREVIEW_URL=${url}\n`);
async function inspect(){const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/olympiad-gkts`,{headers:{Authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`}});const data=await response.json();if(!data.success)throw Error('Preview configuration inspection failed');const vars=data.result.deployment_configs.preview.env_vars||{};console.log('Preview secret binding types:',JSON.stringify(Object.fromEntries(['ADMIN_PASSWORD','ATTEMPT_ID_SECRET'].map(key=>[key,vars[key]?.type||'missing']))));}
inspect().catch(e=>{console.error(e.message);process.exitCode=1;});
const p='output/story/cloudflare-preview.json',meta=JSON.parse(fs.readFileSync(p));meta.url=url;meta.commit=process.env.GITHUB_SHA;fs.writeFileSync(p,JSON.stringify(meta,null,2));console.log(`Preview deployed: ${url}`);
