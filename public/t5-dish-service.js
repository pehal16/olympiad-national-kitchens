(function (root) {
  'use strict';
  const seen = new Set();
  let current = null;
  function sync(attempt, onDismiss) {
    if (current && current.attemptId !== attempt?.id) {
      current.node.remove(); current = null; root.document.body.classList.remove('t5-service-open');
    }
    const receipt = attempt?.dishService;
    if (!receipt || !['pleased', 'puzzled'].includes(receipt.mood)) return;
    const key = `nko_dish_service_v1_${attempt.id}_${receipt.questionId}`;
    let acknowledged = seen.has(key);
    try { acknowledged ||= root.localStorage.getItem(key) === 'seen'; } catch { /* Memory fallback. */ }
    if (acknowledged || current?.key === key) return;
    current?.node.remove();
    const doc = root.document;
    const el = (tag, className, text) => {
      const node = doc.createElement(tag); node.className = className || '';
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const node = el('section', 't5-service-overlay');
    node.setAttribute('role', 'dialog'); node.setAttribute('aria-modal', 'true');
    node.setAttribute('aria-labelledby', 't5-service-title');
    node.dataset.mood = receipt.mood;
    const card = el('div', 't5-service-card');
    const guest = el('img', 't5-service-guest');
    guest.src = `/assets/olympiad/tour5/service/guest-${receipt.mood}-v1.webp`;
    guest.alt = receipt.mood === 'pleased' ? 'Гость улыбается после подачи' : 'Гость удивлён подачей';
    guest.addEventListener('error', () => { guest.hidden = true; });
    const portrait = el('figure', 't5-service-portrait'); portrait.append(guest);
    const copy = el('div', 't5-service-copy');
    const title = el('h2', '', receipt.mood === 'pleased' ? 'Гость доволен' : 'Гость ожидал другое блюдо');
    title.id = 't5-service-title';
    copy.append(el('p', 't5-service-eyebrow', `Блюдо ${receipt.number} · подано`), title,
      el('p', 't5-service-message', receipt.mood === 'pleased'
        ? 'Ваш состав соответствует заявленной версии блюда.'
        : 'В выбранном составе есть замены. Ответ принят; изменить поданное блюдо уже нельзя.'));
    const plate = el('div', 't5-service-plate');
    plate.classList.toggle('is-tray', receipt.isTray === true);
    for (const photo of receipt.photos || []) {
      const image = el('img'); image.src = photo.imageUrl; image.alt = photo.imageAlt;
      image.addEventListener('error', () => { image.hidden = true; });
      plate.append(image);
    }
    copy.append(plate, el('h3', 't5-service-dish', receipt.dishTitle),
      el('p', 't5-service-composition', receipt.composition.join(' · ')),
      el('p', 't5-service-saved', 'Ответ сохранён на сервере.'),
      el('p', 't5-service-clock', attempt.status === 'in_progress' ? 'Время тура продолжает идти.' : 'Олимпиада завершена.'));
    const next = el('button', 't5-photo-primary', attempt.status === 'in_progress' ? 'Следующее блюдо' : 'К результату');
    next.type = 'button';
    next.addEventListener('click', () => {
      if (next.disabled) return;
      seen.add(key);
      try { root.localStorage.setItem(key, 'seen'); } catch { /* Do not block continuing. */ }
      node.remove(); current = null; doc.body.classList.remove('t5-service-open'); onDismiss();
    });
    node.addEventListener('keydown', event => {
      if (event.key === 'Tab' && !next.disabled) { event.preventDefault(); next.focus({ preventScroll: true }); }
    });
    copy.append(next); card.append(portrait, copy); node.append(card); doc.body.append(node);
    doc.body.classList.add('t5-service-open');
    current = { attemptId: attempt.id, key, node, next, locked: true };
  }
  function setLocked(value) {
    if (!current) return;
    const locked = Boolean(value), wasLocked = current.locked;
    current.locked = locked; current.next.disabled = locked; current.node.inert = locked;
    if (!locked && wasLocked) current.next.focus({ preventScroll: true });
  }
  root.T5DishService = { sync, setLocked, isOpen: () => Boolean(current) };
})(typeof window !== 'undefined' ? window : globalThis);
