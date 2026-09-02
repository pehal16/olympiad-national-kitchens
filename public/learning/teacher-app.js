import { teacherApi } from './api.js?v=1.1.3';
import { mountTask } from './tasks.js?v=1.4.0';
import {
  $, $$, asArray, confirmAction, debounce, downloadCsv, errorText, escapeHtml,
  formatDate, fullName, initials, initSession, logout, pick, renderEmpty,
  renderError, renderLoading, setBusy, setViewInUrl, statusBadge, statusMeta, toast,
} from './ui.js?v=1.1.4';

const content = $('#teacher-content');
const saveState = $('#teacher-save-state');
const breadcrumbs = $('#teacher-breadcrumbs');

const state = {
  user: null,
  view: new URL(location.href).searchParams.get('view') || 'overview',
  catalog: null,
  overview: null,
  templates: null,
  assignments: null,
  submissions: null,
  journal: null,
  builder: null,
  previewControllers: [],
  reviewControllers: [],
  rosterPreview: null,
  rosterRequest: null,
};

const VIEW_LABELS = {
  overview: 'Обзор', works: 'Работы', assignments: 'Назначения', review: 'Проверка',
  groups: 'Группы', journal: 'Журнал', settings: 'Настройки', builder: 'Конструктор',
};

const BLOCK_LIBRARY = [
  { group: 'Основные', items: [
    ['instruction', 'Инструкция'], ['single_choice', 'Один вариант'], ['multiple_choice', 'Несколько вариантов'],
    ['short_text', 'Краткий ответ'], ['long_text', 'Текстовый ответ'], ['calculation', 'Расчёт'], ['reflection', 'Рефлексия'],
  ] },
  { group: 'Интерактивные', items: [
    ['matching', 'Соответствие'], ['ordering', 'Последовательность'], ['classification', 'Классификация'],
    ['table', 'Таблица'], ['crossword', 'Кроссворд'], ['file_evidence', 'Подтверждающий файл'],
  ] },
  { group: 'Профессиональные', items: [
    ['ttk_builder', 'Технологическая карта'], ['scheme_builder', 'Технологическая схема'],
    ['dish_assembly', 'Сборка блюда'], ['observation_log', 'Журнал наблюдений'], ['safety_checklist', 'Чек-лист безопасности'],
  ] },
];

const BLOCK_LABELS = Object.fromEntries(BLOCK_LIBRARY.flatMap((group) => group.items));
const AUTO_TYPES = new Set(['single_choice', 'multiple_choice', 'calculation', 'matching', 'ordering', 'classification', 'crossword']);
const WORK_KIND_LABELS = {
  practice: 'Практическая работа',
  lab: 'Лабораторная работа',
  test: 'Промежуточный тест',
  independent: 'Самостоятельная работа',
};

