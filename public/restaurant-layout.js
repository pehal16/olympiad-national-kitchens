(function (root) {
  'use strict';
  const doc = root.document, base = '/assets/olympiad/story/layout-v2/scenes/';
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
    doc.querySelectorAll('.restaurant-context, .restaurant-paper, .restaurant-notebook, .restaurant-workspace, .restaurant-header-route').forEach(n => n.remove());
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
    section.dataset.layoutVersion = active ? '4' : '1';
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
    const header=el('div','restaurant-header-route'),status=el('div','restaurant-header-status');
    header.append(el('span','restaurant-current-chapter',['Фотоальбом','Карта путешествий','Записная книжка','Пожелания компании','Финальная кухня'][chapter-1]));
    doc.querySelector('.dashboard-head').prepend(header);move(doc.getElementById('progress-tour'),header);header.append(status);move(doc.getElementById('attempt-save-status'),status);move(doc.getElementById('participant-exam-badge'),status);
    const workspace=el('div','restaurant-workspace'),conversation=el('aside','restaurant-conversation'),task=el('div','restaurant-task');
    story.before(workspace);workspace.append(conversation,task);move(story,conversation);move(doc.getElementById('story-service-slot'),conversation);move(card,task);move(doc.querySelector('.action-deck'),task);
    card.classList.toggle('has-dialogue-condition',chapter===1&&attempt.story.conditionVersion===2&&/^Страница альбома: [^.]+\.$/.test(attempt.currentQuestion.scenario||''));
    const paper = el('div', 'restaurant-paper');
    if (chapter === 1) {
      const photo = body.querySelector('.question-photo');
      if (photo) { photo.append(zoomButton(attempt.currentQuestion.imageUrl, attempt.currentQuestion.imageAlt)); }
      body.append(paper); move(prompt, paper); move(note, paper); move(body.querySelector('.options'), paper); move(doc.querySelector('.action-deck'), paper);
    } else if (chapter === 3) {
      const dossier = body.querySelector('.t3-dossier'), evidence = body.querySelector('.t3-evidence');
      const notebook = el('div', 'restaurant-notebook');
      dossier.append(notebook); move(evidence.querySelector('.t3-visual'), notebook); notebook.append(paper);
      move(prompt, paper); move(note, paper); move(evidence.querySelector('.t3-clues'), paper); move(dossier.querySelector('.t3-answer-form'), paper);
      const actual = notebook.querySelector('.t3-visual'); actual.append(zoomButton(attempt.currentQuestion.imageUrl, attempt.currentQuestion.imageAlt));
    } else if (chapter === 4) {
      card.append(paper); move(prompt, paper); move(note, paper); move(body, paper);
    }
  }
  function result() {
    beforeQuestion(); active = false; doc.body.classList.remove('story-immersive');
    const details = doc.getElementById('restaurant-details'); if (details) { details.before(details.querySelector('.exam-cockpit')); details.remove(); }
    doc.getElementById('story-service-slot')?.remove();
  }
  function setLocked(value) { if (value && zoom?.open) zoom.close(); }
  root.RestaurantLayout = {layoutVersion:4, enabled, beforeQuestion, mount, result, picture, zoomButton, setLocked};
})(window);
