const neutral = url => /^\/assets\/olympiad\/tour5\/photo-v4\/[a-f0-9]{24}\.webp$/.test(url || '');
function combinations(items,count,start=0,prefix=[],out=[]){if(!count){out.push(prefix);return out;}for(let i=start;i<=items.length-count;i++)combinations(items,count-1,i+1,[...prefix,items[i]],out);return out;}
function validatePhotoQuestion(question) {
  const fail=()=>{throw new Error('Нарушен контракт фотографической финальной кухни.');};
  const kind=['pizza','greek','roll'][question.station?.number-1],dish=question.dishes?.[0];
  if(question.presentationVersion!==4||question.maxScore!==16||question.dishes?.length!==1||!question.station?.title?.trim()||dish?.photo?.kind!==kind)fail();
  const items=dish.items||[],ids=new Set(items.map(item=>item.id)),tokens=new Set(items.map(item=>item.visual?.token));
  if(!dish.title?.trim()||!dish.cuisineLabel?.trim()||!dish.variantLabel?.trim()||items.length!==8||ids.size!==8||tokens.size!==8||dish.correctIngredientIds?.length!==4||new Set(dish.correctIngredientIds).size!==4||!dish.correctIngredientIds.every(id=>ids.has(id)))fail();
  const roles={pizza:['basis','sauce','top'],greek:['base','top','dressing'],roll:['basis','filling','cover']}[kind];
  if(items.some(item=>!item.text?.trim()||!item.imageAlt?.trim()||!neutral(item.imageUrl)||!neutral(item.layerImageUrl)||!roles.includes(item.visual?.role)||!/^[a-f0-9]{16}$/.test(item.visual.token)||!Number.isInteger(item.visual.order)||item.visual.order<0||item.visual.order>7||!Number.isFinite(item.visual.scale)||item.visual.scale<=0||item.visual.scale>1||item.visual.role==='cover'&&!Number.isInteger(item.visual.priority)))fail();
  if(new Set(items.map(item=>item.visual.order)).size!==8)fail();
  const basis=items.filter(item=>item.visual.role==='basis');if(kind!=='greek'&&basis.length!==1)fail();
  const requiredFrames={pizza:['shaped','oil'],greek:['bowl'],roll:['rice','flipped','rolled',...items.filter(item=>item.visual.role==='cover').map(item=>item.visual.token)]}[kind];
  if(!dish.photo.frames||Object.keys(dish.photo.frames).length!==requiredFrames.length||requiredFrames.some(key=>!neutral(dish.photo.frames[key])))fail();
  const expected=combinations(items,4).filter(set=>kind==='greek'||set.includes(basis[0])).map(set=>set.map(item=>item.visual.token).sort().join('+'));
  const finals=dish.photo.finals||[];if(finals.length!==expected.length||new Set(finals.map(entry=>entry.key)).size!==expected.length||finals.some(entry=>!expected.includes(entry.key)||!neutral(entry.imageUrl)))fail();
}
function sanitizePhotoDish(dish) {
  return {id:dish.id,title:dish.title,cuisineLabel:dish.cuisineLabel,variantLabel:dish.variantLabel,
    items:dish.items.map(item=>({id:item.id,text:item.text,imageAlt:item.imageAlt,imageUrl:item.imageUrl,layerImageUrl:item.layerImageUrl,visual:Object.fromEntries(['token','role','scale','order','priority'].filter(key=>item.visual[key]!==undefined).map(key=>[key,item.visual[key]]))})),
    photo:{kind:dish.photo.kind,frames:{...dish.photo.frames},finals:dish.photo.finals.map(({key,imageUrl})=>({key,imageUrl})).sort((a,b)=>a.key.localeCompare(b.key))}};
}
module.exports={validatePhotoQuestion,sanitizePhotoDish,neutral};