function jsonObject(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function idOf(item = {}) {
  return item.id || item.templateId || item.assignmentId || item.submissionId || item.groupId || item.subjectId;
}

function catalogData(payload = state.catalog) {
  return {
    groups: asArray(pick(payload, 'groups', 'studyGroups')),
    subjects: asArray(pick(payload, 'subjects', 'disciplines')),
    courses: asArray(pick(payload, 'courses')),
  };
}

function nameOf(item = {}, fallback = '—') {
  return item.name || item.title || item.displayName || item.code || fallback;
}

function optionsHtml(items, selected = '', placeholder = 'Все') {
  return `<option value="">${escapeHtml(placeholder)}</option>${items.map((item) => `<option value="${escapeHtml(idOf(item))}" ${String(idOf(item)) === String(selected) ? 'selected' : ''}>${escapeHtml(nameOf(item))}</option>`).join('')}`;
}

function icon(name) {
  const paths = {
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`;
}

function setTeacherSave(kind, label) {
  saveState.textContent = label;
  saveState.classList.toggle('is-saving', kind === 'saving');
  saveState.classList.toggle('is-warning', kind === 'pending');
  saveState.classList.toggle('is-error', kind === 'error');
}

async function ensureCatalog() {
  if (!state.catalog) state.catalog = await teacherApi.catalog();
  return state.catalog;
}

function selectNav(view) {
  const parentView = view === 'builder' ? 'works' : view;
  $$('.teacher-nav-item').forEach((button) => {
    const active = button.dataset.teacherView === parentView;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  breadcrumbs.innerHTML = `Учебные работы <span aria-hidden="true">›</span> ${escapeHtml(VIEW_LABELS[view] || 'Раздел')}`;
}

function destroyViewControllers() {
  state.previewControllers.forEach((controller) => controller?.destroy?.());
  state.reviewControllers.forEach((controller) => controller?.destroy?.());
  state.previewControllers = [];
  state.reviewControllers = [];
  if (state.builder?.saveDraft?.cancel) state.builder.saveDraft.cancel();
}

async function navigate(view, { id = null, replace = false, force = false } = {}) {
  destroyViewControllers();
  state.view = view;
  setViewInUrl(view, { id }, replace);
  selectNav(view);
  $('#teacher-sidebar').classList.remove('is-open');
  $('#sidebar-toggle').setAttribute('aria-expanded', 'false');
  const handlers = { overview: renderOverview, works: renderWorks, assignments: renderAssignments, review: renderReview, groups: renderGroups, journal: renderJournal, settings: renderSettings };
  if (view === 'builder') return openBuilder(id);
  return (handlers[view] || handlers.overview)(force);
}

function pageHeader(kicker, title, description, action = '') {
  return `<div class="page-head"><div><p class="section-kicker">${escapeHtml(kicker)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div><div class="page-actions">${action}</div></div>`;
}

async function renderOverview(force = false) {
  renderLoading(content, 'Собираем сводку…');
  try {
    await ensureCatalog();
    if (!state.overview || force) state.overview = await teacherApi.dashboard();
    drawOverview();
  } catch (error) { renderError(content, error, () => renderOverview(true)); }
}

function dashboardAssignments(payload) {
  const groups = catalogData().groups;
  return asArray(pick(payload, 'today', 'assignments', 'items')).map((item) => ({
    ...item,
    id: idOf(item),
    title: item.title || item.workTitle || item.templateTitle || 'Учебная работа',
    group: item.groupName || item.group?.name || asArray(item.groupIds).map((id) => nameOf(groups.find((group) => String(idOf(group)) === String(id)), '')).filter(Boolean).join(', ') || '—',
    subject: item.subjectName || item.subject?.name || (typeof item.subject === 'string' ? item.subject : '') || '—',
    type: item.workType || item.typeLabel || WORK_KIND_LABELS[item.kind || item.type] || item.kind || item.type || 'Работа',
    dueAt: item.dueAt || item.due_at || item.deadline,
    pending: Number(item.pendingReview ?? item.reviewCount ?? item.submittedCount ?? 0),
    status: item.status || 'published',
  }));
}

function drawOverview() {
  const { groups, subjects } = catalogData();
  const assignments = dashboardAssignments(state.overview);
  content.innerHTML = `<div class="teacher-page">
    ${pageHeader('Кабинет преподавателя', 'Учебные работы', 'Назначения, очередь проверки и прогресс групп.', '<button id="overview-create" class="learning-button primary" type="button">Создать работу</button>')}
    <div class="teacher-filter-row" role="search">
      <label class="field"><span>Группа</span><select id="overview-group">${optionsHtml(groups)}</select></label>
      <label class="field"><span>Предмет</span><select id="overview-subject">${optionsHtml(subjects)}</select></label>
      <button id="journal-export-shortcut" class="learning-button secondary" type="button">Выгрузить журнал</button>
    </div>
    <div id="overview-sections" class="section-stack" style="margin-top:22px"></div>
  </div>`;
  const draw = () => {
    const group = $('#overview-group').value;
    const subject = $('#overview-subject').value;
    const subjectName = nameOf(subjects.find((item) => String(idOf(item)) === subject), '');
    const rows = assignments.filter((item) => (!group || String(item.groupId || item.group?.id) === group || asArray(item.groupIds).map(String).includes(group)) && (!subject || String(item.subjectId || item.subject?.id) === subject || item.subject === subjectName));
    const target = $('#overview-sections');
    target.innerHTML = `<section class="panel" aria-labelledby="today-title"><div class="panel-head"><h2 id="today-title">Сегодня</h2><span>${rows.length} назначений</span></div><div class="panel-body">${rows.length ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th scope="col">Работа</th><th scope="col">Группа</th><th scope="col">Предмет</th><th scope="col">Вид</th><th scope="col">Срок</th><th scope="col">На проверке</th><th scope="col">Статус</th><th scope="col">Действие</th></tr></thead><tbody>${rows.map((item) => `<tr><td data-label="Работа"><strong>${escapeHtml(item.title)}</strong></td><td data-label="Группа">${escapeHtml(item.group)}</td><td data-label="Предмет">${escapeHtml(item.subject)}</td><td data-label="Вид">${escapeHtml(item.type)}</td><td data-label="Срок">${escapeHtml(formatDate(item.dueAt, { withTime: true }))}</td><td data-label="На проверке">${item.pending}</td><td data-label="Статус">${statusBadge(item.status)}</td><td class="table-action" data-label="Действие"><button class="learning-button quiet" data-review-assignment="${escapeHtml(item.id)}" type="button">Открыть</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><h3>На сегодня нет назначений</h3><p>Выберите другую группу или создайте новую работу.</p></div>'}</div></section>${renderProgressMatrix(state.overview, group, subject)}`;
    $$('[data-review-assignment]', target).forEach((button) => button.addEventListener('click', () => navigate('review', { id: button.dataset.reviewAssignment })));
  };
  $('#overview-group').addEventListener('change', draw);
  $('#overview-subject').addEventListener('change', draw);
  $('#overview-create').addEventListener('click', createTemplate);
  $('#journal-export-shortcut').addEventListener('click', () => navigate('journal'));
  draw();
}

function renderProgressMatrix(payload, groupFilter, subjectFilter) {
  const matrix = payload.progressMatrix || payload.matrix || {};
  const works = asArray(matrix.works || matrix.assignments || payload.matrixWorks).filter((work) => (!subjectFilter || String(work.subjectId) === subjectFilter));
  const students = asArray(matrix.students || payload.students).filter((student) => !groupFilter || String(student.groupId || student.group?.id) === groupFilter);
  if (!works.length || !students.length) return `<section class="panel"><div class="panel-head"><h2>Прогресс студентов по работам</h2></div><div class="panel-body"><p class="muted">Данные появятся после первого назначения.</p></div></section>`;
  return `<section class="panel" aria-labelledby="matrix-title"><div class="panel-head"><h2 id="matrix-title">Прогресс студентов по работам</h2></div><div class="panel-body"><div class="data-table-wrap"><table class="data-table progress-matrix"><thead><tr><th scope="col">Студент</th>${works.map((work) => `<th scope="col">${escapeHtml(work.title || work.name)}</th>`).join('')}</tr></thead><tbody>${students.map((student) => `<tr><th scope="row">${escapeHtml(student.displayName || student.name || student.code || 'Студент')}</th>${works.map((work) => { const cell = student.results?.[idOf(work)] || asArray(student.results).find((result) => String(result.assignmentId) === String(idOf(work))) || {}; const [label, tone] = statusMeta(cell.status || 'not_started'); return `<td class="matrix-cell" data-label="${escapeHtml(work.title || work.name)}"><strong class="status-mark ${tone}">${escapeHtml(label)}</strong><span>${cell.score !== undefined && cell.score !== null ? `${escapeHtml(cell.score)} балл.` : escapeHtml(formatDate(cell.updatedAt, { fallback: '' }))}</span></td>`; }).join('')}</tr>`).join('')}</tbody></table></div></div></section>`;
}

async function renderWorks(force = false) {
  renderLoading(content, 'Загружаем работы…');
  try {
    await ensureCatalog();
    if (!state.templates || force) state.templates = await teacherApi.templates();
    drawWorks();
  } catch (error) { renderError(content, error, () => renderWorks(true)); }
}

function templateItems(payload = state.templates) {
  const { courses, subjects } = catalogData();
  return asArray(pick(payload, 'templates', 'items', 'works')).map((item) => {
    const course = courses.find((entry) => String(idOf(entry)) === String(item.courseId || item.course_id));
    const subject = subjects.find((entry) => String(idOf(entry)) === String(course?.subjectId || course?.subject_id));
    const currentVersionId = item.currentVersionId || item.current_version_id;
    const published = Boolean(currentVersionId || item.publishedAt || item.published_at || Number(item.published_versions || 0));
    return {
      ...item,
      id: idOf(item),
      title: item.title || item.name || 'Без названия',
      subject: item.subjectName || item.subject_name || item.subject?.name || subject?.name || '—',
      currentVersionId,
      versionNumber: item.currentVersionNo || item.current_version_no || item.versionNumber || item.version_no || 1,
      publishedAt: item.publishedAt || item.published_at,
      updatedAt: item.updatedAt || item.updated_at,
      status: published && ['active', 'published'].includes(item.status) ? 'published' : (item.status || 'draft'),
    };
  });
}

function drawWorks() {
  const templates = templateItems();
  content.innerHTML = `<div class="teacher-page">
    ${pageHeader('Библиотека', 'Работы', 'Черновики и опубликованные версии учебных материалов.', '<button id="work-create" class="learning-button primary" type="button">Создать работу</button>')}
    <div class="filter-bar"><label class="field"><span>Поиск</span><input id="work-search" type="search" placeholder="Название работы" /></label><label class="field"><span>Статус</span><select id="work-status"><option value="">Все статусы</option><option value="draft">Черновик</option><option value="published">Опубликовано</option><option value="archived">В архиве</option></select></label><label class="field"><span>Предмет</span><select id="work-subject">${optionsHtml(catalogData().subjects)}</select></label></div>
    <div id="work-results"></div>
  </div>`;
  const draw = () => {
    const query = $('#work-search').value.trim().toLocaleLowerCase('ru');
    const status = $('#work-status').value;
    const subject = $('#work-subject').value;
    const rows = templates.filter((item) => (!query || `${item.title} ${item.subject}`.toLocaleLowerCase('ru').includes(query)) && (!status || item.status === status) && (!subject || String(item.subjectId || item.subject?.id) === subject));
    const target = $('#work-results');
    if (!rows.length) { renderEmpty(target, 'Работы не найдены', 'Создайте первый черновик или измените фильтры.'); return; }
    target.innerHTML = `<div class="work-list">${rows.map((item) => `<div class="work-row"><div><h3>${escapeHtml(item.title)}</h3><p>Версия ${escapeHtml(item.versionNumber || item.version || 1)}</p></div><div>${escapeHtml(item.subject)}</div><div>${statusBadge(item.status)}</div><div><span class="muted">Изменено</span><br>${escapeHtml(formatDate(item.updatedAt, { withTime: true }))}</div><button class="learning-button secondary" type="button" data-edit-template="${escapeHtml(item.id)}">${icon('edit')}<span>Открыть</span></button></div>`).join('')}</div>`;
    $$('[data-edit-template]', target).forEach((button) => button.addEventListener('click', () => navigate('builder', { id: button.dataset.editTemplate })));
  };
  ['#work-search', '#work-status', '#work-subject'].forEach((selector) => $(selector).addEventListener('input', draw));
  $('#work-create').addEventListener('click', createTemplate);
  draw();
}

async function createTemplate() {
  try { await ensureCatalog(); } catch (error) { toast(errorText(error), 'danger'); return; }
  const courses = catalogData().courses;
  if (!courses.length) {
    toast('Сначала создайте учебный курс с предметом и группой.', 'danger');
    return;
  }
  let dialog = $('#create-template-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'create-template-dialog';
    dialog.className = 'learning-dialog';
    document.body.append(dialog);
  }
  dialog.innerHTML = `<form id="create-template-form" class="dialog-form" method="dialog"><div class="dialog-head"><div><p class="section-kicker">Новый черновик</p><h2>Создать учебную работу</h2></div></div><label class="field"><span>Название</span><input id="new-template-title" value="Новая учебная работа" required /></label><label class="field"><span>Учебный курс</span><select id="new-template-course" required>${optionsHtml(courses, '', 'Выберите курс')}</select></label><label class="field"><span>Вид работы</span><select id="new-template-kind"><option value="practice">Практическая</option><option value="lab">Лабораторная</option><option value="independent">Самостоятельная</option><option value="test">Промежуточная</option></select></label><div id="new-template-error" class="form-error hidden" role="alert"></div><div class="dialog-actions"><button class="learning-button secondary" value="cancel" type="button">Отмена</button><button class="learning-button primary" type="submit">Создать</button></div></form>`;
  const form = $('#create-template-form', dialog);
  $('[value="cancel"]', form).addEventListener('click', () => dialog.close('cancel'));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = $('button[type="submit"]', form);
    const errorBox = $('#new-template-error', form);
    setBusy(button, true, 'Создаём…');
    errorBox.classList.add('hidden');
    try {
      const payload = await teacherApi.createTemplate({
        courseId: $('#new-template-course', form).value,
        title: $('#new-template-title', form).value.trim(),
        kind: $('#new-template-kind', form).value,
        blocks: [], rubric: [],
      });
      state.templates = null;
      dialog.close('created');
      await navigate('builder', { id: idOf(payload.template || payload) });
    } catch (error) {
      errorBox.textContent = errorText(error);
      errorBox.classList.remove('hidden');
      setBusy(button, false);
    }
  }, { once: true });
  dialog.showModal();
}

function uniqueId(prefix = 'block') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function defaultBlock(type) {
  const common = { id: uniqueId(type), type, title: BLOCK_LABELS[type] || 'Новый блок', prompt: '', required: type !== 'instruction', maxScore: type === 'instruction' ? 0 : 1 };
  if (['single_choice', 'multiple_choice'].includes(type)) return { ...common, options: [{ id: uniqueId('option'), label: 'Вариант 1' }, { id: uniqueId('option'), label: 'Вариант 2' }] };
  if (type === 'matching') return { ...common, pairs: [{ id: uniqueId('pair'), left: 'Элемент 1', right: 'Соответствие 1' }] };
  if (type === 'ordering') return { ...common, items: [{ id: uniqueId('item'), label: 'Шаг 1' }, { id: uniqueId('item'), label: 'Шаг 2' }] };
  if (type === 'classification') return { ...common, categories: [{ id: uniqueId('category'), label: 'Категория 1' }, { id: uniqueId('category'), label: 'Категория 2' }], items: [{ id: uniqueId('item'), label: 'Элемент 1' }], answerKey: { assignments: {} } };
  if (type === 'table') return { ...common, rows: [{ id: 'row-1', label: 'Строка 1' }], columns: [{ id: 'column-1', label: 'Столбец 1' }] };
  if (type === 'calculation') return { ...common, unit: '', formula: '' };
  if (type === 'crossword') return { ...common, clues: [{ id: uniqueId('clue'), number: 1, clue: 'Вопрос 1' }] };
  if (type === 'safety_checklist') return { ...common, items: [{ id: uniqueId('safe'), label: 'Требование безопасности' }] };
  if (type === 'dish_assembly') return { ...common, components: [{ id: uniqueId('component'), label: 'Компонент' }], slots: [{ id: uniqueId('slot'), label: 'Зона' }] };
  if (type === 'ttk_builder') return { ...common, requiredFields: ['dishName', 'scope', 'ingredients', 'grossNet', 'steps', 'quality', 'storage', 'output'], minIngredients: 3, minSteps: 3, requireIngredientMasses: true, enforceGrossNotLessThanNet: true };
  if (type === 'scheme_builder') return { ...common, minNodes: 3, minControlPoints: 1, nodeTypes: [{ id: 'raw_material', label: 'Сырьё' }, { id: 'operation', label: 'Операция' }, { id: 'control', label: 'Контроль' }, { id: 'result', label: 'Результат' }], fields: [{ id: 'type', label: 'Тип узла', required: true }, { id: 'label', label: 'Название этапа', required: true }, { id: 'zone', label: 'Поток или зона' }, { id: 'control', label: 'Контрольная точка' }], availableSteps: [{ id: uniqueId('step'), label: 'Операция' }] };
  if (type === 'observation_log') return { ...common, minEntries: 1, columns: [{ id: 'time', label: 'Время' }, { id: 'observation', label: 'Наблюдение' }] };
  if (type === 'file_evidence') return { ...common, minFiles: 1, maxFiles: 3, maxFileBytes: 25 * 1024 * 1024, allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'], allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'] };
  return common;
}

function normalizeBuilderBlock(source) {
  const block = { ...source, ...(source.config || {}), privateKey: source.privateKey || source.answerKey || {} };
  if (block.type === 'matching' && !asArray(block.pairs).length) {
    const rightItems = asArray(block.rightItems || block.targets);
    const pairs = block.privateKey?.pairs || block.privateKey?.correctPairs || {};
    block.pairs = asArray(block.leftItems || block.items).map((left, index) => {
      const leftId = left.id || `left-${index + 1}`;
      const rightId = pairs[leftId] || rightItems[index]?.id || `right-${index + 1}`;
      const right = rightItems.find((item) => String(item.id) === String(rightId)) || rightItems[index] || {};
      return {
        id: leftId,
        targetId: right.id || rightId,
        left: left.label || left.text || String(left),
        right: right.label || right.text || String(right),
      };
    });
  }
  return block;
}

function normalizeTemplate(payload) {
  const template = payload?.template || payload || {};
  const draft = payload?.draft || template.draft || template;
  const definition = jsonObject(draft.contentJson || draft.content_json || draft.content || template.contentJson || template.content_json, { schemaVersion: 1, blocks: asArray(draft.blocks) });
  const rubricSource = draft.rubric || draft.publicRubric || draft.public_rubric_json || template.publicRubric || template.rubric;
  const blocks = asArray(draft.blocks || definition.blocks).map(normalizeBuilderBlock);
  return {
    template: { ...template, ...draft, courseId: draft.courseId || template.courseId || template.course_id },
    blocks,
    rubric: asArray(jsonObject(rubricSource, rubricSource || [])),
    selectedIndex: blocks.length ? 0 : -1,
    dirty: false,
  };
}

function automaticKeyReady(block) {
  const key = privateKeyForBlock(block);
  if (block.type === 'single_choice') return Boolean(key.optionId || block.correctOptionId);
  if (block.type === 'multiple_choice') return asArray(key.optionIds || block.correctOptionIds).length > 0;
  if (block.type === 'calculation') return Number.isFinite(Number(key.value));
  if (block.type === 'matching') {
    const pairs = asArray(block.pairs);
    return pairs.length > 0 && pairs.every((pair) => String(pair.left || pair.label || '').trim() && String(pair.right || pair.match || '').trim() && key.pairs?.[pair.id]);
  }
  if (block.type === 'ordering') {
    const itemIds = new Set(asArray(block.items).map((item) => String(item.id || item)));
    const order = asArray(key.order);
    return order.length === itemIds.size && order.every((id) => itemIds.has(String(id)));
  }
  if (block.type === 'classification') {
    const items = asArray(block.items);
    const categoryIds = new Set(asArray(block.categories).map((item) => String(item.id || item)));
    return items.length > 0 && items.every((item) => categoryIds.has(String(key.assignments?.[item.id || item])));
  }
  if (block.type === 'crossword') {
    const clues = asArray(block.clues);
    return clues.length > 0 && clues.every((clue) => String(key.words?.[clue.id] || '').trim());
  }
  return Object.keys(key).length > 0;
}

async function openBuilder(id) {
  if (!id) return navigate('works', { replace: true });
  renderLoading(content, 'Открываем конструктор…');
  try {
    await ensureCatalog();
    state.builder = normalizeTemplate(await teacherApi.template(id));
    state.builder.saveDraft = debounce(() => saveBuilder().catch(() => {}), 750);
    drawBuilder();
  } catch (error) { renderError(content, error, () => openBuilder(id)); }
}

function builderIssues() {
  const { template, blocks, rubric } = state.builder;
  const issues = [];
  if (!String(template.title || '').trim()) issues.push('Укажите тему работы.');
  if (!template.courseId && !template.course_id) issues.push('Выберите учебный курс.');
  if (!template.defaultGroupId) issues.push('Выберите группу назначения.');
  if (!template.defaultDueAt) issues.push('Укажите срок выполнения.');
  if (!blocks.length) issues.push('Добавьте хотя бы один учебный блок.');
  blocks.forEach((block, index) => {
    if (!String(block.title || block.prompt || '').trim()) issues.push(`Заполните заголовок блока ${index + 1}.`);
    if (AUTO_TYPES.has(block.type) && !automaticKeyReady(block)) issues.push(`Добавьте полный правильный ответ для блока ${index + 1}.`);
  });
  if (blocks.some((block) => !AUTO_TYPES.has(block.type) && block.type !== 'instruction' && Number(block.maxScore) > 0) && !rubric.length) issues.push('Добавьте рубрику для ручной проверки.');
  return issues;
}

function drawBuilder() {
  const builder = state.builder;
  const { groups, courses } = catalogData();
  const issues = builderIssues();
  content.innerHTML = `<div class="builder-page" aria-labelledby="builder-title">
    <header class="builder-toolbar"><div><button id="builder-back" class="learning-button quiet" type="button">К работам</button><strong id="builder-title">${escapeHtml(builder.template.title || 'Новая работа')}</strong></div><div class="builder-toolbar-actions"><button id="builder-preview" class="learning-button secondary" type="button">Предпросмотр</button><button id="builder-publish" class="learning-button primary" type="button" ${issues.length ? 'aria-describedby="builder-issues"' : ''}>Опубликовать</button></div></header>
    <div class="builder-layout">
      <aside class="block-library" aria-label="Библиотека блоков"><h2>Блоки</h2>${BLOCK_LIBRARY.map((group) => `<section class="library-section"><h3>${escapeHtml(group.group)}</h3><div class="library-list">${group.items.map(([type, label]) => `<button class="library-item" type="button" data-add-block="${type}">+ ${escapeHtml(label)}</button>`).join('')}</div></section>`).join('')}</aside>
      <main class="work-canvas"><div class="canvas-head">
        <label class="field"><span>Тема работы</span><input id="builder-work-title" value="${escapeHtml(builder.template.title || '')}" required /></label>
        <div class="teacher-filter-row"><label class="field"><span>Учебный курс</span><select id="builder-course">${optionsHtml(courses, builder.template.courseId || builder.template.course_id, 'Выберите курс')}</select></label><label class="field"><span>Группа назначения</span><select id="builder-group">${optionsHtml(groups, builder.template.defaultGroupId, 'Выберите группу')}</select></label><label class="field"><span>Срок</span><input id="builder-due" type="datetime-local" value="${escapeHtml(toLocalDateInput(builder.template.defaultDueAt))}" /></label></div>
        <label class="field"><span>Рубрика: один критерий в строке в формате «Название | баллы»</span><textarea id="builder-rubric" rows="3" placeholder="Технология выполнения | 5">${escapeHtml(builder.rubric.map((row) => `${row.title || row.name} | ${row.maxScore ?? row.points ?? 1}`).join('\n'))}</textarea></label>
      </div><div id="canvas-blocks" class="canvas-blocks"></div><div class="canvas-add">Выберите блок в библиотеке слева</div></main>
      <aside class="block-inspector" aria-label="Настройки блока"><div id="block-inspector-content"></div><div id="builder-issues" class="builder-issues"><strong>${issues.length ? `Проверка полноты: ${issues.length}` : 'Работа готова к публикации'}</strong>${issues.length ? `<ul>${issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join('')}</ul>` : '<p>Все обязательные параметры заполнены.</p>'}</div></aside>
    </div>
  </div>`;
  drawCanvas();
  drawInspector();
  $('#builder-back').addEventListener('click', async () => { await flushBuilder(); navigate('works', { force: true }); });
  // Keep toolbar actions stable when an inspector field is focused: its blur handler
  // can redraw the builder before the following click event reaches the old button.
  ['#builder-preview', '#builder-publish'].forEach((selector) => {
    $(selector).addEventListener('pointerdown', (event) => event.preventDefault());
  });
  $('#builder-preview').addEventListener('click', previewBuilder);
  $('#builder-publish').addEventListener('click', publishBuilder);
  $$('[data-add-block]').forEach((button) => button.addEventListener('click', () => addBlock(button.dataset.addBlock)));
  $('#builder-work-title').addEventListener('input', (event) => { builder.template.title = event.target.value; markBuilderDirty(); });
  $('#builder-course').addEventListener('change', (event) => { builder.template.courseId = event.target.value; markBuilderDirty(); });
  $('#builder-group').addEventListener('change', (event) => { builder.template.defaultGroupId = event.target.value; markBuilderDirty(); });
  $('#builder-due').addEventListener('change', (event) => { builder.template.defaultDueAt = event.target.value ? new Date(event.target.value).toISOString() : null; markBuilderDirty(); });
  $('#builder-rubric').addEventListener('input', (event) => { builder.rubric = parseRubric(event.target.value); markBuilderDirty(); });
}

function toLocalDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function parseRubric(value) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [title, points] = line.split('|').map((part) => part.trim());
    return { id: `criterion-${index + 1}`, title, maxScore: Number(points) || 1 };
  });
}

