(function(root){
 'use strict';
 const doc=root.document;
 const element=(tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls||'';if(text!==undefined)node.textContent=text;return node;};
 function render(){
  const scene=element('section','story-banquet');scene.setAttribute('aria-label','Ужин в ресторане');
  scene.append(element('h2','story-banquet-heading','Ужин в нашем ресторане'));
  const viewport=element('div','story-banquet-viewport');viewport.tabIndex=0;viewport.setAttribute('aria-label','Фотография ужина. После увеличения её можно прокручивать');
  const surface=element('div','story-banquet-surface'),photo=element('img','story-banquet-scene');
  photo.src='/assets/olympiad/story/v5/scenes/banquet-approved-no-flags.webp';photo.alt='Наш гость за деревянным столом в ресторане: пицца, салат, роллы и другие блюда для компании';photo.decoding='async';
  const fallback=element('p','story-banquet-fallback','Фото ужина не загрузилось. Ваше меню доступно ниже.');fallback.hidden=true;
  photo.addEventListener('error',()=>{photo.hidden=true;fallback.hidden=false;});surface.append(photo,fallback);viewport.append(surface);scene.append(viewport);
  scene.append(element('p','story-banquet-caption','Заработанные блюда — в вашем меню ниже.'));
  const controls=element('div','story-banquet-controls'),zoom=element('button','story-banquet-control','Увеличить фото');zoom.type='button';zoom.setAttribute('aria-pressed','false');
  zoom.addEventListener('click',()=>{const expanded=!scene.classList.contains('is-zoomed');scene.classList.toggle('is-zoomed',expanded);zoom.textContent=expanded?'Весь кадр':'Увеличить фото';zoom.setAttribute('aria-pressed',String(expanded));viewport.scrollLeft=0;viewport.scrollTop=0;});
  const menu=element('button','story-banquet-control','Ваше меню');menu.type='button';menu.addEventListener('click',()=>{const list=scene.parentElement?.querySelector('.story-plate-list');if(list){list.open=true;list.scrollIntoView({block:'start',behavior:'instant'});list.querySelector('input')?.focus({preventScroll:true});}});
  controls.append(zoom,menu);scene.append(controls);return scene;
 }
 root.StoryBanquet={render,layoutVersion:5};
})(window);
