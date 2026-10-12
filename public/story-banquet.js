(function(root){
 'use strict';
 const doc=root.document;
 const element=(tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls||'';if(text!==undefined)node.textContent=text;return node;};
 // Two photographic views of one table: a compact supper and a long banquet.
 // Only earned dishes enter either view; these coordinates never affect grading.
 function placements(plates){
  const count=plates.length;
  if(count<=3)return plates.map((plate,index)=>({x:count===1?.40:count===2?.30+index*.36:.22+index*.31,y:count===1?.77:.82,width:count===1?.34:count===2?.33:[.32,.27,.34][index],depth:100+index}));
  const result=count<=8?[{x:.22,y:.82,width:.32,depth:100},{x:.53,y:.82,width:.27,depth:101},{x:.83,y:.82,width:.33,depth:102}]:[{x:.12,y:.81,width:.15,depth:100},{x:.265,y:.82,width:.115,depth:101},{x:.40,y:.82,width:.16,depth:102}];
  const rest=count-3;
  if(count<=8){
   for(let index=3;index<count;index++)result.push({x:.18+(index-3)*.167,y:.63+(index%2)*.006,width:.19,depth:index});
   return result;
  }
  const columns=Math.min(10,Math.ceil(rest/(rest<=24?3:5))),rows=Math.ceil(rest/columns);
  for(let index=3;index<count;index++){
   const slot=index-3,column=Math.floor(slot/rows),row=slot%rows;
   const seed=Math.abs(Array.from(plates[index].dishId||plates[index].title).reduce((sum,char)=>(sum*31+char.charCodeAt(0))|0,0));
   const u=.34+(columns===1?0:column/(columns-1))*.60+[0,.012,-.008,.009,-.012][row%5],v=.12+(rows===1?.38:row/(rows-1)*.75);
   const width=rest<=24?.072-u*.022:.051-u*.017;
   result.push({x:.17+.79*u+v*(.19-.33*u)+((seed%5)-2)*.002,y:.63-.28*u+v*(.35-.07*u)+((seed%3)-1)*.004,width:width*(.94+(seed%3)*.04),depth:row*10+column});
  }
  return result;
 }
 const tablePhotos={
  '/assets/olympiad/tour5/service/plates/pizza-served-v3.webp':'margherita',
  '/assets/olympiad/tour5/service/plates/greek-served-v3.webp':'greek',
  '/assets/olympiad/tour5/service/plates/roll-served-v3.webp':'philadelphia'
 };
 function render(data,showPlate){
  const table=element('section','story-banquet');table.setAttribute('aria-label','Ресторанный стол со всеми заработанными блюдами');
  table.append(element('h2','story-banquet-heading',data.plates.length?'Ваш стол':'Спасибо за этот вечер'));
  const viewport=element('div','story-banquet-viewport');viewport.tabIndex=0;viewport.setAttribute('aria-label','Стол. После приближения прокручивайте его, чтобы рассмотреть подачи');
  const surface=element('div','story-banquet-surface'),scene=element('img','story-banquet-scene');
  const panoramic=data.plates.length>8;table.classList.toggle('is-panoramic',panoramic);
  scene.src='/assets/olympiad/story/v5/scenes/banquet-'+(panoramic?'panorama':'natural')+'.webp';scene.alt='Гость в ресторане за настоящим деревянным столом';scene.decoding='async';
  scene.addEventListener('error',()=>{scene.hidden=true;viewport.classList.add('is-scene-missing');});surface.append(scene);
  const positions=placements(data.plates);
  data.plates.forEach((plate,index)=>{
   const position=positions[index],seat=element('button','story-serving story-banquet-serving');seat.type='button';seat.setAttribute('aria-label',plate.title);seat.dataset.title=plate.title;
   seat.style.left=position.x*100+'%';seat.style.top=position.y*100+'%';seat.style.width=position.width*100+'%';seat.style.zIndex=String(position.depth+1);
   const image=element('img','story-serving-image');image.alt=plate.imageAlt||plate.title;image.decoding='async';image.loading='eager';
   const matchedPhoto=tablePhotos[plate.imageUrl];
   if(matchedPhoto){image.src='/assets/olympiad/story/v5/plates/'+matchedPhoto+'.webp';image.addEventListener('error',()=>{image.src=plate.imageUrl;},{once:true});}
   else if(root.RestaurantMedia)root.RestaurantMedia.setImage(image,plate.imageUrl,'card');else image.src=plate.imageUrl;
   image.addEventListener('error',()=>{image.hidden=true;seat.classList.add('is-photo-missing');});
   image.addEventListener('load',()=>{image.hidden=false;seat.classList.remove('is-photo-missing');});
   const hit=element('div','story-dish-hit');hit.setAttribute('aria-hidden','true');
   seat.append(image,hit,element('span','',plate.title));seat.addEventListener('click',()=>showPlate(plate,seat));
   if(plate.country?.flagUrl){
    const pick=element('span','story-dish-flag'),wood=element('img','story-flag-pick'),flag=element('img','story-flag-print');
    pick.setAttribute('aria-hidden','true');wood.src='/assets/olympiad/story/v5/scenes/flag-pick.webp';wood.alt='';flag.src=plate.country.flagUrl;flag.alt='';
    for(const accessory of[wood,flag]){accessory.decoding='async';accessory.addEventListener('error',()=>pick.hidden=true);}
    pick.append(wood,flag);seat.append(pick);seat.setAttribute('aria-label',plate.title+'. '+plate.country.name);
   }
   seat.addEventListener('focus',()=>{if(table.classList.contains('is-zoomed'))seat.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});});surface.append(seat);
  });
  viewport.append(surface);table.append(viewport);
  const controls=element('div','story-banquet-controls'),zoom=element('button','story-banquet-control','Приблизить стол');zoom.type='button';zoom.setAttribute('aria-pressed','false');
  let manualView=false;
  function setView(expanded,center){
   table.classList.toggle('is-zoomed',expanded);zoom.textContent=expanded?'Весь стол':'Приблизить стол';zoom.setAttribute('aria-pressed',String(expanded));
   if(expanded){viewport.scrollLeft=Math.max(0,surface.offsetWidth*(center?.5:.38)-viewport.clientWidth/2);viewport.scrollTop=center?Math.max(0,surface.offsetHeight*.58-viewport.clientHeight/2):0;}else{viewport.scrollLeft=0;viewport.scrollTop=0;}
  }
  zoom.addEventListener('click',()=>{manualView=true;setView(!table.classList.contains('is-zoomed'),true);});
  const list=element('button','story-banquet-control','Все подачи');list.type='button';list.addEventListener('click',()=>{const details=table.parentElement?.querySelector('.story-plate-list');if(details){details.open=true;details.scrollIntoView({block:'start',behavior:'instant'});details.querySelector('input')?.focus({preventScroll:true});}});
  controls.append(zoom,list);table.append(controls);
  if(!data.plates.length)table.append(element('p','story-banquet-empty','Заработанных подач пока нет. Баллы сохранены в вашем свидетельстве.'));
  if(root.ResizeObserver){const observer=new root.ResizeObserver(()=>{if(!table.isConnected){observer.disconnect();return;}if(!manualView)setView(root.matchMedia('(max-width:767px)').matches,false);});observer.observe(viewport);}
  return table;
 }
 root.StoryBanquet={render,layoutVersion:3};
})(window);