function drawCanvas() {
  const target = $('#canvas-blocks');
  if (!state.builder.blocks.length) { target.innerHTML = '<div class="empty-state"><h2>Холст пока пуст</h2><p>Добавьте инструкцию или задание из библиотеки.</p></div>'; return; }
  target.innerHTML = state.builder.blocks.map((block, index) => `<article class="canvas-block ${index === state.builder.selectedIndex ? 'is-selected' : ''} ${!String(block.title || block.prompt || '').trim() ? 'has-issue' : ''}" data-block-index="${index}"><span class="block-order">${index + 1}</span><button class="canvas-block-copy" type="button" data-select-block="${index}"><strong>${escapeHtml(block.title || BLOCK_LABELS[block.type] || 'Блок')}</strong><span>${escapeHtml(BLOCK_LABELS[block.type] || block.type)} · ${block.required ? 'обязательный' : 'необязательный'} · ${Number(block.maxScore) || 0} балл.</span></button><div class="canvas-block-actions"><button class="icon-control" type="button" data-move-up="${index}" ${index === 0 ? 'disabled' : ''} aria-label="Переместить блок выше">${icon('up')}</button><button class="icon-control" type="button" data-move-down="${index}" ${index === state.builder.blocks.length - 1 ? 'disabled' : ''} aria-label="Переместить блок ниже">${icon('down')}</button><button class="icon-control" type="button" data-copy-block="${index}" aria-label="Дублировать блок">${icon('copy')}</button><button class="icon-control danger" type="button" data-delete-block="${index}" aria-label="Удалить блок">${icon('trash')}</button></div></article>`).join('');
  $$('[data-select-block]', target).forEach((button) => button.addEventListener('click', () => selectBlock(Number(button.dataset.selectBlock))));
  $$('[data-move-up]', target).forEach((button) => button.addEventListener('click', () => moveBlock(Number(button.dataset.moveUp), -1)));
  $$('[data-move-down]', target).forEach((button) => button.addEventListener('click', () => moveBlock(Number(button.dataset.moveDown), 1)));
  $$('[data-copy-block]', target).forEach((button) => button.addEventListener('click', () => duplicateBlock(Number(button.dataset.copyBlock))));
  $$('[data-delete-block]', target).forEach((button) => button.addEventListener('click', () => deleteBlock(Number(button.dataset.deleteBlock))));
}

