"use strict";
const fs = require('node:fs'), path = require('node:path');
const { createNetworkFetch } = require('./lib/desktop-network-fetch');
const { openMirror, syncOnce, writeStatus } = require('./lib/desktop-mirror-store');
const directory = path.join(process.env.LOCALAPPDATA, 'GKTSOlympiadTrial/v1/cloud-mirror');
async function main() {
  const hostingFile = path.join(process.env.LOCALAPPDATA, 'GKTSOlympiadTrial/v1/hosting-settings.json');
  if (fs.existsSync(hostingFile) && JSON.parse(fs.readFileSync(hostingFile,'utf8')).storageMode === 'desktop-primary') {
    return require('./lib/desktop-primary-backup').main();
  }
  const privateKey = fs.readFileSync(path.join(directory,'identity-private.pem'),'utf8');
  const database = openMirror(directory), fetcher = createNetworkFetch();
  let status = {}; try { status = JSON.parse(fs.readFileSync(path.join(directory,'status.json'))); } catch {}
  const once = process.argv.includes('--once');
  try {
    do {
      try {
        writeStatus(directory,{...status,state:'syncing',checkedAt:new Date().toISOString()});
        status = await syncOnce({ database,directory,privateKey,fetcher,previous:status });
        console.log(JSON.stringify({ state:status.state,counts:status.counts,changed:status.changed,transport:status.transport,lastSuccessAt:status.lastSuccessAt }));
      } catch (error) {
        status = { ...status,state:'offline',checkedAt:new Date().toISOString(),lastError:/^Mirror HTTP \d+$/.test(error.message)?error.message:'Network or local copy unavailable; retry pending.' };
        writeStatus(directory,status); console.log(JSON.stringify({state:status.state,lastSuccessAt:status.lastSuccessAt || null}));
        if(once)process.exitCode=1;
      }
      if(!once)await new Promise(resolve=>setTimeout(resolve,15000));
    } while(!once);
  } finally { fetcher.close(); database.close(); }
}
if(require.main===module)main().catch(()=>{console.error('Mirror agent stopped. Check private configuration and disk availability.');process.exitCode=1;});
