const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
(async()=>{
 const [base,data,deliveryKey]=process.argv.slice(2),file=path.join(data,'owner-access.private.json');
 const status=await fetch(base+'/api/constructor/v1/status').then(r=>r.json());
 if(status.data.setupRequired){
   const setupCode=fs.readFileSync(path.join(data,'Первый вход.txt'),'utf8').split(': ')[1].split('\n')[0];
   const body={login:'owner',name:'Владелец платформы',password:crypto.randomBytes(30).toString('base64url'),setupCode};
   const response=await fetch(base+'/api/constructor/v1/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(!response.ok)throw new Error('Первичная настройка отклонена.');
   fs.writeFileSync(file,JSON.stringify({base,login:body.login,password:body.password}),{mode:0o600});
 }
 if(deliveryKey&&fs.existsSync(file)){
   const bytes=crypto.publicEncrypt({key:fs.readFileSync(deliveryKey),oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},fs.readFileSync(file));
   fs.writeFileSync(path.join(data,'owner-access.encrypted'),bytes,{mode:0o600});
 }
 console.log('Владелец настроен; данные доступа сохранены в закрытой папке установки.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
