const API_ROOT = '/api/learning';

let csrfToken = '';

export class ApiError extends Error {
  constructor(message, { status = 0, code = '', details = null, payload = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.payload = payload;
  }
}

function readCsrf(payload, response) {
  const header = response?.headers?.get('X-CSRF-Token');
  const bodyToken = payload?.csrfToken || payload?.csrf_token || payload?.session?.csrfToken || payload?.data?.csrfToken || payload?.data?.csrf_token;
  if (header || bodyToken) csrfToken = header || bodyToken;
}

function errorMessage(payload, response) {
  return payload?.message || payload?.error?.message || payload?.error ||
    (response.status === 401 ? 'Нужно войти в систему.' :
      response.status === 403 ? 'Недостаточно прав для этого действия.' :
        response.status === 409 ? 'Данные уже изменились в другой вкладке.' :
          `Сервер вернул ошибку ${response.status}.`);
}

async function refreshCsrfToken() {
  try {
    const response = await fetch(`${API_ROOT}/auth/me`, { credentials: 'same-origin' });
    if (!response.ok) return false;
    const payload = await response.json();
    readCsrf(payload, response);
    return Boolean(csrfToken);
  } catch {
    return false;
  }
}

export function setCsrfToken(value) {
  csrfToken = typeof value === 'string' ? value : '';
}

export function getCsrfToken() {
  return csrfToken;
}

export function queryString(values = {}) {
  const search = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) value.forEach((item) => search.append(key, String(item)));
    else search.set(key, String(value));
  });
  const rendered = search.toString();
  return rendered ? `?${rendered}` : '';
}