function keyDisplay(block) {
  if (block.answerKey !== undefined && block.answerKey !== null && block.answerKey !== '') return Array.isArray(block.answerKey) ? block.answerKey.join(', ') : String(block.answerKey);
  const key = block.privateKey;
  if (!key || typeof key !== 'object') return '';
  if (block.type === 'single_choice' && key.optionId) return String(asArray(block.options).findIndex((option) => String(option.id) === String(key.optionId)) + 1 || key.optionId);
  if (block.type === 'multiple_choice' && Array.isArray(key.optionIds)) return key.optionIds.map((id) => asArray(block.options).findIndex((option) => String(option.id) === String(id)) + 1 || id).join(', ');
  if (block.type === 'calculation' && key.value !== undefined) return String(key.value);
  if (block.type === 'ordering' && Array.isArray(key.order)) return key.order.map((id) => asArray(block.items).findIndex((item) => String(item.id) === String(id)) + 1 || id).join(', ');
  if (block.type === 'crossword' && key.words) return asArray(block.clues).map((clue) => key.words[clue.id] || '').join(', ');
  return JSON.stringify(key);
}

function classificationKeyDisplay(block) {
  const key = block.answerKey && typeof block.answerKey === 'object' ? block.answerKey : block.privateKey;
  const assignments = key?.assignments || key?.correctAssignments || {};
  return asArray(block.items).map((item) => {
    const categoryId = assignments[item.id];
    const category = asArray(block.categories).find((entry) => String(entry.id) === String(categoryId));
    return category ? `${item.label || item.text || item.id} | ${category.label || category.text || category.id}` : '';
  }).filter(Boolean).join('\n');
}

function inspectorConfig(block) {
  if (['single_choice', 'multiple_choice'].includes(block.type)) return `<label class="field"><span>Варианты, по одному в строке</span><textarea id="block-options" rows="6">${escapeHtml(asArray(block.options).map((option) => option.label || option.text || option).join('\n'))}</textarea></label><label class="field"><span>Ключ: номер варианта или номера через запятую</span><input id="block-key" value="${escapeHtml(keyDisplay(block))}" /></label>`;
  if (block.type === 'calculation') return `<label class="field"><span>Формула-подсказка</span><input id="block-formula" value="${escapeHtml(block.formula || '')}" /></label><label class="field"><span>Единица измерения</span><input id="block-unit" value="${escapeHtml(block.unit || '')}" /></label><label class="field"><span>Правильное значение</span><input id="block-key" type="number" step="any" value="${escapeHtml(keyDisplay(block))}" /></label>`;
  if (block.type === 'matching') return `<label class="field"><span>Правильные пары в формате «элемент | соответствие»</span><textarea id="block-pairs" rows="7">${escapeHtml(asArray(block.pairs).map((pair) => `${pair.left || pair.label || ''} | ${pair.right || pair.match || ''}`).join('\n'))}</textarea><small>Каждая строка одновременно создаёт элементы задания и задаёт правильное соответствие.</small></label>`;
  if (['ordering', 'safety_checklist', 'scheme_builder'].includes(block.type)) return `<label class="field"><span>Элементы, по одному в строке</span><textarea id="block-items" rows="7">${escapeHtml(asArray(block.items || block.availableSteps).map((item) => item.label || item.text || item).join('\n'))}</textarea></label>${block.type === 'ordering' ? `<label class="field"><span>Ключ: номера через запятую</span><input id="block-key" value="${escapeHtml(keyDisplay(block))}" /></label>` : ''}`;
  if (block.type === 'classification') return `<label class="field"><span>Категории, по одной в строке</span><textarea id="block-categories" rows="4">${escapeHtml(asArray(block.categories).map((item) => item.label || item).join('\n'))}</textarea></label><label class="field"><span>Элементы, по одному в строке</span><textarea id="block-items" rows="5">${escapeHtml(asArray(block.items).map((item) => item.label || item).join('\n'))}</textarea></label><label class="field"><span>Правильное распределение в формате «элемент | категория»</span><textarea id="block-classification-key" rows="5" placeholder="Морковь | Овощи">${escapeHtml(classificationKeyDisplay(block))}</textarea><small>Названия должны совпадать со списками выше.</small></label>`;
  if (block.type === 'table') return `<label class="field"><span>Строки, по одной в строке</span><textarea id="block-rows" rows="4">${escapeHtml(asArray(block.rows).map((item) => item.label).join('\n'))}</textarea></label><label class="field"><span>Столбцы, по одному в строке</span><textarea id="block-columns" rows="4">${escapeHtml(asArray(block.columns).map((item) => item.label).join('\n'))}</textarea></label>`;
  if (block.type === 'ttk_builder') return `<div class="revision-panel"><strong>Полная технологическая карта</strong><p>Студент заполняет источник, рецептуру брутто/нетто, технологический процесс, выход, качество, хранение и подачу.</p></div><label class="field"><span>Минимум строк рецептуры</span><input id="block-min-ingredients" type="number" min="1" max="50" value="${escapeHtml(block.minIngredients || 3)}" /></label><label class="field"><span>Минимум операций</span><input id="block-min-steps" type="number" min="1" max="50" value="${escapeHtml(block.minSteps || 3)}" /></label><label class="switch-field"><span>Проверять, что брутто не меньше нетто</span><input id="block-gross-check" type="checkbox" ${block.enforceGrossNotLessThanNet !== false ? 'checked' : ''} /></label>`;
  if (block.type === 'crossword') return `<label class="field"><span>Подсказки, по одной в строке</span><textarea id="block-clues" rows="6">${escapeHtml(asArray(block.clues).map((item) => item.clue || item.label).join('\n'))}</textarea></label><label class="field"><span>Ответы через запятую</span><input id="block-key" value="${escapeHtml(keyDisplay(block))}" /></label>`;
  if (block.type === 'dish_assembly') return `<label class="field"><span>Компоненты, по одному в строке</span><textarea id="block-items" rows="5">${escapeHtml(asArray(block.components).map((item) => item.label).join('\n'))}</textarea></label><label class="field"><span>Зоны, по одной в строке</span><textarea id="block-slots" rows="4">${escapeHtml(asArray(block.slots).map((item) => item.label).join('\n'))}</textarea></label>`;
  if (block.type === 'observation_log') return `<label class="field"><span>Поля журнала, по одному в строке</span><textarea id="block-fields" rows="5">${escapeHtml(asArray(block.fields || block.columns).map((item) => item.label || item).join('\n'))}</textarea></label>`;
  if (block.type === 'file_evidence') return `<label class="field"><span>Разрешённые расширения через запятую</span><input id="block-accept" value="${escapeHtml(asArray(block.accept || block.allowedExtensions).join(', '))}" placeholder="pdf, jpg, png" /></label><label class="field"><span>Максимум файлов</span><input id="block-file-count" type="number" min="1" max="10" value="${escapeHtml(block.maxFiles || 3)}" /></label>`;
  return '';
}

function drawInspector() {
  const target = $('#block-inspector-content');
  const block = state.builder.blocks[state.builder.selectedIndex];
  if (!block) { target.innerHTML = '<div class="empty-state"><h2>Настройки блока</h2><p>Выберите блок на холсте.</p></div>'; return; }
  target.innerHTML = `<h2>${escapeHtml(BLOCK_LABELS[block.type] || 'Блок')}</h2><form class="inspector-form" id="inspector-form">
    <label class="field"><span>Заголовок</span><input id="block-title" value="${escapeHtml(block.title || '')}" /></label>
    <label class="field"><span>Формулировка</span><textarea id="block-prompt" rows="4">${escapeHtml(block.prompt || '')}</textarea></label>
    <label class="switch-field"><span>Обязательный блок</span><input id="block-required" type="checkbox" ${block.required ? 'checked' : ''} /></label>
    <label class="field"><span>Максимальный балл</span><input id="block-score" type="number" min="0" step="0.5" value="${escapeHtml(block.maxScore ?? 0)}" /></label>
    ${inspectorConfig(block)}
  </form>`;
  const bind = (selector, event, update) => $(selector, target)?.addEventListener(event, (e) => { update(e.target); drawCanvas(); markBuilderDirty(); });
  bind('#block-title', 'input', (field) => { block.title = field.value; });
  bind('#block-prompt', 'input', (field) => { block.prompt = field.value; });
  bind('#block-required', 'change', (field) => { block.required = field.checked; });
  bind('#block-score', 'input', (field) => { block.maxScore = Number(field.value) || 0; });
  bind('#block-formula', 'input', (field) => { block.formula = field.value; });
  bind('#block-unit', 'input', (field) => { block.unit = field.value; });
  bind('#block-key', 'input', (field) => { block.answerKey = field.value; });
  bind('#block-options', 'input', (field) => { block.options = linesToItems(field.value, block.options, 'option'); });
  bind('#block-items', 'input', (field) => { const items = linesToItems(field.value, block.items || block.availableSteps || block.components, 'item'); if (block.type === 'scheme_builder') block.availableSteps = items; else if (block.type === 'dish_assembly') block.components = items; else block.items = items; });
  bind('#block-categories', 'input', (field) => { block.categories = linesToItems(field.value, block.categories, 'category'); });
  bind('#block-slots', 'input', (field) => { block.slots = linesToItems(field.value, block.slots, 'slot'); });
  bind('#block-rows', 'input', (field) => { block.rows = linesToItems(field.value, block.rows, 'row'); });
  bind('#block-columns', 'input', (field) => { block.columns = linesToItems(field.value, block.columns, 'column'); });
  bind('#block-min-ingredients', 'input', (field) => { block.minIngredients = Math.max(1, Number(field.value) || 1); });
  bind('#block-min-steps', 'input', (field) => { block.minSteps = Math.max(1, Number(field.value) || 1); });
  bind('#block-gross-check', 'change', (field) => { block.enforceGrossNotLessThanNet = field.checked; });
  bind('#block-fields', 'input', (field) => { block.columns = linesToItems(field.value, block.columns || block.fields, 'field'); });
  bind('#block-clues', 'input', (field) => { block.clues = field.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((clue, index) => ({ id: block.clues?.[index]?.id || uniqueId('clue'), number: index + 1, clue })); });
  bind('#block-pairs', 'input', (field) => { block.pairs = field.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => { const [left, right] = line.split('|').map((part) => part.trim()); return { id: block.pairs?.[index]?.id || uniqueId('pair'), targetId: block.pairs?.[index]?.targetId || uniqueId('target'), left, right: right || '' }; }); });
  bind('#block-classification-key', 'input', (field) => {
    const normalized = (value) => String(value || '').trim().toLocaleLowerCase('ru');
    const assignments = {};
    field.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
      const [itemLabel, categoryLabel] = line.split('|').map((part) => part.trim());
      const item = asArray(block.items).find((entry) => normalized(entry.label || entry.text || entry.id) === normalized(itemLabel));
      const category = asArray(block.categories).find((entry) => normalized(entry.label || entry.text || entry.id) === normalized(categoryLabel));
      if (item && category) assignments[item.id] = category.id;
    });
    block.answerKey = { assignments };
  });
  bind('#block-accept', 'input', (field) => { block.allowedExtensions = field.value.split(',').map((item) => item.trim().replace(/^\./, '')).filter(Boolean); });
  bind('#block-file-count', 'input', (field) => { block.maxFiles = Number(field.value) || 1; });
}

