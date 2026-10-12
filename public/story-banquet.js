(function(root){
 'use strict';
 const doc=root.document;
 const element=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
 const dishCount=count=>`${count} ${count%100>=11&&count%100<=14?'блюд':count%10===1?'блюдо':count%10>=2&&count%10<=4?'блюда':'блюд'}`;
 function render(data,showPlate){
  const table=element('section','story-banquet');table.setAttribute('aria-label','Большой дегустационный стол: все заработанные блюда');
  const head=element('div','story-banquet-head'),guest=element('img','story-banquet-guest');
  guest.src='/assets/olympiad/story/v1/scenes/table-guest.webp';guest.alt='Гость за столом с вашим дегустационным меню';guest.decoding='async';guest.addEventListener('error',()=>guest.hidden=true);
  const welcome=element('div','story-banquet-welcome');welcome.append(element('span','story-banquet-eyebrow','Вечер вкусов'),element('h2','',data.plates.length?'Ваше меню собрано':'Спасибо за этот вечер'),element('p','',data.plates.length?`В вашем меню — ${dishCount(data.plates.length)}. Все заработанные подачи на одном столе. Нажмите на блюдо, чтобы открыть его крупнее.`:'Заработанных подач пока нет. Баллы сохранены в вашем свидетельстве.'));
  head.append(guest,welcome);table.append(head);
  const surface=element('div','story-banquet-surface');surface.style.setProperty('--banquet-columns',String(Math.max(1,Math.min(8,data.plates.length))));
  for(const plate of data.plates){
   const seat=element('button','story-serving story-banquet-serving');seat.type='button';seat.setAttribute('aria-label',plate.title);
   const image=element('img','story-serving-image');image.alt=plate.imageAlt||plate.title;image.decoding='async';image.loading='eager';
   if(root.RestaurantMedia)root.RestaurantMedia.setImage(image,plate.imageUrl,'card');else image.src=plate.imageUrl;
   image.addEventListener('error',()=>{image.hidden=true;seat.classList.add('is-photo-missing');});
   image.addEventListener('load',()=>seat.classList.remove('is-photo-missing'));
   seat.append(image,element('span','',plate.title));seat.addEventListener('click',()=>showPlate(plate,seat));surface.append(seat);
  }
  if(!data.plates.length)surface.append(element('p','story-banquet-empty','Каждая следующая история — новая возможность научиться.'));
  table.append(surface);return table;
 }
 root.StoryBanquet={render};
})(window);
