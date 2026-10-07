const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const registry=require('../docs/restaurant-display-assets.json'),atlas=require('../public/restaurant-atlas');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
test('display exports are complete, proportionate and linked to unchanged originals',()=>{
  const groups=new Map();
  for(const entry of registry.exports){
    const source=fs.readFileSync(path.join(__dirname,'../public',entry.sourceUrl));
    const output=fs.readFileSync(path.join(__dirname,'../public',entry.url));
    assert.equal(hash(source),entry.sourceSha256,entry.sourceUrl);
    assert.equal(hash(output),entry.sha256,entry.url);assert.equal(output.length,entry.bytes);
    assert.ok(entry.size[0]<=entry.sourceSize[0]&&entry.size[1]<=entry.sourceSize[1]);
    assert.ok(Math.abs(entry.size[0]/entry.size[1]-entry.sourceSize[0]/entry.sourceSize[1])<.012,'no stretching');
    assert.ok(Math.max(...entry.size)<=(entry.role==='card'?400:800));
    const roles=groups.get(entry.sourceUrl)||new Set();roles.add(entry.role);groups.set(entry.sourceUrl,roles);
  }
  assert.equal(groups.size,registry.sources);for(const roles of groups.values())assert.deepEqual([...roles].sort(),['card','preview']);
  assert.ok(registry.exports.filter(e=>e.role==='card').reduce((s,e)=>s+e.bytes,0)<registry.sourceBytes*.1,'card transfer budget');
});
test('all issued map countries have geographical locations and separate accessible labels',()=>{
  for(const question of require('../data/banks/tour2')){
    for(const country of question.buckets){const [x,y]=atlas.coordinates(country);assert.ok(x>=0&&x<=1000&&y>=0&&y<=500);assert.notDeepEqual([x,y],[500,250],country.label);}
    for(const tall of [false,true]){const view=atlas.layout(question.buckets,tall);assert.equal(new Set(view.map(v=>v.label.join(','))).size,4);}
  }
  assert.ok(atlas.coordinates({flagUrl:'/flags/us.svg'})[0]<300);
  assert.ok(atlas.coordinates({flagUrl:'/flags/jp.svg'})[0]>800);
});
