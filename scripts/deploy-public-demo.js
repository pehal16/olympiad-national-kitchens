"use strict";
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
// Pages insists on a canonical wrangler.toml filename. Keep the main project's
// configuration untouched, and put only the demo config in a disposable cwd.
const root=path.resolve(__dirname,'..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'olympiad-demo-deploy-'));
const file=path.join(temporary,'wrangler.toml'),forward=p=>p.replaceAll('\\','/');
try{
 const source=fs.readFileSync(path.join(root,'wrangler.demo.toml'),'utf8');
 if(!source.includes('name = "olympiad-gkts-demo"')||!source.includes('OLYMPIAD_DEMO_MODE = "true"'))throw Error('Unexpected demo deployment configuration');
 const config=source.replace('pages_build_output_dir = "dist-cloudflare"','pages_build_output_dir = '+JSON.stringify(forward(path.join(root,'dist-cloudflare'))))
  .replace('migrations_dir = "migrations"','migrations_dir = '+JSON.stringify(forward(path.join(root,'migrations'))));
 fs.writeFileSync(file,config);
 if(process.argv.includes('--check-config'))console.log('Canonical temporary Pages config is ready; main configuration untouched.');
 else{
  if(config.includes('00000000-0000-0000-0000-000000000000'))throw Error('Provision the isolated demonstration database before deployment');
  const args=[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'pages','deploy',path.join(root,'dist-cloudflare'),'--project-name','olympiad-gkts-demo','--branch','main','--commit-dirty=true'];
  if(/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA||''))args.push('--commit-hash',process.env.GITHUB_SHA);
  execFileSync(process.execPath,args,{cwd:temporary,stdio:'inherit'});
 }
}finally{if(fs.existsSync(file))fs.unlinkSync(file);fs.rmdirSync(temporary);}