function linesToItems(value, previous = [], prefix = 'item') {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((label, index) => ({ id: previous?.[index]?.id || uniqueId(prefix), label }));
}

function addBlock(type) {
  state.builder.blocks.push(defaultBlock(type));
  state.builder.selectedIndex = state.builder.blocks.length - 1;
  drawCanvas(); drawInspector(); markBuilderDirty();
  $(`[data-block-index="${state.builder.selectedIndex}"]`)?.scrollIntoView({ block: 'center' });
}

function selectBlock(index) { state.builder.selectedIndex = index; drawCanvas(); drawInspector(); }

function moveBlock(index, delta) {
  const next = index + delta;
  if (next < 0 || next >= state.builder.blocks.length) return;
  [state.builder.blocks[index], state.builder.blocks[next]] = [state.builder.blocks[next], state.builder.blocks[index]];
  state.builder.selectedIndex = next;
  drawCanvas(); drawInspector(); markBuilderDirty();
  toast(`Блок перемещён ${delta < 0 ? 'выше' : 'ниже'}.`, 'info', 1800);
}

function duplicateBlock(index) {
  const copy = typeof structuredClone === 'function' ? structuredClone(state.builder.blocks[index]) : JSON.parse(JSON.stringify(state.builder.blocks[index]));
  copy.id = uniqueId(copy.type);
  copy.title = `${copy.title || BLOCK_LABELS[copy.type]} — копия`;
  state.builder.blocks.splice(index + 1, 0, copy);
  state.builder.selectedIndex = index + 1;
  drawCanvas(); drawInspector(); markBuilderDirty();
}

async function deleteBlock(index) {
  const confirmed = await confirmAction({ title: 'Удалить блок?', message: 'Ответы этого блока не войдут в следующую версию работы.', acceptLabel: 'Удалить', danger: true });
  if (!confirmed) return;
  state.builder.blocks.splice(index, 1);
  state.builder.selectedIndex = Math.min(index, state.builder.blocks.length - 1);
  drawCanvas(); drawInspector(); markBuilderDirty();
}

function markBuilderDirty() {
  state.builder.dirty = true;
  setTeacherSave('pending', 'Есть изменения');
  state.builder.saveDraft();
}

function privateKeyForBlock(block) {
  const raw = block.answerKey;
  if (block.type === 'matching' && (raw === undefined || raw === null || raw === '') && asArray(block.pairs).length) {
    return { pairs: Object.fromEntries(asArray(block.pairs).map((pair) => [pair.id, pair.targetId || `${pair.id}-target`])) };
  }
  if ((raw === undefined || raw === null || raw === '') && block.privateKey && typeof block.privateKey === 'object') return block.privateKey;
  if (raw && typeof raw === 'object') return raw;
  const text = String(raw ?? '').trim();
  if (!text) return {};
  if (text.startsWith('{')) {
    try { return JSON.parse(text); } catch { return {}; }
  }
  const tokens = text.split(',').map((item) => item.trim()).filter(Boolean);
  if (block.type === 'single_choice') {
    const option = asArray(block.options)[Math.max(0, Number(tokens[0]) - 1)] || asArray(block.options).find((item) => String(item.id) === tokens[0]);
    return option ? { optionId: option.id } : {};
  }
  if (block.type === 'multiple_choice') {
    const optionIds = tokens.map((token) => asArray(block.options)[Number(token) - 1]?.id || asArray(block.options).find((item) => String(item.id) === token)?.id).filter(Boolean);
    return optionIds.length ? { optionIds } : {};
  }
  if (block.type === 'calculation') return Number.isFinite(Number(text.replace(',', '.'))) ? { value: Number(text.replace(',', '.')), unit: block.unit || '' } : {};
  if (block.type === 'ordering') {
    const order = tokens.map((token) => asArray(block.items)[Number(token) - 1]?.id || asArray(block.items).find((item) => String(item.id) === token)?.id).filter(Boolean);
    return order.length ? { order } : {};
  }
  if (block.type === 'crossword') {
    const words = Object.fromEntries(asArray(block.clues).map((clue, index) => [clue.id, tokens[index] || '']).filter(([, value]) => value));
    return Object.keys(words).length ? { words } : {};
  }
  return block.privateKey && typeof block.privateKey === 'object' ? block.privateKey : {};
}

function blockForSave(block) {
  const result = { ...block, privateKey: privateKeyForBlock(block) };
  if (block.type === 'matching' && asArray(block.pairs).length) {
    result.leftItems = asArray(block.pairs).map((pair) => ({ id: pair.id, label: pair.left || pair.label || pair.id }));
    result.rightItems = asArray(block.pairs).map((pair) => ({ id: pair.targetId || `${pair.id}-target`, label: pair.right || pair.match || pair.id }));
  }
  if (block.type === 'file_evidence') {
    result.allowedExtensions = asArray(block.allowedExtensions).map((item) => String(item).replace(/^\./, ''));
    result.allowedMimeTypes = asArray(block.allowedMimeTypes).length ? block.allowedMimeTypes : ['application/pdf', 'image/jpeg', 'image/png'];
  }
  return result;
}

async function saveBuilder() {
  if (!state.builder?.dirty) return;
  setTeacherSave('saving', 'Сохраняем…');
  const { template, blocks, rubric } = state.builder;
  try {
    const payload = await teacherApi.updateTemplate(idOf(template), {
      title: template.title,
      courseId: template.courseId || template.course_id || null,
      defaultGroupId: template.defaultGroupId || null,
      defaultDueAt: template.defaultDueAt || null,
      blocks: blocks.map(blockForSave),
      rubric,
      expectedRevision: template.draftRevision ?? template.draft_revision ?? template.revision ?? 0,
      status: 'draft',
    });
    const saved = payload.template || payload.draft || payload;
    state.builder.template = { ...template, ...saved };
    state.builder.dirty = false;
    setTeacherSave('saved', 'Сохранено');
  } catch (error) {
    setTeacherSave('error', 'Ошибка сохранения');
    toast(errorText(error), 'danger');
    throw error;
  }
}

async function flushBuilder() {
  state.builder?.saveDraft?.cancel?.();
  if (state.builder?.dirty) await saveBuilder();
}

function previewBuilder() {
  const dialog = $('#preview-dialog');
  const target = $('#preview-content');
  state.previewControllers.forEach((controller) => controller?.destroy?.());
  state.previewControllers = [];
  target.innerHTML = `<p class="section-kicker">Предпросмотр студента</p><h2>${escapeHtml(state.builder.template.title || 'Учебная работа')}</h2>${state.builder.blocks.map((block, index) => `<section class="answer-review"><h3>${index + 1}. ${escapeHtml(block.title || BLOCK_LABELS[block.type])}</h3><div data-preview-block="${index}" class="task-surface"></div></section>`).join('')}`;
  $$('[data-preview-block]', target).forEach((element) => {
    const block = state.builder.blocks[Number(element.dataset.previewBlock)];
    state.previewControllers.push(mountTask(element, block, undefined, { readOnly: false, onChange: () => {}, preview: true }));
  });
  dialog.showModal();
}

