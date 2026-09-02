import { attachmentApi, studentApi } from './api.js?v=1.1.3';
import { AutosaveQueue } from './autosave.js?v=1.1.1';
import { isValueMeaningful, mountTask } from './tasks.js?v=1.1.0';
import {
  $, $$, asArray, confirmAction, errorText, escapeHtml, formatDate, fullName,
  initSession, logout, pick, renderEmpty, renderError, renderLoading, setBusy,
  setViewInUrl, statusBadge, statusMeta, toast,
} from './ui.js?v=1.1.4';

const content = $('#student-content');
const saveState = $('#global-save-state');

const state = {
  user: null,
  dashboard: null,
  assignment: null,
  submission: null,
  blocks: [],
  answers: {},
  activeIndex: 0,
  taskController: null,
  autosave: null,
  conflict: null,
  view: new URL(location.href).searchParams.get('view') || 'dashboard',
};

function jsonObject(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function assignmentId(item = {}) {
  return item.id || item.assignmentId || item.assignment_id;
}

function normalizeAssignments(payload) {
  return asArray(pick(payload, 'assignments', 'items', 'works')).map((item) => ({
    ...item,
    id: assignmentId(item),
    title: item.title || item.workTitle || item.templateTitle || 'Учебная работа',
    subject: item.subjectName || item.subject?.name || item.subject || 'Предмет не указан',
    teacher: item.teacherName || item.teacher?.displayName || 'Преподаватель курса',
    dueAt: item.dueAt || item.deadline || item.due_at,
    status: item.submissionStatus || item.status || (item.submission ? item.submission.status : 'assigned'),
    score: item.finalScore ?? item.score ?? item.grade?.score ?? item.submission?.finalScore ?? item.submission?.score,
    gradeValue: typeof item.grade === 'object' ? (item.grade.value || item.grade.label) : item.grade,
    maxScore: item.maxScore ?? item.grade?.maxScore ?? item.submission?.maxScore,
  }));
}

function normalizeDetail(payload) {
  const assignment = payload?.assignment || payload || {};
  const submission = payload?.submission || assignment.submission || null;
  const version = payload?.work || payload?.workVersion || payload?.version || assignment.work || assignment.workVersion || assignment.version || {};
  const definition = jsonObject(
    payload?.content_json || payload?.contentJson || version.content_json || version.contentJson ||
    assignment.content_json || assignment.contentJson || assignment.definition,
    {},
  );
  if (!definition.rubric && version.rubric) definition.rubric = version.rubric;
  const blocks = asArray(version.blocks || definition.blocks || payload?.blocks || assignment.blocks).map((block) => ({ ...block, ...(block.config || {}), type: block.type || block.block_type, maxScore: block.maxScore ?? block.max_score }));
  const answers = jsonObject(submission?.answers_json || submission?.answersJson || submission?.answers, {});
  asArray(submission?.attachments).forEach((file) => {
    const blockId = file.blockId || file.block_id;
    if (!blockId) return;
    const answer = answers[blockId] && typeof answers[blockId] === 'object' ? answers[blockId] : { files: [] };
    answer.files = [...asArray(answer.files).filter((item) => item.id !== file.id), { ...file, status: file.status === 'ready' ? 'stored' : file.status }];
    answers[blockId] = answer;
  });
  return { assignment, submission, version, definition, blocks, answers };
}

function setSaveStatus({ state: kind, label }) {
  saveState.textContent = label;
  saveState.classList.toggle('is-saving', kind === 'saving');
  saveState.classList.toggle('is-warning', kind === 'pending' || kind === 'offline' || kind === 'conflict');
  saveState.classList.toggle('is-error', kind === 'error' || kind === 'conflict');
}

function titleForBlock(block, index) {
  return block.title || block.prompt || (block.type === 'instruction' ? 'Инструкция' : `Задание ${index + 1}`);
}

function blockIsRequired(block) {
  return block.type !== 'instruction' && block.required !== false;
}

function isReadonlySubmission(submission = {}) {
  return ['submitted', 'resubmitted', 'under_review', 'graded', 'accepted', 'completed'].includes(String(submission.status || '').toLowerCase());
}

function deadlineClass(value) {
  if (!value) return '';
  const distance = new Date(value).getTime() - Date.now();
  if (distance < 0) return 'deadline-overdue';
  if (distance < 48 * 60 * 60 * 1000) return 'deadline-soon';
  return '';
}

function showNav(view) {
  $$('.student-nav-item').forEach((button) => {
    const active = button.dataset.studentView === view;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
}

function cleanupWorkspace() {
  state.taskController?.destroy?.();
  state.taskController = null;
  state.autosave?.destroy();
  state.autosave = null;
  state.conflict = null;
}

async function loadDashboard(force = false) {
  cleanupWorkspace();
  showNav(state.view);
  renderLoading(content, 'Загружаем учебные работы…');
  try {
    if (!state.dashboard || force) state.dashboard = await studentApi.dashboard();
    renderDashboard(state.view === 'history');
  } catch (error) {
    renderError(content, error, () => loadDashboard(true));
  }
}

function renderDashboard(historyOnly = false) {
  const assignments = normalizeAssignments(state.dashboard);
  const openStatuses = new Set(['assigned', 'not_started', 'draft', 'in_progress', 'needs_revision', 'changes_requested', 'returned']);
  const historyStatuses = new Set(['submitted', 'resubmitted', 'under_review', 'graded', 'accepted', 'completed']);
  const scoped = assignments.filter((item) => historyOnly ? historyStatuses.has(item.status) : openStatuses.has(item.status));
  const summary = {
    total: assignments.filter((item) => openStatuses.has(item.status)).length,
    draft: assignments.filter((item) => ['draft', 'in_progress'].includes(item.status)).length,
    revision: assignments.filter((item) => ['needs_revision', 'changes_requested', 'returned'].includes(item.status)).length,
    checked: assignments.filter((item) => ['graded', 'accepted', 'completed'].includes(item.status)).length,
  };
  content.innerHTML = `
    <section aria-labelledby="student-page-title">
      <div class="page-head"><div><p class="section-kicker">Кабинет студента</p><h1 id="student-page-title">${historyOnly ? 'История работ' : 'Мои работы'}</h1><p>${historyOnly ? 'Отправленные и проверенные работы.' : 'Актуальные задания, сроки и черновики.'}</p></div></div>
      <div class="summary-strip" aria-label="Сводка по работам">
        <div class="summary-item"><span>Активные</span><strong>${summary.total}</strong></div>
        <div class="summary-item"><span>В работе</span><strong>${summary.draft}</strong></div>
        <div class="summary-item"><span>На доработку</span><strong>${summary.revision}</strong></div>
        <div class="summary-item"><span>Проверено</span><strong>${summary.checked}</strong></div>
      </div>
      <div class="filter-bar">
        <label class="field"><span>Поиск</span><input id="student-search" type="search" placeholder="Название или предмет" /></label>
        <label class="field"><span>Статус</span><select id="student-status-filter"><option value="">Все статусы</option>${[...new Set(scoped.map((item) => item.status))].map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(statusMeta(status)[0])}</option>`).join('')}</select></label>
        <label class="field"><span>Предмет</span><select id="student-subject-filter"><option value="">Все предметы</option>${[...new Set(scoped.map((item) => item.subject))].sort().map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join('')}</select></label>
      </div>
      <div id="assignment-results" aria-live="polite"></div>
    </section>`;

  const renderRows = () => {
    const search = $('#student-search').value.trim().toLocaleLowerCase('ru');
    const status = $('#student-status-filter').value;
    const subject = $('#student-subject-filter').value;
    const filtered = scoped.filter((item) => (!search || `${item.title} ${item.subject}`.toLocaleLowerCase('ru').includes(search)) && (!status || item.status === status) && (!subject || item.subject === subject));
    const results = $('#assignment-results');
    if (!filtered.length) {
      renderEmpty(results, historyOnly ? 'История пока пуста' : 'Работы не найдены', historyOnly ? 'После отправки работы появятся здесь.' : 'Измените фильтры или дождитесь нового назначения.');
      return;
    }
    results.innerHTML = `<div class="assignment-list">${filtered.map((item) => {
      const [statusLabel, tone] = statusMeta(item.status);
      const points = item.score !== undefined && item.score !== null ? `${item.score}${item.maxScore ? ` / ${item.maxScore}` : ''} балл.` : '';
      const score = [points, item.gradeValue ? `оценка ${item.gradeValue}` : ''].filter(Boolean).join(' · ') || '—';
      return `<button class="assignment-row" type="button" data-assignment-id="${escapeHtml(item.id)}">
        <span class="assignment-title"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.subject)}</span></span>
        <span class="assignment-meta"><span>Преподаватель</span><strong>${escapeHtml(item.teacher || '—')}</strong></span>
        <span class="assignment-meta ${deadlineClass(item.dueAt)}"><span>Срок</span><strong>${escapeHtml(formatDate(item.dueAt))}</strong></span>
        <span class="status-mark ${tone}"><span class="status-dot" aria-hidden="true"></span>${escapeHtml(statusLabel)}</span>
        <span class="assignment-meta"><span>Результат</span><strong>${escapeHtml(score)}</strong></span>
      </button>`;
    }).join('')}</div>`;
    $$('[data-assignment-id]', results).forEach((button) => button.addEventListener('click', () => openAssignment(button.dataset.assignmentId)));
  };
  ['#student-search', '#student-status-filter', '#student-subject-filter'].forEach((selector) => $(selector).addEventListener('input', renderRows));
  renderRows();
}

async function openAssignment(id, replace = false) {
  if (!id) return;
  cleanupWorkspace();
  setViewInUrl('workspace', { assignment: id, step: null }, replace);
  state.view = 'workspace';
  showNav('');
  renderLoading(content, 'Открываем работу…');
  try {
    const detail = normalizeDetail(await studentApi.assignment(id));
    Object.assign(state, detail, { activeIndex: 0 });
    const requestedStep = Number(new URL(location.href).searchParams.get('step'));
    if (Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= state.blocks.length) state.activeIndex = requestedStep - 1;
    if (!state.submission) renderStartPage(); else setupWorkspace();
  } catch (error) {
    renderError(content, error, () => openAssignment(id, true));
  }
}

function renderStartPage() {
  const assignment = state.assignment;
  const description = assignment.description || state.definition.description || '';
  content.innerHTML = `<section class="panel" aria-labelledby="start-title"><div class="panel-body">
    <button id="back-to-list" class="learning-button quiet" type="button">К списку работ</button>
    <p class="section-kicker">${escapeHtml(assignment.subjectName || assignment.subject?.name || assignment.subject || 'Учебная работа')}</p>
    <h1 id="start-title">${escapeHtml(assignment.title || state.version.title || 'Учебная работа')}</h1>
    ${description ? `<p>${escapeHtml(description)}</p>` : ''}
    <div class="summary-strip">
      <div class="summary-item"><span>Заданий</span><strong>${state.blocks.length}</strong></div>
      <div class="summary-item"><span>Максимум</span><strong>${escapeHtml(assignment.maxScore ?? state.version.maxScore ?? '—')}</strong></div>
      <div class="summary-item"><span>Срок</span><strong>${escapeHtml(formatDate(assignment.dueAt || assignment.deadline))}</strong></div>
      <div class="summary-item"><span>Попытка</span><strong>${escapeHtml(assignment.attemptNumber || 1)}</strong></div>
    </div>
    <button id="start-assignment" class="learning-button primary" type="button">Начать работу</button>
  </div></section>`;
  $('#back-to-list').addEventListener('click', navigateDashboard);
  $('#start-assignment').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    setBusy(button, true, 'Создаём черновик…');
    try {
      const payload = await studentApi.start(assignmentId(state.assignment));
      const detail = normalizeDetail(payload?.assignment || payload?.submission ? { ...payload, assignment: payload.assignment || state.assignment, workVersion: payload.workVersion || state.version } : await studentApi.assignment(assignmentId(state.assignment)));
      Object.assign(state, detail);
      if (!state.submission) {
        const refreshed = normalizeDetail(await studentApi.assignment(assignmentId(state.assignment)));
        Object.assign(state, refreshed);
      }
      setupWorkspace();
      toast('Черновик создан. Ответы сохраняются автоматически.', 'success');
    } catch (error) {
      toast(errorText(error), 'danger');
      setBusy(button, false);
    }
  });
}

function submissionId() {
  return state.submission?.id || state.submission?.submissionId || state.submission?.submission_id;
}

function setupWorkspace() {
  const id = submissionId();
  state.autosave = new AutosaveQueue({
    submissionId: id,
    revision: state.submission.draftRevision ?? state.submission.draft_revision ?? state.submission.revision ?? 0,
    storageKey: `learning:student:${state.user?.id || 'user'}:${id}`,
    save: (blockId, value, revision) => studentApi.saveAnswer(id, blockId, value, revision),
    onStatus: setSaveStatus,
    onSaved: ({ blockId, revision }) => {
      state.submission.revision = revision;
      updateStepState(blockId);
    },
    onConflict: ({ blockId, error }) => {
      state.conflict = { blockId, message: error.message };
      renderWorkspace();
    },
    onError: ({ error, retryable }) => {
      if (!retryable) toast(errorText(error), 'danger');
    },
  });
  renderWorkspace();
}

function answeredCount() {
  return state.blocks.filter((block) => block.type === 'instruction' || isValueMeaningful(state.answers[block.id], block)).length;
}

function updateStepState(blockId) {
  const index = state.blocks.findIndex((block) => block.id === blockId);
  const button = $(`[data-step-index="${index}"]`);
  if (!button) return;
  button.classList.toggle('is-complete', isValueMeaningful(state.answers[blockId], state.blocks[index]) || state.blocks[index].type === 'instruction');
  const progress = $('#workspace-progress');
  const label = $('#workspace-progress-label');
  const percent = state.blocks.length ? Math.round((answeredCount() / state.blocks.length) * 100) : 0;
  if (progress) progress.style.width = `${percent}%`;
  if (label) label.textContent = `${answeredCount()} из ${state.blocks.length}`;
}

function renderWorkspace() {
  const assignment = state.assignment;
  const submission = state.submission;
  const readonly = isReadonlySubmission(submission);
  const current = state.blocks[state.activeIndex];
  if (!current) {
    renderEmpty(content, 'В работе нет заданий', 'Сообщите преподавателю, что опубликованная версия пуста.', '<button id="back-to-list" class="learning-button secondary" type="button">К списку работ</button>');
    $('#back-to-list')?.addEventListener('click', navigateDashboard);
    return;
  }
  const complete = answeredCount();
  const percent = state.blocks.length ? Math.round((complete / state.blocks.length) * 100) : 0;
  const rubric = asArray(state.definition.rubric || assignment.rubric || submission.rubric);
  const feedback = submission.feedback || submission.teacherComment || submission.review?.comment;
  const canSubmit = !readonly && ['draft', 'in_progress', 'needs_revision', 'changes_requested', 'returned'].includes(String(submission.status || 'draft').toLowerCase());
  const submitLabel = ['needs_revision', 'changes_requested', 'returned'].includes(String(submission.status || '').toLowerCase()) ? 'Отправить повторно' : 'Отправить на проверку';
  content.innerHTML = `<section class="workspace-page" aria-labelledby="workspace-title">
    <header class="workspace-toolbar">
      <div><h1 id="workspace-title">${escapeHtml(assignment.title || state.version.title || 'Учебная работа')}</h1><p>${escapeHtml(assignment.subjectName || assignment.subject?.name || assignment.subject || '')} · ${statusBadge(submission.status)}</p></div>
      <div class="workspace-toolbar-actions"><button id="workspace-close" class="learning-button quiet" type="button">Закрыть</button>${canSubmit ? `<button id="submit-work" class="learning-button primary" type="button">${escapeHtml(submitLabel)}</button>` : ''}</div>
    </header>
    <div class="workspace-grid">
      <nav class="step-rail" aria-label="Задания работы"><ol class="step-list">${state.blocks.map((block, index) => `<li><button type="button" class="step-button ${index === state.activeIndex ? 'is-active' : ''} ${(block.type === 'instruction' || isValueMeaningful(state.answers[block.id], block)) ? 'is-complete' : ''}" data-step-index="${index}" ${index === state.activeIndex ? 'aria-current="step"' : ''}><span class="step-number">${index + 1}</span><span class="step-copy"><strong>${escapeHtml(titleForBlock(block, index))}</strong><span>${blockIsRequired(block) ? 'Обязательное' : 'Можно пропустить'}</span></span></button></li>`).join('')}</ol></nav>
      <div class="workspace-center">
        ${['needs_revision', 'changes_requested', 'returned'].includes(submission.status) ? `<div class="revision-panel"><strong>Работа возвращена на доработку</strong><p>${escapeHtml(feedback || 'Исправьте отмеченные пункты и отправьте работу повторно.')}</p></div>` : ''}
        ${state.conflict ? `<div class="conflict-panel" role="alert"><strong>Ответ изменён в другой вкладке</strong><p>Чтобы не перезаписать более свежую версию, обновите данные с сервера.</p><button id="resolve-conflict" class="learning-button secondary" type="button">Загрузить свежую версию</button></div>` : ''}
        <div class="workspace-block-head"><p class="section-kicker">Шаг ${state.activeIndex + 1} из ${state.blocks.length}</p><h2>${escapeHtml(titleForBlock(current, state.activeIndex))}${blockIsRequired(current) ? ' <span class="block-required" aria-label="обязательное">*</span>' : ''}</h2>${current.prompt && current.prompt !== current.title ? `<p>${escapeHtml(current.prompt)}</p>` : ''}</div>
        <div id="active-task" class="task-surface"></div>
        <div class="workspace-footer"><button id="save-now" class="learning-button secondary mobile-only" type="button" ${readonly ? 'disabled' : ''}>Сохранить</button><button id="previous-step" class="learning-button secondary" type="button" ${state.activeIndex === 0 ? 'disabled' : ''}>Назад</button>${state.activeIndex < state.blocks.length - 1 ? '<button id="next-step" class="learning-button primary" type="button">Далее</button>' : (canSubmit ? `<button id="footer-submit-work" class="learning-button primary mobile-only" type="button">${escapeHtml(submitLabel)}</button>` : '<button class="learning-button primary" type="button" disabled>Работа завершена</button>')}</div>
      </div>
      <aside class="workspace-aside" aria-label="Сведения о работе">
        <div class="workspace-card"><h3>Прогресс</h3><div class="progress-track" aria-hidden="true"><span id="workspace-progress" style="width:${percent}%"></span></div><p id="workspace-progress-label">${complete} из ${state.blocks.length}</p></div>
        <div class="workspace-card"><h3>Срок сдачи</h3><p class="${deadlineClass(assignment.dueAt || assignment.deadline)}">${escapeHtml(formatDate(assignment.dueAt || assignment.deadline, { withTime: true }))}</p></div>
        ${feedback ? `<div class="workspace-card"><h3>Комментарий преподавателя</h3><p>${escapeHtml(feedback)}</p></div>` : ''}
        ${rubric.length ? `<div class="workspace-card"><h3>Критерии</h3><ul class="rubric-list">${rubric.map((row) => `<li class="rubric-row"><span>${escapeHtml(row.title || row.name)}</span><strong>${escapeHtml(row.maxScore ?? row.points ?? '')}</strong></li>`).join('')}</ul></div>` : ''}
        ${submission.score !== undefined && submission.score !== null ? `<div class="workspace-card"><h3>Результат</h3><p><strong>${escapeHtml(submission.score)}${submission.maxScore ? ` / ${escapeHtml(submission.maxScore)}` : ''}</strong></p></div>` : ''}
      </aside>
    </div>
  </section>`;

  state.taskController?.destroy?.();
  state.taskController = mountTask($('#active-task'), current, state.answers[current.id], {
    readOnly: readonly,
    announce: (message) => toast(message, 'info', 2200),
    onChange: (value) => {
      state.answers[current.id] = value;
      updateStepState(current.id);
      if (!readonly) state.autosave.schedule(current.id, value);
    },
    uploadFile: (file, onProgress) => uploadFile(current.id, file, onProgress),
    confirm: (message) => confirmAction({ title: 'Удалить файл?', message, acceptLabel: 'Удалить', danger: true }),
    deleteFile: (file) => deleteFile(current.id, file),
    downloadFile: (file) => attachmentApi.download(file.id, file.name),
  });
  $$('[data-step-index]').forEach((button) => button.addEventListener('click', () => selectStep(Number(button.dataset.stepIndex))));
  $('#previous-step').addEventListener('click', () => selectStep(state.activeIndex - 1));
  $('#next-step')?.addEventListener('click', () => selectStep(state.activeIndex + 1));
  $('#save-now')?.addEventListener('click', async (event) => {
    setBusy(event.currentTarget, true, 'Сохраняем…');
    try { await state.autosave.flushAll(); toast('Все изменения сохранены.', 'success', 2200); }
    catch (error) { toast(errorText(error), 'danger'); }
    finally { setBusy(event.currentTarget, false); }
  });
  $('#workspace-close').addEventListener('click', navigateDashboard);
  $('#submit-work')?.addEventListener('click', submitWork);
  $('#footer-submit-work')?.addEventListener('click', submitWork);
  $('#resolve-conflict')?.addEventListener('click', () => openAssignment(assignmentId(state.assignment), true));
}

async function uploadFile(blockId, file, onProgress) {
  const initialized = await attachmentApi.init({ submissionId: submissionId(), blockId, file });
  const attachment = initialized.attachment || initialized;
  const uploadId = initialized.uploadId || initialized.upload_id || attachment.uploadId || attachment.id;
  const attachmentId = attachment.id || initialized.attachmentId || initialized.attachment_id || uploadId;
  await attachmentApi.upload(uploadId, file, onProgress);
  const finalized = await attachmentApi.finalize(attachmentId);
  const stored = finalized.attachment || finalized.file || finalized;
  return {
    ...stored,
    id: stored.id || attachmentId,
    name: stored.name || stored.original_name || file.name,
    mimeType: stored.mimeType || stored.mime_type || file.type,
    size: stored.size ?? stored.byte_size ?? file.size,
    status: 'stored',
  };
}

async function deleteFile(blockId, file) {
  await attachmentApi.delete(file.id);
  return true;
}

function selectStep(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.blocks.length || index === state.activeIndex) return;
  state.activeIndex = index;
  setViewInUrl('workspace', { assignment: assignmentId(state.assignment), step: index + 1 }, true);
  renderWorkspace();
  $('#active-task')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

async function submitWork(event) {
  if (state.taskController?.validate?.() === false) {
    state.taskController.focusFirstError?.();
    return;
  }
  const missing = state.blocks.filter((block) => blockIsRequired(block) && !isValueMeaningful(state.answers[block.id], block));
  if (missing.length) {
    const first = state.blocks.indexOf(missing[0]);
    toast(`Заполните обязательные задания: ${missing.length}.`, 'danger');
    selectStep(first);
    state.taskController?.focusFirstError?.();
    return;
  }
  const resubmit = ['needs_revision', 'changes_requested', 'returned'].includes(String(state.submission.status || '').toLowerCase());
  const confirmed = await confirmAction({
    title: resubmit ? 'Отправить исправленную работу?' : 'Отправить работу на проверку?',
    message: 'После отправки ответы нельзя будет менять, пока преподаватель не вернёт работу.',
    acceptLabel: resubmit ? 'Отправить повторно' : 'Отправить',
  });
  if (!confirmed) return;
  const button = event?.currentTarget || $('#submit-work');
  setBusy(button, true, 'Отправляем…');
  try {
    await state.autosave.flushAll();
    if (resubmit) await studentApi.resubmit(submissionId(), state.autosave.revision); else await studentApi.submit(submissionId(), state.autosave.revision);
    state.dashboard = null;
    toast('Работа отправлена преподавателю.', 'success');
    await openAssignment(assignmentId(state.assignment), true);
  } catch (error) {
    toast(errorText(error), 'danger');
    setBusy(button, false);
  }
}

function navigateDashboard() {
  state.view = 'dashboard';
  setViewInUrl('dashboard', { assignment: null, step: null });
  loadDashboard(true);
}

async function route({ replace = false } = {}) {
  const params = new URL(location.href).searchParams;
  const id = params.get('assignment');
  state.view = id ? 'workspace' : (params.get('view') || 'dashboard');
  if (id) await openAssignment(id, replace); else await loadDashboard();
}

$$('[data-student-view]').forEach((button) => button.addEventListener('click', () => {
  state.view = button.dataset.studentView;
  setViewInUrl(state.view, { assignment: null, step: null });
  loadDashboard();
}));
$('#student-logout').addEventListener('click', logout);
window.addEventListener('popstate', () => route({ replace: true }));
window.addEventListener('beforeunload', (event) => {
  if (state.autosave?.pending?.size) {
    event.preventDefault();
    event.returnValue = '';
  }
});

const session = initSession({
  expectedRole: 'student',
  loginMode: 'student-picker',
  shellSelector: '#student-shell',
  onReady: async (user) => {
    state.user = user;
    $('#student-name').textContent = fullName(user);
    $('#student-group').textContent = user.groupName || user.group?.name || user.groups?.[0]?.name || 'Группа не указана';
    await route({ replace: true });
  },
});

session.check();
