(function (root) {
  'use strict';
  const doc = root.document, base = '/assets/olympiad/story/layout-v2/scenes/';
  const scenes = ['album', 'map', 'notes', 'orders', 'kitchen'];
  let moved = [], zoom = null, active = false;
  const el = (tag, cls, text) => { const n = doc.createElement(tag); n.className = cls || ''; if (text !== undefined) n.textContent = text; return n; };
  function picture(scene, cls, alt = '') {
    const p = el('picture', cls), source = el('source'), img = el('img');
    source.media = '(max-width: 767px)'; source.srcset = root.RestaurantMedia?.displayUrl(base + scene + '-mobile.webp')||base + scene + '-mobile.webp';
    img.src = root.RestaurantMedia?.displayUrl(base + scene + '-wide.webp')||base + scene + '-wide.webp'; img.alt = alt; img.decoding = 'async';img.fetchPriority='low';
    img.addEventListener('error', () => { p.classList.add('is-missing'); img.hidden = true; });
    p.append(source, img); return p;
  }
  function enabled(attempt) { return Boolean(attempt?.story && !attempt.story.decorationsDisabled); }
  function move(node, target, first = false) {
    if (!node || !target) return;
    const marker = doc.createComment('restaurant layout origin'); node.before(marker); moved.push([node, marker]);
    if (first) target.prepend(node); else target.append(node);
  }
  function beforeQuestion() {
    if (zoom?.open) zoom.close();
    for (const [node, marker] of moved.reverse()) marker.replaceWith(node);
    moved = [];
    doc.querySelectorAll('.restaurant-context, .restaurant-paper, .restaurant-notebook').forEach(n => n.remove());
  }
  function zoomButton(url, alt) {
    const b = el('button', 'restaurant-zoom', 'Увеличить фото'); b.type = 'button';
    b.setAttribute('aria-label', 'Увеличить фото: ' + (alt || 'блюдо'));
    b.addEventListener('click', () => {
      if (b.closest('[inert]') || b.disabled) return;
      zoom?.close(); const dialog = el('dialog', 'restaurant-photo-dialog'); zoom = dialog;
      const close = el('button', 'button secondary', 'Закрыть'); close.type = 'button';
      const img = el('img'); img.src = url; img.alt = alt || 'Фотография задания';
      const fallback = el('p', '', 'Фотография недоступна. Закройте увеличение и повторите загрузку.'); fallback.hidden = true;
      img.addEventListener('error', () => { img.hidden = true; fallback.hidden = false; });
      close.addEventListener('click', () => dialog.close());
      dialog.append(close, img, fallback); doc.body.append(dialog);
      dialog.addEventListener('close', () => { dialog.remove(); if (zoom === dialog) zoom = null; if (b.isConnected && !b.closest('[inert]')) b.focus({preventScroll:true}); }, {once:true});
      dialog.showModal(); close.focus({preventScroll:true});
    }); return b;
  }
  function shell(attempt) {
    active = enabled(attempt) && attempt.status === 'in_progress';
    doc.body.classList.toggle('story-immersive', active);
    const section = doc.getElementById('attempt-section');
    section.dataset.layoutVersion = active ? '3' : '1';
    if (!active) {
      const details = doc.getElementById('restaurant-details'); if (details) { details.before(details.querySelector('.exam-cockpit')); details.remove(); }
      doc.getElementById('story-service-slot')?.remove(); return;
    }
    section.dataset.chapter = attempt.story.currentChapter;
    if (!doc.getElementById('restaurant-details')) {
      const details = el('details', 'restaurant-details'); details.id = 'restaurant-details';
      details.append(el('summary', '', 'Участник и темп прохождения'));
      const cockpit = section.querySelector('.exam-cockpit'); cockpit.before(details); details.append(cockpit);
    }
    doc.querySelector('#restaurant-details > summary').textContent = `${doc.getElementById('participant-name').textContent} · сведения и темп`;
    const chapter = attempt.story.currentChapter;
    let slot = doc.getElementById('story-service-slot');
    if (!slot) { slot = el('div', 'restaurant-service-slot'); slot.id = 'story-service-slot'; doc.getElementById('question-card').before(slot); }
  }
  function mount(attempt) {
    shell(attempt); if (!active) return;
    const chapter = attempt.story.currentChapter, body = doc.getElementById('question-body'), card = doc.getElementById('question-card');
    const story = doc.querySelector('.story-chapter'), prompt = doc.getElementById('question-prompt'), note = doc.getElementById('question-note');
    const paper = el('div', 'restaurant-paper');
    if (chapter === 1) {
      const photo = body.querySelector('.question-photo');
      if (photo) { photo.append(zoomButton(attempt.currentQuestion.imageUrl, attempt.currentQuestion.imageAlt)); }
      body.append(paper); move(prompt, paper); move(note, paper); move(body.querySelector('.options'), paper); move(doc.querySelector('.action-deck'), paper);
    } else if (chapter === 3) {
      const dossier = body.querySelector('.t3-dossier'), evidence = body.querySelector('.t3-evidence');
      const notebook = el('div', 'restaurant-notebook');
      dossier.prepend(picture('notes', 'restaurant-context restaurant-notes-context'));
      dossier.append(notebook); move(evidence.querySelector('.t3-visual'), notebook); notebook.append(paper);
      move(prompt, paper); move(note, paper); move(evidence.querySelector('.t3-clues'), paper); move(dossier.querySelector('.t3-answer-form'), paper);
      const actual = notebook.querySelector('.t3-visual'); actual.append(zoomButton(attempt.currentQuestion.imageUrl, attempt.currentQuestion.imageAlt));
    } else if (chapter === 4) {
      card.prepend(picture('orders', 'restaurant-context restaurant-orders-context'));
      card.append(paper); move(prompt, paper); move(note, paper); move(body, paper);
    } else {
      const task = body.querySelector(chapter === 2 ? '.t2-match' : '.t5-photo-workbench');
      if (task&&chapter!==2) task.prepend(picture(scenes[chapter - 1], 'restaurant-context restaurant-work-context'));
    }
  }
  function result() {
    beforeQuestion(); active = false; doc.body.classList.remove('story-immersive');
    const details = doc.getElementById('restaurant-details'); if (details) { details.before(details.querySelector('.exam-cockpit')); details.remove(); }
    doc.getElementById('story-service-slot')?.remove();
  }
  function setLocked(value) { if (value && zoom?.open) zoom.close(); }
  root.RestaurantLayout = {layoutVersion:3, enabled, beforeQuestion, mount, result, picture, zoomButton, setLocked};
})(window);
