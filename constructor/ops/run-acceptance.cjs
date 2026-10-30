const fs=require('node:fs'),path=require('node:path');
const [kind,file,base,report]=process.argv.slice(2),access=JSON.parse(fs.readFileSync(file,'utf8'));
if(!['load','verify'].includes(kind))throw new Error('Неизвестная проверка');
process.env.CONSTRUCTOR_ACCEPTANCE_BASE=base;
process.env.CONSTRUCTOR_ACCEPTANCE_LOGIN=access.login;
process.env.CONSTRUCTOR_ACCEPTANCE_PASSWORD=access.password;
process.env.CONSTRUCTOR_REPORT=report;
process.env.CONSTRUCTOR_EVIDENCE=path.join(path.dirname(report),'browser-evidence');
require(path.resolve('dist',kind+'.cjs'));
