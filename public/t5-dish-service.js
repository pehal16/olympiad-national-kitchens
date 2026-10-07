(function (root) {
  'use strict';
  const seen = new Set();
  let current = null;
  function sync(attempt, onDismiss) {
    if (current && !current.node.isConnected) { current = null; root.document.body.classList.remove('t5-service-open','story-service-visible'); }
    if (attempt?.story?.decorationsDisabled) { current?.node.remove(); current = null; root.document.body.classList.remove('t5-service-open','story-service-visible'); return; }
    if (current && current.attemptId !== attempt?.id) {
      current.node.remove(); current = null; root.document.body.classList.remove('t5-service-open','story-service-visible');
    }
    const receipt = attempt?.dishService;
    if (!receipt || !['neutral', 'pleased', 'puzzled'].includes(receipt.mood)) return;
    const key = `nko_dish_service_v1_${attempt.id}_${receipt.questionId}`;
    let acknowledged = seen.has(key);
    try { acknowledged ||= root.localStorage.getItem(key) === 'seen'; } catch { /* Memory fallback. */ }
    if (acknowledged || current?.key === key) return;
    root.document.body.classList.toggle('story-service-visible',Boolean(attempt.story&&attempt.status==='in_progress'));
    current?.node.remove();
    const doc = root.document;
    const inline = Boolean(attempt.story && !attempt.story.decorationsDisabled);
    const el = (tag, className, text) => {
      const node = doc.createElement(tag); node.className = className || '';
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const node = el('section', inline ? 't5-service-inline' : 't5-service-overlay');
    node.setAttribute('role', inline ? 'region' : 'dialog'); if (!inline) node.setAttribute('aria-modal', 'true');
    node.setAttribute('aria-labelledby', 't5-service-title');
    node.dataset.mood = receipt.mood;
    const card = el('div', 't5-service-card');
    const scene = el('figure', 't5-service-scene is-loading');
    scene.setAttribute('aria-busy', 'true');
    scene.dataset.kind = receipt.kind || (receipt.number === 1 ? 'pizza' : receipt.number === 2 ? 'greek' : 'roll');
    const ns = 'http://www.w3.org/2000/svg';
    const svg = doc.createElementNS(ns, 'svg'), defs = doc.createElementNS(ns, 'defs');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.append(defs); scene.append(svg);
    if (scene.dataset.kind === 'roll') {
      const clip = doc.createElementNS(ns, 'clipPath');
      clip.id = 't5-service-roll-mask'; clip.setAttribute('clipPathUnits', 'objectBoundingBox');
      const ellipse = doc.createElementNS(ns, 'ellipse');
      for (const [name, value] of Object.entries({ cx: '.5', cy: '.50', rx: '.485', ry: '.285', transform: 'rotate(-24 .5 .5)' })) ellipse.setAttribute(name, value);
      clip.append(ellipse); defs.append(clip);
    }
    scene.setAttribute('aria-label', 'Ваше блюдо подано на стол перед гостем');
    const guest = el('img', 't5-service-guest');
    guest.src = receipt.mood === "neutral" ? "/assets/olympiad/story/v1/scenes/neutral.webp" : `/assets/olympiad/tour5/service/guest-table-${receipt.mood}-v2.webp`;
    guest.alt = receipt.mood === 'neutral' ? 'Гость спокойно принимает подачу перед собой' : receipt.mood === 'pleased' ? 'Гость смотрит на блюдо перед собой и улыбается' : 'Гость с недоумением смотрит на поданное блюдо';
    const missing = el('p', 't5-service-missing', 'Изображение подачи не загрузилось. Ответ сохранён.');
    missing.hidden = true;
    const failed = () => root.requestAnimationFrame(updateScene);
    function updateScene(){
      if(!scene.isConnected)return;
      const images=Array.from(scene.querySelectorAll('img'));
      const pending=images.some(image=>!image.complete),unavailable=images.some(image=>image.complete&&!image.naturalWidth);
      missing.hidden=!unavailable;scene.classList.toggle('is-missing',unavailable);
      scene.classList.toggle('is-loading',pending);scene.setAttribute('aria-busy',String(pending));
    }
    guest.addEventListener('error', failed);
    if (inline && receipt.mood === 'neutral') scene.append(root.RestaurantLayout.picture('service', 'restaurant-service-background', guest.alt), missing);
    else scene.append(guest, missing);
    const copy = el('div', 't5-service-copy');
    const title = el('h2', '', receipt.mood === 'neutral' ? 'Блюдо подано' : receipt.mood === 'pleased' ? 'Гость доволен' : 'Гость в недоумении');
    title.id = 't5-service-title';
    const caption = el('figcaption', 't5-service-caption');
    caption.append(el('p', 't5-service-eyebrow', `Блюдо ${receipt.number} · подано`), title);
    const plate = el('div', 't5-service-plate');
    plate.classList.toggle('is-tray', receipt.isTray === true);
    const serving = receipt.servingPhoto;
    const imageFor = photo => {
      const image = el('img'); if(inline&&root.RestaurantMedia)root.RestaurantMedia.setImage(image,photo.imageUrl);else image.src = photo.imageUrl; image.alt = photo.imageAlt;
      image.addEventListener('error', failed);
      return image;
    };
    if (serving) {
      plate.classList.add('is-native'); plate.append(imageFor(serving));
    } else if (scene.dataset.kind === 'pizza' && !receipt.isTray && receipt.photos?.length === 1) {
      // Slice the selected photograph itself. No replacement of wrong toppings.
      plate.classList.add('is-sliced');
      const ring = doc.createElementNS(ns, 'clipPath'), path = doc.createElementNS(ns, 'path');
      ring.id = 't5-service-pizza-rim'; ring.setAttribute('clipPathUnits', 'objectBoundingBox');
      path.setAttribute('d', 'M .5 .03 A .47 .47 0 1 1 .5 .97 A .47 .47 0 1 1 .5 .03 Z M .5 .065 A .435 .435 0 1 0 .5 .935 A .435 .435 0 1 0 .5 .065 Z');
      path.setAttribute('clip-rule', 'evenodd'); ring.append(path); defs.append(ring);
      const rim = imageFor(receipt.photos[0]); rim.className = 't5-service-pizza-rim'; rim.alt = ''; plate.append(rim);
      for (let index = 0; index < 8; index++) {
        const start = (-90 + index * 45 + .35) * Math.PI / 180;
        const end = (-45 + index * 45 - .35) * Math.PI / 180;
        const point = angle => `${.5 + .435 * Math.cos(angle)} ${.5 + .435 * Math.sin(angle)}`;
        const clip = doc.createElementNS(ns, 'clipPath'), sector = doc.createElementNS(ns, 'path');
        clip.id = `t5-service-pizza-slice-${index}`; clip.setAttribute('clipPathUnits', 'objectBoundingBox');
        sector.setAttribute('d', `M .5 .5 L ${point(start)} A .435 .435 0 0 1 ${point(end)} Z`);
        clip.append(sector); defs.append(clip);
        const slice = imageFor(receipt.photos[0]); slice.className = 't5-service-pizza-slice';
        slice.alt = index === 0 ? receipt.photos[0].imageAlt + ', восемь долек' : '';
        slice.style.clipPath = `url(#${clip.id})`;
        const middle = (start + end) / 2;
        slice.style.translate = `${Math.cos(middle) * .15}% ${Math.sin(middle) * .15}%`;
        plate.append(slice);
      }
    } else {
      for (const photo of receipt.photos || []) plate.append(imageFor(photo));
    }
    if (scene.dataset.kind === 'roll' && !serving?.includesAccompaniments) {
      const sides = imageFor({
        imageUrl: '/assets/olympiad/tour5/service/plates/roll-accompaniments-v3.webp',
        imageAlt: 'Сопровождение подачи: соевый соус, маринованный имбирь и васаби'
      });
      sides.className = 't5-service-accompaniments'; scene.append(sides);
    }
    scene.append(plate, caption);
    copy.append(el('h3', 't5-service-dish', receipt.dishTitle),
      el('p', 't5-service-composition', receipt.composition.join(' · ')),
      el('p', 't5-service-saved', 'Ответ сохранён на сервере.'),
      el('p', 't5-service-clock', attempt.status === 'in_progress' ? 'Время тура продолжает идти.' : 'Олимпиада завершена.'));
    const next = el('button', 't5-photo-primary', inline ? 'Скрыть подачу' : attempt.status === 'in_progress' ? 'Следующее блюдо' : 'К результату');
    next.type = 'button';
    next.addEventListener('click', () => {
      if (next.disabled) return;
      seen.add(key);
      try { root.localStorage.setItem(key, 'seen'); } catch { /* Do not block continuing. */ }
      node.remove(); current = null; doc.body.classList.remove('t5-service-open','story-service-visible'); onDismiss();
    });
    node.addEventListener('keydown', event => {
      if (!inline && event.key === 'Tab' && !next.disabled) { event.preventDefault(); next.focus({ preventScroll: true }); }
    });
    copy.append(next); card.append(scene, copy); node.append(card);
    if (inline) {
      const host = attempt.status === 'in_progress' ? doc.getElementById('story-service-slot') : doc.querySelector('.story-result');
      if (!host) return;
      host.prepend(node);
      // An inline serving never moves focus or scrolls away from the next task.
    } else { doc.body.append(node); doc.body.classList.add('t5-service-open'); }
    for(const photo of scene.querySelectorAll('img')){photo.addEventListener('load',updateScene);photo.addEventListener('error',failed);}
    updateScene();
    current = { attemptId: attempt.id, key, node, next, inline, locked: true };
  }
  function setLocked(value) {
    if (!current) return;
    const locked = Boolean(value), wasLocked = current.locked;
    current.locked = locked; current.next.disabled = locked; current.node.inert = locked;
    if (!locked && wasLocked && !current.inline) current.next.focus({ preventScroll: true });
  }
  function hideInline() { root.document.body.classList.remove('story-service-visible');if (!current?.inline) return; seen.add(current.key); try { root.localStorage.setItem(current.key, 'seen'); } catch {} current.node.remove(); current = null; }
  root.T5DishService = { sync, setLocked, hideInline, isOpen: () => Boolean(current), isBlocking: () => Boolean(current && !current.inline) };
})(typeof window !== 'undefined' ? window : globalThis);
