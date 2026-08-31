import { ApiError, authApi } from './api.js?v=1.1.2';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

export function pick(payload, ...keys) {
  for (const key of keys) {
    if (payload && Object.prototype.hasOwnProperty.call(payload, key) && payload[key] !== undefined) return payload[key];
  }
  return payload;
}

export function debounce(fn, delay = 300) {
  let timer;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}

export function formatDate(value, { withTime = false, fallback = '—' } = {}) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ru-RU', withTime ? {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  } : { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatBytes(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < 0) return '—';
  if (size < 1024) return `${size} Б`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} КБ`;
  return `${(size / 1024 ** 2).toFixed(1)} МБ`;
}

const STATUS = {
  active: ['Активен', 'success'],
  inactive: ['Отключён', 'neutral'],
  assigned: ['Назначено', 'neutral'],
  not_started: ['Не начато', 'neutral'],
  draft: ['Черновик', 'info'],
  in_progress: ['В работе', 'info'],
  submitted: ['Отправлено', 'warning'],
  under_review: ['На проверке', 'warning'],
  needs_revision: ['Нужно исправить', 'danger'],
  changes_requested: ['Нужно исправить', 'danger'],
  returned: ['Возвращено', 'danger'],
  resubmitted: ['Отправлено повторно', 'warning'],
  graded: ['Проверено', 'success'],
  accepted: ['Принято', 'success'],
  completed: ['Завершено', 'success'],
  published: ['Опубликовано', 'success'],
  archived: ['В архиве', 'neutral'],
};

export function statusMeta(status) {
  const key = String(status || '').toLowerCase();
  return STATUS[key] || [status || 'Без статуса', 'neutral'];
}

export function statusBadge(status) {
  const [label, tone] = statusMeta(status);
  return `<span class="status-badge ${tone}">${escapeHtml(label)}</span>`;
}

export function initials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'У';
}

export function fullName(user = {}) {
  return user.displayName || user.fullName || user.name || user.login || 'Пользователь';
}

export function announce(message, target = null) {
  const region = target || $('#toast-region');
  if (!region) return;
  if (region.id === 'toast-region') {
    region.setAttribute('aria-live', 'polite');
    return;
  }
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = message; });
}

export function toast(message, tone = 'info', duration = 4500) {
  const region = $('#toast-region');
  if (!region) return;
  const item = document.createElement('div');
  item.className = `toast ${tone}`;
  item.setAttribute('role', tone === 'danger' ? 'alert' : 'status');
  const text = document.createElement('span');
  text.textContent = message;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Закрыть уведомление');
  close.textContent = '×';
  close.addEventListener('click', () => item.remove());
  item.append(text, close);
  region.append(item);
  if (duration) setTimeout(() => item.remove(), duration);
}

export function errorText(error, fallback = 'Не удалось выполнить действие.') {
  if (error instanceof ApiError || error instanceof Error) return error.message || fallback;
  return fallback;
}

export function setBusy(button, busy, label = 'Подождите…') {
  if (!button) return;
  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = label;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

export function renderLoading(container, label = 'Загружаем данные…') {
  container.innerHTML = `<div class="content-state" role="status"><span class="spinner" aria-hidden="true"></span><p>${escapeHtml(label)}</p></div>`;
}

export function renderError(container, error, onRetry) {
  container.innerHTML = `<div class="content-state error-state" role="alert"><h2>Не удалось загрузить данные</h2><p>${escapeHtml(errorText(error))}</p><button class="learning-button secondary" type="button">Повторить</button></div>`;
  $('button', container)?.addEventListener('click', onRetry);
}

export function renderEmpty(container, title, text, action = '') {
  container.innerHTML = `<div class="empty-state"><div class="empty-icon" aria-hidden="true">○</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p>${action}</div>`;
}

export function confirmAction({ title = 'Подтвердите действие', message, acceptLabel = 'Подтвердить', danger = false } = {}) {
  const dialog = $('#confirm-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return Promise.resolve(window.confirm(message || title));
  $('#confirm-title', dialog).textContent = title;
  $('#confirm-message', dialog).textContent = message || '';
  const accept = $('#confirm-accept', dialog);
  accept.textContent = acceptLabel;
  accept.classList.toggle('danger', danger);
  dialog.showModal();
  return new Promise((resolve) => {
    const done = () => {
      dialog.removeEventListener('close', done);
      resolve(dialog.returnValue === 'confirm');
    };
    dialog.addEventListener('close', done);
  });
}

function roleKind(user = {}) {
  const role = String(user.role || user.roleCode || user.kind || asArray(user.roles).join(' ') || '').toLowerCase();
  if (role.includes('teacher') || role.includes('admin') || role.includes('преподав')) return 'teacher';
  if (role.includes('student') || role.includes('студ')) return 'student';
  return role;
}

function needsPasswordChange(user = {}) {
  return Boolean(user.mustChangePassword ?? user.passwordChangeRequired ?? user.requiresPasswordChange ?? user.isTemporaryPassword);
}

function showOnly(id) {
  ['#app-loading', '#auth-screen', '#student-shell', '#teacher-shell'].forEach((selector) => {
    const element = $(selector);
    if (element) element.classList.toggle('hidden', selector !== id);
  });
}

export function initSession({ expectedRole, shellSelector, onReady }) {
  const loginForm = $('#login-form');
  const setupForm = $('#setup-form');
  const loginError = $('#login-error');
  const passwordDialog = $('#password-dialog');
  const passwordForm = $('#password-form');
  let currentUser = null;
  let passwordMandatory = false;

  const revealUser = async (user) => {
    currentUser = user || {};
    const actualRole = roleKind(currentUser);
    if (actualRole && expectedRole && actualRole !== expectedRole && actualRole !== 'admin') {
      showOnly('#auth-screen');
      loginError.textContent = expectedRole === 'student'
        ? 'Эта учётная запись предназначена для кабинета преподавателя.'
        : 'Эта учётная запись предназначена для кабинета студента.';
      loginError.classList.remove('hidden');
      return;
    }
    showOnly(shellSelector);
    passwordMandatory = needsPasswordChange(currentUser);
    if (passwordMandatory) {
      passwordDialog?.showModal();
      return;
    }
    await onReady(currentUser);
  };

  const check = async () => {
    try {
      if (setupForm) {
        const status = await authApi.status();
        if (status?.enabled === false) throw new ApiError('Модуль учебных работ пока выключен.', { status: 503, code: 'learning_disabled' });
        if (status?.requiresBootstrap) {
          showOnly('#auth-screen');
          loginForm?.classList.add('hidden');
          setupForm.classList.remove('hidden');
          $('#auth-title').textContent = 'Первичная настройка';
          requestAnimationFrame(() => $('#setup-secret')?.focus());
          return;
        }
      }
      await revealUser(await authApi.me());
    } catch (error) {
      showOnly('#auth-screen');
      if (error.status && error.status !== 401) {
        loginError.textContent = errorText(error);
        loginError.classList.remove('hidden');
      }
      requestAnimationFrame(() => $('#login-name')?.focus());
    }
  };

  setupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorBox = $('#setup-error');
    errorBox.classList.add('hidden');
    if (!setupForm.reportValidity()) return;
    const password = $('#setup-password').value;
    if (password !== $('#setup-password-repeat').value) {
      errorBox.textContent = 'Пароли не совпадают.';
      errorBox.classList.remove('hidden');
      $('#setup-password-repeat').focus();
      return;
    }
    const button = $('button[type="submit"]', setupForm);
    setBusy(button, true, 'Создаём…');
    try {
      await authApi.setup({
        bootstrapSecret: $('#setup-secret').value,
        displayName: $('#setup-display-name').value.trim(),
        login: $('#setup-login').value.trim(),
        password,
      });
      const createdLogin = $('#setup-login').value.trim();
      setupForm.reset();
      setupForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
      $('#auth-title').textContent = 'Кабинет преподавателя';
      $('#login-name').value = createdLogin;
      toast('Администратор создан. Теперь войдите в кабинет.', 'success');
      $('#login-password').focus();
    } catch (error) {
      errorBox.textContent = errorText(error);
      errorBox.classList.remove('hidden');
    } finally {
      setBusy(button, false);
    }
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.classList.add('hidden');
    if (!loginForm.reportValidity()) return;
    const button = $('button[type="submit"]', loginForm);
    setBusy(button, true, 'Входим…');
    try {
      await revealUser(await authApi.login($('#login-name').value.trim(), $('#login-password').value));
      loginForm.reset();
    } catch (error) {
      loginError.textContent = errorText(error, 'Проверьте логин и пароль.');
      loginError.classList.remove('hidden');
      $('#login-password')?.focus();
    } finally {
      setBusy(button, false);
    }
  });

  passwordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorBox = $('#password-error');
    errorBox.classList.add('hidden');
    const current = $('#current-password').value;
    const next = $('#new-password').value;
    const repeat = $('#new-password-repeat').value;
    if (!passwordForm.reportValidity()) return;
    if (next !== repeat) {
      errorBox.textContent = 'Новые пароли не совпадают.';
      errorBox.classList.remove('hidden');
      $('#new-password-repeat').focus();
      return;
    }
    const button = $('button[type="submit"]', passwordForm);
    setBusy(button, true, 'Сохраняем…');
    try {
      const result = await authApi.changePassword(current, next);
      passwordMandatory = false;
      passwordForm.reset();
      passwordDialog.close();
      toast(result?.requiresLogin ? 'Пароль изменён. Войдите с новым паролем.' : 'Пароль изменён.', 'success');
      if (result?.requiresLogin) setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      errorBox.textContent = errorText(error);
      errorBox.classList.remove('hidden');
    } finally {
      setBusy(button, false);
    }
  });

  passwordDialog?.addEventListener('cancel', (event) => {
    if (passwordMandatory) event.preventDefault();
  });

  return { check, getUser: () => currentUser };
}

export async function logout() {
  try { await authApi.logout(); } catch (error) {
    if (error.status !== 401) toast(errorText(error), 'danger');
  }
  window.location.reload();
}

export function setViewInUrl(view, extra = {}, replace = false) {
  const url = new URL(window.location.href);
  if (view) url.searchParams.set('view', view);
  Object.entries(extra).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  history[replace ? 'replaceState' : 'pushState']({ view, ...extra }, '', url);
}

export function downloadCsv(filename, rows) {
  const quote = (value) => {
    const text = String(value ?? '');
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  const body = rows.map((row) => row.map(quote).join(';')).join('\r\n');
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
