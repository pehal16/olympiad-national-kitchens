(function (root) {
  'use strict';
  const drafts = new Map(), seen = new Set();
  function create(options) {
    const { mount, question, attemptId, submitButton, onChange, onPhase } = options;
    const doc = mount.ownerDocument, win = doc.defaultView, model = root.T5PhotoModel, dish = question.selectedDish;
    const scope = `${attemptId}:photo4:${question.id}:${dish.id}`, introKey = `${attemptId}:photo4:intro`;
    const listeners = new AbortController(), photos = new Map(), controls = [], cards = new Map();
    let locked = false, disposed = false, revision = 0, storageFailed = false;
    const read = key => { try { return JSON.parse(win.localStorage.getItem(key)); } catch { return null; } };
    const write = (key, value) => { drafts.set(key, value); try { win.localStorage.setItem(key, JSON.stringify(value)); } catch { storageFailed = true; } };
    const stored = read(scope) || drafts.get(scope), incoming = question.savedAnswer || stored;
    let selected = new Set();
    try { if (incoming?.dishId === dish.id) selected = new Set(model.selection(dish, incoming.selectedIngredientIds || []).map(item => item.id)); } catch { /* Ignore malformed local drafts. */ }
    const route = model.recipeStages(dish);
    let stage = selected.size === 4 && route.includes(stored?.stage) && Array.isArray(stored?.selectedIngredientIds) && model.key(stored.selectedIngredientIds) === model.key([...selected]) ? stored.stage : 'select';
    let layout = 'balanced';
    let started = options.inlineIntro || question.sequenceInTour !== 1 || seen.has(introKey) || read(introKey) === true;
    const el = (tag, className, text) => { const node = doc.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
    const on = (target, event, fn) => target.addEventListener(event, fn, { signal: listeners.signal });
    const button = (text, className, fn) => { const node = el('button', className, text); node.type = 'button'; if (fn) on(node, 'click', fn); controls.push(node); return node; };
    const shell = el('section', 't5-kitchen t5-photo-kitchen'); mount.append(shell);
    const placeholder = doc.createComment('Shared submission position'); submitButton.before(placeholder);
    const originalText = submitButton.textContent;
    const intro = el('section','t5-photo-intro'), workbench = el('section','t5-photo-workbench');
    intro.append(el('div','t5-photo-eyebrow','Тур 5 · Финальная кухня'),el('h3','','Три блюда. Ваша сборка.'),el('p','t5-photo-lead','«Маргарита» → греческий салат → «Филадельфия»'));
    const rules = el('ul','t5-photo-rules');
    ['Для каждого блюда выберите 4 компонента из 8 и выполните сборку.','Правильный компонент — 4 балла. Максимум — 16 за блюдо и 48 за тур. Порядок выбора продуктов не влияет на баллы.','Состав можно менять до нажатия «Подать». После подачи переходите к следующему блюду.','Соевый соус, имбирь и васаби сопровождают подачу роллов. Их выбирать не нужно, на баллы они не влияют.','На тур отведено 15 минут. Таймер уже идёт.'].forEach(text => rules.append(el('li','',text)));
    intro.append(rules,button('Перейти к сборке','t5-photo-primary',()=>{ if(locked)return; started=true;seen.add(introKey);write(introKey,true);update();cards.values().next().value?.focus(); }));
    const head = el('header','t5-photo-heading'), heading = el('div');
    heading.append(el('div','t5-photo-eyebrow',`Блюдо ${question.station.number} из 3 · ${dish.cuisineLabel}`),el('h3','',dish.title),el('p','t5-photo-version',dish.variantLabel));
    const count = el('span','t5-photo-count');count.setAttribute('aria-live','polite'); head.append(heading,count);workbench.append(head);
    const compose = el('div','t5-photo-compose'), pantry = el('section','t5-photo-pantry'), panel = el('section','t5-photo-panel');
    const pantryHead = el('div','t5-photo-section-heading');pantryHead.append(el('h4','','01 · Выберите продукты'),button('Очистить','t5-photo-text-button',()=>{ if(locked)return;selected.clear();stage='select';changed(); }));
    const grid = el('div','t5-photo-grid'); pantry.append(pantryHead,el('p','t5-photo-small','Нажмите на карточку или перетащите продукт в область сборки.'),grid);
    panel.append(el('h4','t5-photo-section-heading','02 · Соберите блюдо'));
    const scene = el('div','t5-photo-scene'), layers = el('div','t5-photo-layers');scene.setAttribute('aria-label','Визуальная сборка выбранного состава');scene.append(layers);
    const mediaNotice = el('div','t5-photo-media-notice');mediaNotice.hidden=true;mediaNotice.append(el('span','','Изображение не загрузилось. Можно продолжить сборку.'),button('Повторить','t5-photo-text-button',()=>{photos.clear();grid.querySelectorAll('img[hidden]').forEach(image=>{image.hidden=false;const url=image.src;image.removeAttribute('src');image.src=url;});render();}));
    const list = el('div','t5-photo-selected');list.setAttribute('aria-label','Выбранные компоненты');
    const stepbar = el('ol','t5-photo-steps');stepbar.setAttribute('aria-label','Шаги сборки');
    const steps = route.map((value,index)=>{const node=el('li','',String(index+1));node.dataset.stage=value;stepbar.append(node);return node;});
    const operation = el('div','t5-photo-operation'), operationLabel = el('span','t5-photo-small'), next = button('','t5-photo-primary',()=>{if(locked || selected.size!==4 || stage==='served')return;stage=model.nextStage(dish,selected,stage);changed();});
    const edit = button('Изменить состав','t5-photo-text-button',()=>{if(locked)return;stage='select';changed();cards.values().next().value?.focus();});
    operation.append(operationLabel,next);
    panel.append(scene,mediaNotice,list,stepbar,operation,edit);
    compose.append(pantry,panel);workbench.append(compose);
    const footer=el('div','t5-photo-footer'), draftNotice=el('p','t5-photo-small');draftNotice.hidden=true;footer.append(draftNotice,submitButton);workbench.append(footer);submitButton.textContent='Подать';
    shell.append(intro,workbench);
    const answer = () => ({dishId:dish.id,selectedIngredientIds:[...selected]});
    function persist(){write(scope,{...answer(),stage,layout});draftNotice.hidden=!storageFailed;draftNotice.textContent='Черновик сохраняется до закрытия этой страницы.';}
    function update(){
      intro.hidden=started;workbench.hidden=!started;onPhase?.(started?'assembly':'intro');
      count.textContent=`Выбрано ${selected.size} из 4`;scene.dataset.stage=stage;scene.dataset.layout=layout;
      for(const [id,card] of cards){const picked=selected.has(id);card.classList.toggle('is-selected',picked);card.setAttribute('aria-pressed',String(picked));card.disabled=locked || (selected.size===4&&!picked);card.draggable=!card.disabled;card.querySelector('small').textContent=picked?'Выбрано':'Добавить';}
      list.replaceChildren();for(const item of model.selection(dish,selected)){const chip=el('button','t5-photo-chip',item.text+' ×');chip.type='button';chip.dataset.remove=item.id;chip.disabled=locked;chip.setAttribute('aria-label','Убрать: '+item.text);list.append(chip);}
      steps.forEach((node,index)=>{const current=index===route.indexOf(stage);node.classList.toggle('is-done',index<route.indexOf(stage));if(current)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');});
      const ready=selected.size===4;next.hidden=stage==='served';next.disabled=locked||!ready;next.textContent=stage==='served'?'':ready?model.operations[dish.photo.kind][route.indexOf(stage)]:'Выберите 4 продукта';
      operationLabel.textContent=!ready?'Выбор компонентов':stage==='served'?'Сборка завершена':`Шаг ${route.indexOf(stage)+1} из ${route.length-1}`;
      edit.hidden=stage==='select';
      controls.forEach(control=>{if(control!==next)control.disabled=locked;});
      submitButton.hidden=!started;submitButton.disabled=locked||!ready||stage!=='served';
    }
    function decode(url){
      if(!photos.has(url)){const photo=new win.Image();photo.src=url;const pending=photo.decode().then(()=>photo).catch(error=>{photos.delete(url);throw error;});photos.set(url,pending);if(photos.size>24)photos.delete(photos.keys().next().value);}
      return photos.get(url);
    }
    async function render(){
      const current=++revision,plan=model.plan(dish,selected,stage,layout);scene.dataset.composition=plan.key;scene.dataset.phase=plan.phase;scene.dataset.status=plan.layers.length?'loading':'empty';
      layers.classList.toggle('is-tray',['mise','empty'].includes(plan.phase));layers.style.transform=`rotate(${plan.angle}deg) scale(${plan.angle?.94:1})`;layers.replaceChildren();mediaNotice.hidden=true;
      if(!plan.layers.length){layers.append(el('p','t5-photo-empty','Выберите продукты для вашей сборки'));return;}
      const results=await Promise.allSettled(plan.layers.map(layer=>decode(layer.path)));
      if(disposed||current!==revision)return;
      let failed=false;
      results.forEach((result,index)=>{
        const layer=plan.layers[index];
        if(result.status!=='fulfilled'){failed=true;if(layer.kind==='tray')layers.append(el('p','t5-photo-empty',layer.alt));return;}
        const photo=result.value.cloneNode();photo.alt=layer.alt;photo.draggable=false;photo.className='t5-photo-'+layer.kind;
        if(layer.id)photo.dataset.product=layer.id;
        if(layer.kind==='tray'){const figure=el('figure');figure.append(photo,el('figcaption','',layer.alt));layers.append(figure);}
        else{if(layer.scale)photo.style.transform=`translate(-50%, -50%) rotate(${layer.angle||0}deg) scale(${layer.scale})`;if(layer.top)photo.style.top=layer.top+'%';if(layer.opacity)photo.style.opacity=layer.opacity;layers.append(photo);}
      });
      scene.dataset.status=failed?'error':'ready';mediaNotice.hidden=!failed;
      if(failed&&!layers.childElementCount)layers.append(el('p','t5-photo-empty','Ваш состав: '+model.selection(dish,selected).map(item=>item.text).join(', ')));
      if(selected.size===4&&stage!=='served')model.plan(dish,selected,model.nextStage(dish,selected,stage),layout).layers.forEach(layer=>decode(layer.path).catch(()=>{}));
    }
    function changed(){persist();update();render();onChange?.(answer());}
    for(const item of dish.items){
      const card=el('button','t5-photo-card');card.type='button';on(card,'click',()=>{if(locked)return;if(selected.has(item.id))selected.delete(item.id);else if(selected.size<4)selected.add(item.id);stage='select';changed();});card.dataset.ingredient=item.id;card.setAttribute('aria-pressed','false');
      const photo=el('img');photo.src=item.imageUrl;photo.alt='';photo.draggable=false;photo.loading='eager';photo.decoding='async';
      on(photo,'error',()=>{photo.hidden=true;});card.append(photo,el('span','',item.text),el('small','','Добавить'));cards.set(item.id,card);grid.append(card);
      on(card,'dragstart',event=>{if(locked||card.disabled){event.preventDefault();return;}event.dataTransfer.setData('application/x-t5-photo-product',item.id);event.dataTransfer.effectAllowed='copy';scene.classList.add('is-over');});
      on(card,'dragend',()=>scene.classList.remove('is-over'));
    }
    on(list,'click',event=>{const chip=event.target.closest('[data-remove]');if(!chip||locked)return;selected.delete(chip.dataset.remove);stage='select';changed();cards.get(chip.dataset.remove)?.focus();});
    on(scene,'dragover',event=>{if(locked||!event.dataTransfer.types.includes('application/x-t5-photo-product'))return;event.preventDefault();event.dataTransfer.dropEffect='copy';});
    on(scene,'drop',event=>{scene.classList.remove('is-over');if(locked)return;const id=event.dataTransfer.getData('application/x-t5-photo-product');if(!cards.has(id)||selected.has(id)||selected.size>=4)return;event.preventDefault();selected.add(id);stage='select';changed();});
    update();render();onChange?.(answer());
    return {getAnswer:answer,isComplete:()=>started&&selected.size===4&&stage==='served',isFinalKitchen:true,
      setLocked(value){locked=Boolean(value);update();},
      dispose(){disposed=true;revision++;listeners.abort();photos.clear();placeholder.replaceWith(submitButton);submitButton.hidden=false;submitButton.textContent=originalText;shell.remove();onPhase?.('disposed');}};
  }
  root.T5PhotoKitchen={create};
})(typeof window!=='undefined'?window:globalThis);