export async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  let body = options.body;

  if (mutating) headers.set('X-CSRF-Token', csrfToken);
  if (body !== undefined && body !== null && !options.rawBody && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(path.startsWith('/') ? path : `${API_ROOT}/${path}`, {
      method,
      body,
      headers,
      credentials: 'same-origin',
      signal: options.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('Нет связи с сервером. Проверьте подключение и повторите попытку.', {
      code: 'NETWORK_ERROR',
      details: error,
    });
  }

  if (options.rawResponse && response.ok) {
    readCsrf(null, response);
    return response;
  }

  const contentType = response.headers.get('content-type') || '';
  let payload = null;
  if (response.status !== 204) {
    try {
      payload = contentType.includes('application/json') ? await response.json() : await response.text();
    } catch {
      payload = null;
    }
  }
  readCsrf(payload, response);

  if (!response.ok) {
    const responseCode = payload?.code || payload?.error?.code || '';
    if (mutating && response.status === 403 && responseCode === 'csrf_rejected' && !options.csrfRetried) {
      const refreshed = await refreshCsrfToken();
      if (refreshed) return request(path, { ...options, csrfRetried: true });
    }
    throw new ApiError(errorMessage(payload, response), {
      status: response.status,
      code: responseCode,
      details: payload?.details || payload?.errors || null,
      payload,
    });
  }
  return payload?.ok === true && Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload;
}

function unwrap(payload, keys = []) {
  for (const key of keys) {
    if (payload && payload[key] !== undefined) return payload[key];
  }
  return payload;
}

export const authApi = {
  status() { return request(`${API_ROOT}/status`); },
  setup(body) { return request(`${API_ROOT}/setup`, { method: 'POST', body }); },
  studentGroups() { return request(`${API_ROOT}/auth/student-groups`); },
  studentNames(groupId) {
    return request(`${API_ROOT}/auth/student-groups/${encodeURIComponent(groupId)}/students`);
  },
  async selectStudent(groupId, studentId) {
    const payload = await request(`${API_ROOT}/auth/student-select`, {
      method: 'POST', body: { groupId, studentId },
    });
    return unwrap(payload, ['user', 'session']);
  },
  async me() {
    const payload = await request(`${API_ROOT}/auth/me`);
    if (payload?.authenticated === false || !payload?.user) throw new ApiError('Нужно войти в систему.', { status: 401, code: 'authentication_required' });
    return unwrap(payload, ['user', 'session']);
  },
  async login(login, password) {
    const payload = await request(`${API_ROOT}/auth/login`, { method: 'POST', body: { login, password } });
    return unwrap(payload, ['user', 'session']);
  },
  changePassword(currentPassword, newPassword) {
    return request(`${API_ROOT}/auth/change-password`, {
      method: 'POST', body: { currentPassword, newPassword, confirmPassword: newPassword },
    });
  },
  logout() {
    return request(`${API_ROOT}/auth/logout`, { method: 'POST', body: {} });
  },
};

export const studentApi = {
  dashboard() { return request(`${API_ROOT}/student/dashboard`); },
  assignment(id) { return request(`${API_ROOT}/assignments/${encodeURIComponent(id)}`); },
  start(id) { return request(`${API_ROOT}/assignments/${encodeURIComponent(id)}/start`, { method: 'POST', body: {} }); },
  saveAnswer(submissionId, blockId, value, expectedRevision) {
    return request(`${API_ROOT}/submissions/${encodeURIComponent(submissionId)}/answers/${encodeURIComponent(blockId)}`, {
      method: 'PUT', body: { value, expectedRevision },
    });
  },
  submit(submissionId, expectedRevision) {
    return request(`${API_ROOT}/submissions/${encodeURIComponent(submissionId)}/submit`, { method: 'POST', body: { expectedRevision } });
  },
  resubmit(submissionId, expectedRevision) {
    return request(`${API_ROOT}/submissions/${encodeURIComponent(submissionId)}/resubmit`, { method: 'POST', body: { expectedRevision } });
  },
};

export const attachmentApi = {
  init({ submissionId, blockId, file }) {
    return request(`${API_ROOT}/submissions/${encodeURIComponent(submissionId)}/attachments/init`, {
      method: 'POST',
      body: { submissionId, blockId, fileName: file.name, name: file.name, mimeType: file.type || 'application/octet-stream', byteSize: file.size, size: file.size },
    });
  },
  async upload(uploadId, file, onProgress) {
    if (typeof XMLHttpRequest !== 'undefined' && onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `${API_ROOT}/attachments/${encodeURIComponent(uploadId)}/content`);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new ApiError('Не удалось загрузить файл.', { status: xhr.status }));
        });
        xhr.addEventListener('error', () => reject(new ApiError('Нет связи во время загрузки файла.', { code: 'NETWORK_ERROR' })));
        xhr.send(file);
      });
    }
    await request(`${API_ROOT}/attachments/${encodeURIComponent(uploadId)}/content`, {
      method: 'PUT', body: file, rawBody: true, headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });
  },
  finalize(id) { return request(`${API_ROOT}/attachments/${encodeURIComponent(id)}/finalize`, { method: 'POST', body: {} }); },
  delete(id) { return request(`${API_ROOT}/attachments/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  async download(id, fallbackName = 'attachment') {
    const response = await request(`${API_ROOT}/attachments/${encodeURIComponent(id)}/download`, { rawResponse: true });
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
    const name = encoded ? decodeURIComponent(encoded) : (plain || fallbackName);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

export const teacherApi = {
  dashboard(params) { return request(`${API_ROOT}/teacher/dashboard${queryString(params)}`); },
  catalog(params) { return request(`${API_ROOT}/teacher/catalog${queryString(params)}`); },
  templates(params) { return request(`${API_ROOT}/teacher/templates${queryString(params)}`); },
  template(id) { return request(`${API_ROOT}/teacher/templates/${encodeURIComponent(id)}`); },
  createTemplate(body) { return request(`${API_ROOT}/teacher/templates`, { method: 'POST', body }); },
  updateTemplate(id, body) { return request(`${API_ROOT}/teacher/templates/${encodeURIComponent(id)}/draft`, { method: 'PUT', body }); },
  publishTemplate(id) { return request(`${API_ROOT}/teacher/templates/${encodeURIComponent(id)}/publish`, { method: 'POST', body: {} }); },
  assignments(params) { return request(`${API_ROOT}/teacher/assignments${queryString(params)}`); },
  createAssignment(body) { return request(`${API_ROOT}/teacher/assignments`, { method: 'POST', body }); },
  submissions(params) { return request(`${API_ROOT}/teacher/submissions${queryString(params)}`); },
  submission(id) { return request(`${API_ROOT}/teacher/submissions/${encodeURIComponent(id)}`); },
  returnReview(id, body) { return request(`${API_ROOT}/teacher/submissions/${encodeURIComponent(id)}/return`, { method: 'POST', body }); },
  grade(id, body) { return request(`${API_ROOT}/teacher/submissions/${encodeURIComponent(id)}/grade`, { method: 'POST', body }); },
  rosterPreview(body) { return request(`${API_ROOT}/teacher/rosters/import/preview`, { method: 'POST', body }); },
  rosterCommit(body) { return request(`${API_ROOT}/teacher/rosters/import/commit`, { method: 'POST', body }); },
  createGroup(body) { return request(`${API_ROOT}/teacher/groups`, { method: 'POST', body }); },
  groupStudents(groupId) { return request(`${API_ROOT}/teacher/groups/${encodeURIComponent(groupId)}/students`); },
  createSubject(body) { return request(`${API_ROOT}/teacher/subjects`, { method: 'POST', body }); },
  createCourse(body) { return request(`${API_ROOT}/teacher/courses`, { method: 'POST', body }); },
  seedPilot() { return request(`${API_ROOT}/teacher/pilot/seed`, { method: 'POST', body: {} }); },
  journal(params) { return request(`${API_ROOT}/teacher/journal${queryString(params)}`); },
};
