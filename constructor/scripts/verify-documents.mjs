import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {Store} from '../server/store.mjs';
import {Service} from '../server/service.mjs';
import {Documents} from '../server/documents.mjs';
import {starterTemplates} from '../shared/catalog.js';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'constructor-document-proof-')),store=new Store(root),documents=new Documents(new Service(store),path.resolve('public'));
const output=path.resolve(process.env.CONSTRUCTOR_EVIDENCE||'artifacts/documents');fs.mkdirSync(output,{recursive:true});
try{
 const checks=[];
 for(const [i,original]of starterTemplates().entries())for(const portrait of [false,true])for(const longName of [false,true]){
  const template=structuredClone(original);
  if(portrait){const sx=210/297,sy=297/210;template.width=210;template.height=297;template.backgroundImage=template.backgroundVariants.portrait;template.elements=template.elements.map(e=>({...e,x:e.x*sx,y:e.y*sy,width:e.width*sx,height:e.height*sy}));}
  const fields={fullName:longName?'Александра-Екатерина Константиновна Примерова-Испытательная':'Иванов Иван Иванович',event:'Междисциплинарная олимпиада «Знания и профессиональные решения»',degree:'I степени',institution:'Образовательная организация',mentorName:'Учебный наставник',nomination:'Профессиональное мастерство',issuer:'Организационный комитет',date:'30.10.2026',number:'ОБРАЗЕЦ-000001',score:150,maxScore:150,place:1,order:'Учебный образец'};
  const bytes=await documents.render(template,fields),pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),1);const name=`${String(i+1).padStart(2,'0')}-${portrait?'portrait':'landscape'}-${longName?'long':'short'}`;
  fs.writeFileSync(path.join(output,name+'.pdf'),bytes);
  if(longName){const result=spawnSync('pdftoppm',['-png','-singlefile','-scale-to','1100',path.join(output,name+'.pdf'),path.join(output,name)],{encoding:'utf8',windowsHide:true});if(result.status)throw new Error('Не удалось отрендерить окончательный PDF: '+result.stderr);}
  checks.push({name,pages:1,width:template.width,height:template.height});
 }
 fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({passed:true,checks},null,2));console.log(JSON.stringify({passed:true,pdfs:checks.length,renderedPngs:24,output},null,2));
}finally{await documents.close();store.close();fs.rmSync(root,{recursive:true,force:true});}