async function publishBuilder(event) {
  try { await flushBuilder(); } catch { return; }
  const issues = builderIssues();
  if (issues.length) {
    toast(`Публикация невозможна: исправьте ${issues.length} пунктов.`, 'danger');
    $('#builder-issues')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const confirmed = await confirmAction({ title: 'Опубликовать версию?', message: 'Опубликованная версия станет неизменяемой. Дальнейшие правки создадут новый черновик.', acceptLabel: 'Опубликовать' });
  if (!confirmed) return;
  setBusy(event.currentTarget, true, 'Публикуем…');
  try {
    await teacherApi.publishTemplate(idOf(state.builder.template));
    state.templates = null;
    toast('Версия опубликована и готова к назначению.', 'success');
    navigate('works', { force: true });
  } catch (error) { toast(errorText(error), 'danger'); setBusy(event.currentTarget, false); }
}

async function renderAssignments(force = false) {
  renderLoading(content, 'Загружаем назначения…');
  try {
    await ensureCatalog();
    if (!state.templates) state.templates = await teacherApi.templates({ status: 'published' });
    if (!state.assignments || force) state.assignments = await teacherApi.assignments();
    drawAssignments();
  } catch (error) { renderError(content, error, () => renderAssignments(true)); }
}

function drawAssignments() {
  const { groups, subjects } = catalogData();
  const templates = templateItems().filter((item) => item.status === 'published' || item.publishedAt);
  const rows = dashboardAssignments(state.assignments);
  content.innerHTML = `<div class="teacher-page">
    ${pageHeader('Планирование', 'Назначения', 'Назначьте опубликованную версию одной или нескольким группам.')}
    <section class="panel" aria-labelledby="assign-form-title"><div class="panel-head"><h2 id="assign-form-title">Новое назначение</h2></div><div class="panel-body"><form id="assignment-form" class="teacher-filter-row">
      <label class="field"><span>Работа</span><select id="assign-template" required>${optionsHtml(templates, '', 'Выберите работу')}</select></label>
      <label class="field"><span>Группы</span><select id="assign-groups" multiple size="3" required>${groups.map((item) => `<option value="${escapeHtml(idOf(item))}">${escapeHtml(nameOf(item))}</option>`).join('')}</select></label>
      <label class="field"><span>Предмет</span><select id="assign-subject" required>${optionsHtml(subjects, '', 'Выберите предмет')}</select></label>
      <label class="field"><span>Срок</span><input id="assign-due" type="datetime-local" required /></label>
      <button class="learning-button primary" type="submit">Назначить</button>
    </form></div></section>
    <section class="panel" style="margin-top:22px" aria-labelledby="assign-list-title"><div class="panel-head"><h2 id="assign-list-title">Действующие назначения</h2><span>${rows.length}</span></div><div class="panel-body"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Работа</th><th>Группа</th><th>Предмет</th><th>Срок</th><th>Сдано</th><th>Статус</th></tr></thead><tbody>${rows.map((item) => `<tr><td data-label="Работа">${escapeHtml(item.title)}</td><td data-label="Группа">${escapeHtml(item.group)}</td><td data-label="Предмет">${escapeHtml(item.subject)}</td><td data-label="Срок">${escapeHtml(formatDate(item.dueAt, { withTime: true }))}</td><td data-label="Сдано">${item.pending}</td><td data-label="Статус">${statusBadge(item.status)}</td></tr>`).join('')}</tbody></table></div></div></section>
  </div>`;
  const applyTemplateDefaults = () => {
    const selected = templates.find((item) => String(item.id) === $('#assign-template').value);
    if (!selected) return;
    const defaultGroupId = selected.defaultGroupId || selected.default_group_id;
    Array.from($('#assign-groups').options).forEach((option) => { option.selected = String(option.value) === String(defaultGroupId); });
    const defaultDue = selected.defaultDueAt || selected.default_due_at;
    if (defaultDue) $('#assign-due').value = toLocalDateInput(defaultDue);
    const course = catalogData().courses.find((item) => String(idOf(item)) === String(selected.courseId || selected.course_id));
    const subjectId = course?.subjectId || course?.subject_id;
    if (subjectId) $('#assign-subject').value = String(subjectId);
  };
  $('#assign-template').addEventListener('change', applyTemplateDefaults);
  $('#assignment-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const button = $('button[type="submit"]', event.currentTarget);
    setBusy(button, true, 'Назначаем…');
    try {
      await teacherApi.createAssignment({
        templateId: $('#assign-template').value,
        versionId: templates.find((item) => String(item.id) === $('#assign-template').value)?.currentVersionId || templates.find((item) => String(item.id) === $('#assign-template').value)?.current_version_id,
        courseId: templates.find((item) => String(item.id) === $('#assign-template').value)?.courseId || templates.find((item) => String(item.id) === $('#assign-template').value)?.course_id,
        groupIds: Array.from($('#assign-groups').selectedOptions, (option) => option.value),
        subjectId: $('#assign-subject').value,
        dueAt: new Date($('#assign-due').value).toISOString(),
      });
      state.assignments = null; state.overview = null;
      toast('Работа назначена выбранным группам.', 'success');
      renderAssignments(true);
    } catch (error) { toast(errorText(error), 'danger'); setBusy(button, false); }
  });
}

async function renderReview(force = false) {
  renderLoading(content, 'Загружаем очередь проверки…');
  try {
    if (!state.submissions || force) state.submissions = await teacherApi.submissions();
    drawReviewQueue(new URL(location.href).searchParams.get('id'));
  } catch (error) { renderError(content, error, () => renderReview(true)); }
}

function submissionItems(payload = state.submissions) {
  return asArray(pick(payload, 'submissions', 'items', 'queue')).map((item) => ({
    ...item, id: idOf(item), student: item.studentName || item.student?.displayName || item.student?.display_name || item.student?.name || 'Студент',
    title: item.assignmentTitle || item.assignment?.title || item.workTitle || item.title || 'Учебная работа', group: item.groupName || item.assignment?.group?.name || item.group?.name || '—',
    submittedAt: item.submittedAt || item.submitted_at || item.updatedAt || item.updated_at, status: item.status || 'submitted',
  }));
}

function drawReviewQueue(selectedId) {
  const rows = submissionItems().filter((item) => ['submitted', 'resubmitted', 'under_review', 'needs_revision', 'returned'].includes(String(item.status).toLowerCase()));
  content.innerHTML = `<div class="teacher-page">${pageHeader('Оценивание', 'Проверка', 'Автоматические результаты, ручная рубрика и обратная связь.')}${rows.length ? `<div class="review-layout"><aside class="review-queue" aria-label="Очередь проверки">${rows.map((item) => `<button type="button" class="review-queue-item" data-submission-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.student)}</strong><span>${escapeHtml(item.title)} · ${escapeHtml(item.group)}</span><span>${escapeHtml(formatDate(item.submittedAt, { withTime: true }))} · ${escapeHtml(statusMeta(item.status)[0])}</span></button>`).join('')}</aside><section id="review-workbench" class="review-workbench"><div class="content-state"><p>Выберите работу слева.</p></div></section></div>` : '<div class="empty-state"><h2>Очередь пуста</h2><p>Новые сдачи появятся здесь автоматически.</p></div>'}</div>`;
  $$('[data-submission-id]').forEach((button) => button.addEventListener('click', () => openSubmissionReview(button.dataset.submissionId)));
  const firstId = selectedId && rows.some((row) => String(row.id) === String(selectedId)) ? selectedId : rows[0]?.id;
  if (firstId) openSubmissionReview(firstId);
}

async function openSubmissionReview(id) {
  $$('[data-submission-id]').forEach((button) => button.classList.toggle('is-active', String(button.dataset.submissionId) === String(id)));
  setViewInUrl('review', { id }, true);
  const target = $('#review-workbench');
  renderLoading(target, 'Открываем ответы…');
  try {
    const payload = await teacherApi.submission(id);
    drawSubmissionReview(payload?.submission ? payload : { submission: payload }, id);
  } catch (error) { renderError(target, error, () => openSubmissionReview(id)); }
}

function reviewDetail(payload) {
  const submission = payload.submission || payload;
  const assignment = payload.assignment || submission.assignment || {};
  const version = payload.work || submission.work || payload.workVersion || payload.version || submission.workVersion || {};
  const definition = jsonObject(version.contentJson || version.content_json || payload.contentJson || payload.content_json || assignment.contentJson, {});
  const blocks = asArray(version.blocks || definition.blocks || payload.blocks).map((block) => ({ ...block, ...(block.config || {}), type: block.type || block.block_type, maxScore: block.maxScore ?? block.max_score }));
  const latestRevision = asArray(payload.revisions || submission.revisions).at(-1);
  const rawAnswers = jsonObject(submission.answersJson || submission.answers_json || submission.answers || latestRevision?.answers, {});
  const answers = Object.fromEntries(Object.entries(rawAnswers).map(([blockId, answer]) => [blockId, answer && typeof answer === 'object' && Object.prototype.hasOwnProperty.call(answer, 'value') ? answer.value : answer]));
  const rubric = asArray(jsonObject(version.rubric || version.publicRubric || version.public_rubric_json || definition.rubric || submission.rubric, [])).map((criterion) => ({ ...criterion, maxScore: criterion.maxScore ?? criterion.max_score }));
  return { submission, assignment, blocks, answers, rubric, definition };
}

function drawSubmissionReview(payload, id) {
  const { submission, assignment, blocks, answers, rubric } = reviewDetail(payload);
  const target = $('#review-workbench');
  state.reviewControllers.forEach((controller) => controller?.destroy?.());
  state.reviewControllers = [];
  target.innerHTML = `<div class="panel"><div class="panel-head"><div><p class="section-kicker">${escapeHtml(submission.studentName || submission.student?.displayName || submission.student?.display_name || 'Студент')}</p><h2>${escapeHtml(assignment.title || submission.assignmentTitle || 'Учебная работа')}</h2></div>${statusBadge(submission.status)}</div><div class="panel-body">
    <div class="summary-strip"><div class="summary-item"><span>Автобаллы</span><strong>${escapeHtml(submission.autoScore ?? submission.auto_score ?? '—')}</strong></div><div class="summary-item"><span>Попытка</span><strong>${escapeHtml(submission.attemptNumber || submission.current_revision_no || 1)}</strong></div><div class="summary-item"><span>Отправлено</span><strong>${escapeHtml(formatDate(submission.submittedAt || submission.submitted_at, { withTime: true }))}</strong></div><div class="summary-item"><span>Срок</span><strong>${escapeHtml(formatDate(assignment.dueAt || assignment.due_at || submission.dueAt))}</strong></div></div>
    <div>${blocks.map((block, index) => `<section class="answer-review"><h3>${index + 1}. ${escapeHtml(block.title || BLOCK_LABELS[block.type] || 'Задание')}</h3><div class="task-surface" data-review-answer="${index}"></div>${submission.blockComments?.[block.id] ? `<p><strong>Комментарий:</strong> ${escapeHtml(submission.blockComments[block.id])}</p>` : ''}</section>`).join('') || '<p>В версии нет блоков.</p>'}</div>
    <section class="panel" aria-labelledby="rubric-title"><div class="panel-head"><h3 id="rubric-title">Рубрика проверки</h3></div><div class="panel-body"><form id="review-form"><div class="rubric-editor">${rubric.map((criterion, index) => { const saved = asArray(submission.rubricScores).find((item) => String(item.criterionId || item.criterion_id || item.rubric_criterion_id) === String(criterion.id)); return `<label class="rubric-editor-row"><span>${escapeHtml(criterion.title || criterion.name)} <small>до ${escapeHtml(criterion.maxScore ?? criterion.points ?? 1)}</small></span><input type="number" min="0" max="${escapeHtml(criterion.maxScore ?? criterion.points ?? 1)}" step="0.5" data-rubric-id="${escapeHtml(criterion.id || `criterion-${index + 1}`)}" value="${escapeHtml(saved?.score ?? '')}" aria-label="Баллы: ${escapeHtml(criterion.title || criterion.name)}" /></label>`; }).join('') || '<p>Для этой работы отдельная рубрика не задана.</p>'}</div><label class="field" style="margin-top:14px"><span>Комментарий студенту</span><textarea id="review-comment" rows="5">${escapeHtml(submission.feedback || submission.teacherComment || '')}</textarea></label><label class="field"><span>Итоговая оценка</span><input id="review-grade" inputmode="decimal" value="${escapeHtml(submission.grade ?? '')}" placeholder="Рассчитывается по баллам" /></label><div class="review-actions"><button id="return-review" class="learning-button secondary" type="button">Вернуть на доработку</button><button id="grade-review" class="learning-button primary" type="button">Принять и опубликовать оценку</button></div></form></div></section>
  </div></div>`;
  $$('[data-review-answer]', target).forEach((element) => {
    const block = blocks[Number(element.dataset.reviewAnswer)];
    state.reviewControllers.push(mountTask(element, block, answers[block.id], { readOnly: true }));
  });
  $('#return-review').addEventListener('click', (event) => completeReview(id, 'return', event.currentTarget));
  $('#grade-review').addEventListener('click', (event) => completeReview(id, 'grade', event.currentTarget));
}

