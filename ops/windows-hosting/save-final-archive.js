"use strict";
const fs=require('node:fs'),path=require('node:path');
const state=path.join(process.env.LOCALAPPDATA,'GKTSOlympiadTrial/v1');
const configuration=JSON.parse(fs.readFileSync(path.join(state,'final-archive-settings.json'),'utf8'));
require('./lib/final-archive').saveFinalArchive({stateDirectory:state,localDirectory:configuration.localDirectory,cloudDirectory:configuration.cloudDirectory,stage:process.argv.find(v=>v.startsWith('--stage='))?.slice(8)||'manual'})
 .then(receipt=>console.log(JSON.stringify(receipt))).catch(error=>{console.error(error.message);process.exitCode=1;});