function reviewPayload() {
  const rubricScores = [];
  $$('[data-rubric-id]').forEach((input) => { if (input.value !== '') rubricScores.push({ criterionId: input.dataset.rubricId, score: Number(input.value) }); });
  return { rubricScores, comment: $('#review-comment').value.trim(), feedback: $('#review-comment').value.trim(), grade: $('#review-grade').value.trim(), publish: true, totalScore: rubricScores.reduce((sum, item) => sum + item.score, 0) };
}

async function completeReview(id, action, button) {
  const body = reviewPayload();
  if (action === 'return' && !body.comment) { toast('Добавьте комментарий: студенту нужно понимать, что исправить.', 'danger'); $('#review-comment').focus(); return; }
  if (action === 'grade' && $$('[data-rubric-id]').some((input) => input.value === '')) { toast('Заполните баллы по всем критериям.', 'danger'); $$('[data-rubric-id]').find((input) => input.value === '')?.focus(); return; }
  const confirmed = await confirmAction({
    title: action === 'return' ? 'Вернуть работу на доработку?' : 'Опубликовать оценку?',
    message: action === 'return' ? 'Студент сможет изменить ответы и отправить работу повторно.' : 'Результат появится в кабинете студента и журнале.',
    acceptLabel: action === 'return' ? 'Вернуть' : 'Опубликовать',
  });
  if (!confirmed) return;
  setBusy(button, true, action === 'return' ? 'Возвращаем…' : 'Публикуем…');
  try {
    if (action === 'return') await teacherApi.returnReview(id, body); else await teacherApi.grade(id, body);
    state.submissions = null; state.overview = null; state.journal = null;
    toast(action === 'return' ? 'Работа возвращена студенту.' : 'Оценка опубликована.', 'success');
    renderReview(true);
  } catch (error) { toast(errorText(error), 'danger'); setBusy(button, false); }
}

async function renderGroups() {
  renderLoading(content, 'Загружаем группы…');
  try { await ensureCatalog(); drawGroups(); } catch (error) { renderError(content, error, () => { state.catalog = null; renderGroups(); }); }
}

function drawGroups() {
  const { groups, subjects, courses } = catalogData();
  const isAdmin = asArray(state.user?.roles).includes('admin') || state.user?.role === 'admin';
  content.innerHTML = `<div class="teacher-page">${pageHeader('Состав групп', 'Группы и предметы', 'Создавайте учебный контур, затем импортируйте список студентов с предварительной проверкой.')}
    <div class="section-stack">
    ${isAdmin ? `<section class="panel"><div class="panel-head"><div><h2>Учебный комплект МДК 01.01</h2><p class="muted">Пять пронумерованных практических работ с интерактивными заданиями, расчётами, подсказками и контролем выполнения.</p></div><button id="seed-pilot" class="learning-button primary" type="button">Обновить комплект</button></div><div id="pilot-result" class="panel-body hidden"></div></section>` : ''}
    <section class="panel"><div class="panel-head"><h2>Учебный контур</h2><span>${groups.length} групп · ${subjects.length} предметов · ${courses.length} курсов</span></div><div class="panel-body"><div class="summary-grid">
      <form id="create-group-form" class="summary-card"><h3>Новая группа</h3><label class="field"><span>Код</span><input id="new-group-code" placeholder="1-ПК-24Б" required /></label><label class="field"><span>Название</span><input id="new-group-name" placeholder="1-ПК-24Б" required /></label><button class="learning-button secondary" type="submit">Добавить группу</button></form>
      <form id="create-subject-form" class="summary-card"><h3>Новый предмет</h3><label class="field"><span>Код</span><input id="new-subject-code" placeholder="МДК 03.01" required /></label><label class="field"><span>Название</span><input id="new-subject-name" required /></label><button class="learning-button secondary" type="submit">Добавить предмет</button></form>
      <form id="create-course-form" class="summary-card"><h3>Связать предмет и группу</h3><label class="field"><span>Название курса</span><input id="new-course-name" required /></label><label class="field"><span>Предмет</span><select id="new-course-subject" required>${optionsHtml(subjects, '', 'Выберите предмет')}</select></label><label class="field"><span>Группа</span><select id="new-course-group" required>${optionsHtml(groups, '', 'Выберите группу')}</select></label><label class="field"><span>Учебный год</span><input id="new-course-year" value="2026/2027" required /></label><button class="learning-button secondary" type="submit">Создать курс</button></form>
    </div></div></section>
    <section class="panel"><div class="panel-head"><h2>Доступные группы</h2><span>${groups.length}</span></div><div class="panel-body"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Группа</th><th>Студентов</th><th>Обновлено</th><th>Действие</th></tr></thead><tbody>${groups.map((group) => `<tr><td data-label="Группа"><strong>${escapeHtml(nameOf(group))}</strong></td><td data-label="Студентов">${escapeHtml(group.studentCount ?? group.studentsCount ?? asArray(group.students).length)}</td><td data-label="Обновлено">${escapeHtml(formatDate(group.updatedAt || group.updated_at))}</td><td data-label="Действие"><button class="learning-button quiet" data-open-group="${escapeHtml(idOf(group))}" type="button">Открыть состав</button></td></tr>`).join('')}</tbody></table></div></div></section>
    <section id="group-students-panel" class="panel hidden" aria-live="polite"></section>
    <section class="panel" aria-labelledby="import-title"><div class="panel-head"><h2 id="import-title">Импорт состава</h2></div><div class="panel-body"><form id="roster-form"><div class="teacher-filter-row"><label class="field"><span>Группа</span><select id="roster-group" required>${optionsHtml(groups, '', 'Выберите группу')}</select></label><label class="field"><span>CSV-файл</span><input id="roster-file" type="file" accept=".csv,text/csv,text/plain" /></label></div><label class="field" style="margin-top:14px"><span>Данные CSV: код; ФИО</span><textarea id="roster-data" rows="8" placeholder="С001;Иванов Иван Иванович" required></textarea></label><button class="learning-button secondary" type="submit">Проверить импорт</button></form><div id="roster-preview" class="roster-preview"></div></div></section></div></div>`;
  $('#create-group-form').addEventListener('submit', (event) => createCatalogEntity(event, () => teacherApi.createGroup({ code: $('#new-group-code').value, name: $('#new-group-name').value }), 'Группа добавлена.'));
  $('#create-subject-form').addEventListener('submit', (event) => createCatalogEntity(event, () => teacherApi.createSubject({ code: $('#new-subject-code').value, name: $('#new-subject-name').value }), 'Предмет добавлен.'));
  $('#create-course-form').addEventListener('submit', (event) => createCatalogEntity(event, () => teacherApi.createCourse({ name: $('#new-course-name').value, subjectId: $('#new-course-subject').value, groupIds: [$('#new-course-group').value], academicYear: $('#new-course-year').value }), 'Учебный курс создан.'));
  $('#seed-pilot')?.addEventListener('click', seedPilot);
  $$('[data-open-group]').forEach((button) => button.addEventListener('click', () => openGroupStudents(button.dataset.openGroup)));
  $('#roster-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Файл больше 2 МБ. Разделите список на части.', 'danger'); return; }
    $('#roster-data').value = await file.text();
  });
  $('#roster-form').addEventListener('submit', previewRoster);
}

async function openGroupStudents(groupId) {
  const target = $('#group-students-panel');
  target.classList.remove('hidden');
  target.innerHTML = '<div class="panel-body"><div class="loading-state"><span class="spinner" aria-hidden="true"></span><p>Загружаем состав группы…</p></div></div>';
  try {
    const result = await teacherApi.groupStudents(groupId);
    const students = asArray(result.students);
    target.innerHTML = `<div class="panel-head"><div><h2>${escapeHtml(nameOf(result.group, 'Состав группы'))}</h2><p class="muted">Студенты выбирают группу и своё ФИО при входе.</p></div><span>${students.length}</span></div><div class="panel-body">${students.length ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Студент</th><th>Статус</th></tr></thead><tbody>${students.map((student) => `<tr><td data-label="Студент"><strong>${escapeHtml(student.displayName || 'Студент')}</strong></td><td data-label="Статус">${statusBadge(student.status || 'active')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><h3>В группе пока нет студентов</h3><p>Добавьте состав через импорт CSV ниже.</p></div>'}</div>`;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    target.innerHTML = `<div class="panel-body"><div class="form-error" role="alert">${escapeHtml(errorText(error))}</div></div>`;
  }
}

async function createCatalogEntity(event, action, successMessage) {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const button = $('button[type="submit"]', event.currentTarget);
  setBusy(button, true, 'Сохраняем…');
  try {
    await action();
    state.catalog = null;
    toast(successMessage, 'success');
    await renderGroups();
  } catch (error) {
    toast(errorText(error), 'danger');
    setBusy(button, false);
  }
}

function drawPilotResult(target, students) {
  target.innerHTML = `<div class="revision-panel"><strong>Пилотный выпуск готов</strong><p>Студент выбирает пилотную группу и своё ФИО. Логин и пароль не требуются.</p></div>${students.length ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>ФИО</th></tr></thead><tbody>${students.map((item) => `<tr><td data-label="ФИО">${escapeHtml(item.displayName || 'Студент')}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
}

async function seedPilot(event) {
  const confirmed = await confirmAction({ title: 'Обновить учебный комплект?', message: 'Будут созданы или обновлены пять практических работ МДК 01.01 и назначения для выбранной в настройках группы. Уже начатые работы сохранятся.', acceptLabel: 'Обновить' });
  if (!confirmed) return;
  setBusy(event.currentTarget, true, 'Разворачиваем…');
  const resultBox = $('#pilot-result');
  resultBox.classList.remove('hidden');
  try {
    const result = await teacherApi.seedPilot();
    state.catalog = null; state.templates = null; state.assignments = null; state.overview = null;
    await ensureCatalog();
    drawGroups();
    const refreshedResultBox = $('#pilot-result');
    refreshedResultBox.classList.remove('hidden');
    drawPilotResult(refreshedResultBox, asArray(result.credentials));
    toast(result.seeded ? 'Пилотный выпуск готов.' : 'Пилот уже был подготовлен.', 'success');
  } catch (error) {
    resultBox.innerHTML = `<div class="form-error" role="alert">${escapeHtml(errorText(error))}</div>`;
    setBusy(event.currentTarget, false);
  }
}

async function previewRoster(event) {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const button = $('button[type="submit"]', event.currentTarget);
  setBusy(button, true, 'Проверяем…');
  try {
    const group = catalogData().groups.find((item) => String(idOf(item)) === $('#roster-group').value);
    const students = $('#roster-data').value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
      const cells = line.split(/[;,\t]/).map((cell) => cell.trim());
      return { sourceRow: index + 1, code: cells[0] || '', displayName: cells[1] || cells[0] || '' };
    }).filter((row, index) => !(index === 0 && /фио|имя|name/i.test(row.displayName)));
    state.rosterRequest = { groupCode: group?.code || nameOf(group), groupName: nameOf(group), students };
    state.rosterPreview = await teacherApi.rosterPreview(state.rosterRequest);
    drawRosterPreview();
  } catch (error) { toast(errorText(error), 'danger'); }
  finally { setBusy(button, false); }
}

function drawRosterPreview() {
  const payload = state.rosterPreview || {};
  const rows = asArray(pick(payload, 'rows', 'students', 'items', 'preview'));
  const accepted = rows.filter((row) => row.valid !== false && !row.error);
  const rejected = rows.filter((row) => row.valid === false || row.error);
  const target = $('#roster-preview');
  target.innerHTML = `<div class="panel"><div class="panel-head"><h3>Предпросмотр</h3><span>Принято: ${accepted.length} · Ошибок: ${rejected.length}</span></div><div class="panel-body"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Строка</th><th>Код</th><th>ФИО</th><th>Результат</th></tr></thead><tbody>${rows.map((row, index) => `<tr><td data-label="Строка">${row.line || index + 1}</td><td data-label="Код">${escapeHtml(row.code || '')}</td><td data-label="ФИО">${escapeHtml(row.displayName || row.name || '')}</td><td data-label="Результат">${row.error ? `<span class="form-error">${escapeHtml(row.error)}</span>` : '<span class="status-mark success">Готово</span>'}</td></tr>`).join('')}</tbody></table></div>${accepted.length ? '<div class="review-actions"><button id="roster-commit" class="learning-button primary" type="button">Сохранить состав</button></div>' : ''}</div></div>`;
  $('#roster-commit')?.addEventListener('click', commitRoster);
}

async function commitRoster(event) {
  const confirmed = await confirmAction({ title: 'Сохранить состав группы?', message: 'Студенты появятся в списке выбора ФИО для указанной группы.', acceptLabel: 'Сохранить' });
  if (!confirmed) return;
  setBusy(event.currentTarget, true, 'Сохраняем…');
  try {
    await teacherApi.rosterCommit(state.rosterRequest);
    state.catalog = null; state.rosterPreview = null; state.rosterRequest = null;
    toast('Состав группы обновлён.', 'success');
    await renderGroups();
  } catch (error) { toast(errorText(error), 'danger'); setBusy(event.currentTarget, false); }
}

async function renderJournal(force = false) {
  renderLoading(content, 'Загружаем журнал…');
  try {
    await ensureCatalog();
    if (!state.journal || force) state.journal = await teacherApi.journal();
    drawJournal();
  } catch (error) { renderError(content, error, () => renderJournal(true)); }
}

function journalRows(payload = state.journal) {
  return asArray(pick(payload, 'entries', 'items', 'journal')).map((row) => ({
    ...row, student: row.studentName || row.student?.displayName || row.student?.name || 'Студент',
    group: row.groupName || row.group?.name || (typeof row.group === 'string' ? row.group : '') || '—', subject: row.subjectName || row.subject?.name || (typeof row.subject === 'string' ? row.subject : '') || '—',
    work: row.assignmentTitle || row.workTitle || row.title || 'Работа', score: row.finalScore ?? row.score, grade: row.grade || '—',
  }));
}

function drawJournal() {
  const { groups, subjects } = catalogData();
  const rows = journalRows();
  content.innerHTML = `<div class="teacher-page">${pageHeader('Результаты', 'Журнал', 'Опубликованные оценки и выгрузка для учебного учёта.', '<button id="export-journal" class="learning-button secondary" type="button">Экспорт CSV</button>')}
    <div class="teacher-filter-row"><label class="field"><span>Группа</span><select id="journal-group">${optionsHtml(groups)}</select></label><label class="field"><span>Предмет</span><select id="journal-subject">${optionsHtml(subjects)}</select></label><label class="field"><span>Поиск</span><input id="journal-search" type="search" placeholder="Студент или работа" /></label></div><div id="journal-results" style="margin-top:20px"></div></div>`;
  const filteredRows = () => {
    const group = $('#journal-group').value;
    const subject = $('#journal-subject').value;
    const groupName = nameOf(groups.find((item) => String(idOf(item)) === group), '');
    const subjectName = nameOf(subjects.find((item) => String(idOf(item)) === subject), '');
    const query = $('#journal-search').value.trim().toLocaleLowerCase('ru');
    return rows.filter((row) => (!group || String(row.groupId || row.group?.id || '') === group || row.group === groupName) && (!subject || String(row.subjectId || row.subject?.id || '') === subject || row.subject === subjectName) && (!query || `${row.student} ${row.work}`.toLocaleLowerCase('ru').includes(query)));
  };
  const draw = () => {
    const filtered = filteredRows();
    const target = $('#journal-results');
    if (!filtered.length) { renderEmpty(target, 'Записей нет', 'Оценки появятся после публикации результатов проверки.'); return; }
    target.innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Студент</th><th>Группа</th><th>Предмет</th><th>Работа</th><th>Баллы</th><th>Оценка</th><th>Опубликовано</th></tr></thead><tbody>${filtered.map((row) => `<tr><td data-label="Студент">${escapeHtml(row.student)}</td><td data-label="Группа">${escapeHtml(row.group)}</td><td data-label="Предмет">${escapeHtml(row.subject)}</td><td data-label="Работа">${escapeHtml(row.work)}</td><td data-label="Баллы">${escapeHtml(row.score ?? '—')}${row.maxScore ? ` / ${escapeHtml(row.maxScore)}` : ''}</td><td data-label="Оценка"><strong>${escapeHtml(row.grade)}</strong></td><td data-label="Опубликовано">${escapeHtml(formatDate(row.publishedAt || row.gradedAt))}</td></tr>`).join('')}</tbody></table></div>`;
  };
  ['#journal-group', '#journal-subject', '#journal-search'].forEach((selector) => $(selector).addEventListener('input', draw));
  $('#export-journal').addEventListener('click', () => {
    const exportRows = filteredRows();
    downloadCsv(`learning-journal-${new Date().toISOString().slice(0, 10)}.csv`, [['Студент', 'Группа', 'Предмет', 'Работа', 'Баллы', 'Максимум', 'Оценка', 'Дата'], ...exportRows.map((row) => [row.student, row.group, row.subject, row.work, row.score ?? '', row.maxScore ?? '', row.grade, formatDate(row.publishedAt || row.gradedAt)])]);
    toast('Журнал подготовлен к скачиванию.', 'success');
  });
  draw();
}

function renderSettings() {
  content.innerHTML = `<div class="teacher-page">${pageHeader('Параметры', 'Настройки', 'Безопасность учётной записи и сведения о пилоте.')}
    <div class="section-stack"><section class="panel"><div class="panel-head"><h2>Учётная запись</h2></div><div class="panel-body"><dl><dt>Пользователь</dt><dd>${escapeHtml(fullName(state.user))}</dd><dt>Роль</dt><dd>Преподаватель</dd></dl><button id="open-password-change" class="learning-button secondary" type="button">Сменить пароль</button></div></section><section class="panel"><div class="panel-head"><h2>О пилоте</h2></div><div class="panel-body"><p>Модуль «Учебные работы» хранит версии работ, ответы, проверки и журнал отдельно от олимпиадных сценариев.</p><p>Закрытые ключи автоматической проверки недоступны студентам. Выгрузка журнала выполняется только по явному действию преподавателя.</p></div></section></div></div>`;
  $('#open-password-change').addEventListener('click', () => $('#password-dialog').showModal());
}

$$('[data-teacher-view]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.teacherView)));
$('#teacher-logout').addEventListener('click', logout);
$('#sidebar-toggle').addEventListener('click', (event) => {
  const open = !$('#teacher-sidebar').classList.contains('is-open');
  $('#teacher-sidebar').classList.toggle('is-open', open);
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !$('#teacher-sidebar').classList.contains('is-open')) return;
  $('#teacher-sidebar').classList.remove('is-open');
  $('#sidebar-toggle').setAttribute('aria-expanded', 'false');
  $('#sidebar-toggle').focus();
});
window.addEventListener('popstate', () => {
  const params = new URL(location.href).searchParams;
  navigate(params.get('view') || 'overview', { id: params.get('id'), replace: true });
});
window.addEventListener('beforeunload', (event) => {
  if (state.builder?.dirty) { event.preventDefault(); event.returnValue = ''; }
});

const session = initSession({
  expectedRole: 'teacher', shellSelector: '#teacher-shell',
  onReady: async (user) => {
    state.user = user;
    $('#teacher-name').textContent = fullName(user);
    $('#teacher-role').textContent = user.roleLabel || 'Преподаватель';
    $('.avatar').textContent = initials(fullName(user));
    const params = new URL(location.href).searchParams;
    await navigate(params.get('view') || 'overview', { id: params.get('id'), replace: true });
  },
});

session.check();
