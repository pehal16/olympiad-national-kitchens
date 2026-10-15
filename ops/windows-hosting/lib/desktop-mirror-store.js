"use strict";
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { DatabaseSync, backup } = require('node:sqlite');
const { signedHeaders, fingerprint, ENDPOINT } = require('./mirror-protocol');
const { ORIGIN } = require('./desktop-network-fetch');
function atomicFile(file, text) {
  const temporary = file + '.tmp'; fs.writeFileSync(temporary, text, { mode: 0o600 });
  const descriptor = fs.openSync(temporary, 'r+'); try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
  fs.renameSync(temporary, file);
}
function openMirror(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(path.join(directory, 'cloud-results.sqlite'), { timeout: 5000 });
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS mirror_attempts(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,bundle_json TEXT NOT NULL,sha256 TEXT NOT NULL,synced_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS mirror_runs(id TEXT PRIMARY KEY,payload_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS mirror_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
  return database;
}
function saveBundle(database, bundle, now) {
  if (!bundle?.ok || bundle.version !== 1 || !bundle.attempt?.id || !Array.isArray(bundle.answers) || !Array.isArray(bundle.events)) throw new Error('Invalid mirror bundle');
  const attempt = JSON.parse(bundle.attempt.payload_json);
  if (attempt.id !== bundle.attempt.id || attempt.olympiadId !== bundle.olympiadId || bundle.answers.some(row => row.attempt_id !== attempt.id) || bundle.events.some(row => row.attempt_id !== attempt.id) || (bundle.variant && bundle.variant.id !== attempt.id)) throw new Error('Mirror identity mismatch');
  if (bundle.fingerprint !== fingerprint(bundle.attempt, bundle.variant, bundle.answers, bundle.events)) throw new Error('Mirror fingerprint mismatch');
  const text = JSON.stringify(bundle), sha = crypto.createHash('sha256').update(text).digest('hex');
  database.prepare(`INSERT INTO mirror_attempts VALUES(?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET fingerprint=excluded.fingerprint,bundle_json=excluded.bundle_json,sha256=excluded.sha256,synced_at=excluded.synced_at`).run(attempt.id, bundle.fingerprint, text, sha, now);
}
function csvCell(value) {
  let text = String(value ?? ''); if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function exportResults(database, directory) {
  const rows = database.prepare('SELECT id,bundle_json FROM mirror_attempts ORDER BY id').all();
  const results = rows.map(row => {
    const bundle = JSON.parse(row.bundle_json), a = JSON.parse(bundle.attempt.payload_json);
    return { id: a.id, participant: a.participant || {}, status: a.status, startedAt: a.startedAt, finishedAt: a.finishedAt || null,
      totalFinalScore: a.status === 'in_progress' ? null : a.totalFinalScore ?? null, totalMaxScore: a.totalMaxScore ?? 150,
      answeredCount: bundle.answers.filter(row => JSON.parse(row.payload_json).answer).length, runId: a.storyRunId || null };
  });
  const headers = ['ID','ФИО','Учреждение','Группа','Статус','Начало','Завершение','Баллы','Максимум','Сохранено ответов'];
  const lines = [headers, ...results.map(a => [a.id,a.participant.fullName,a.participant.institution,a.participant.groupName,a.status,a.startedAt,a.finishedAt,a.totalFinalScore,a.totalMaxScore,a.answeredCount])];
  const csv = '\uFEFF' + lines.map(row => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
  let exportWarning = null;
  try { atomicFile(path.join(directory, 'Результаты.csv'), csv); }
  catch (error) {
    if (!['EACCES','EBUSY','EPERM'].includes(error.code)) throw error;
    atomicFile(path.join(directory, 'Результаты-ожидают-закрытия-Excel.csv'),csv);
    exportWarning = 'Закройте Результаты.csv в Excel: SQLite и JSON обновлены, основная CSV будет обновлена автоматически.';
  }
  atomicFile(path.join(directory, 'results.json'), JSON.stringify({ exportedAt: new Date().toISOString(), attempts: results }, null, 2));
  return { attempts: results.length, finished: results.filter(a => a.status !== 'in_progress').length, answers: results.reduce((sum, a) => sum + a.answeredCount, 0), ...(exportWarning ? {exportWarning} : {}) };
}
function writeStatus(directory, status) {
  atomicFile(path.join(directory, 'status.json'), JSON.stringify(status, null, 2));
  const date = value => value ? new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }) + ' МСК' : 'ещё не выполнялась';
  atomicFile(path.join(directory, 'Состояние копии.txt'), '\uFEFF' + [
    'ЛОКАЛЬНАЯ КОПИЯ ОЛИМПИАДЫ',
    'Состояние: ' + ({ ok:'Синхронизация завершена',offline:'Нет связи или доступ временно недоступен; копия сохранена, повтор автоматически',syncing:'Получение изменений' }[status.state] || status.state),
    'Проверено: ' + date(status.checkedAt), 'Последняя полная синхронизация: ' + date(status.lastSuccessAt),
    'Попыток на ПК: ' + (status.counts?.attempts ?? 0), 'Завершено: ' + (status.counts?.finished ?? 0), 'Ответов на ПК: ' + (status.counts?.answers ?? 0),
    'Основная база: Cloudflare. Повторная проверка каждые 15 секунд.',
    'При отключении интернета копия может отставать. После подключения автоматически догоняет облако.',
    'Результаты.csv — для просмотра. cloud-results.sqlite содержит также варианты, ответы и журнал.',
    'Старая пробная база и её ключи находятся отдельно и не перезаписываются.',
    status.lastError ? 'Диагностика: ' + status.lastError : '',
    status.counts?.exportWarning || ''
  ].filter(Boolean).join('\r\n') + '\r\n');
}
async function syncOnce({ database, directory, privateKey, fetcher, previous = {}, now = () => new Date().toISOString() }) {
  const request = async parameters => {
    const url = new URL(ENDPOINT, ORIGIN); for (const [key,value] of Object.entries(parameters)) url.searchParams.set(key,value);
    const response = await fetcher(url, { headers: signedHeaders(url, privateKey), signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw new Error('Mirror HTTP ' + response.status);
    const value = await response.json(); if (!value.ok || value.version !== 1) throw new Error('Invalid mirror response'); return value;
  };
  let after = '', changed = 0, cloudAttempts = 0; const visited = new Set();
  do {
    if (visited.has(after)) throw new Error('Invalid pagination'); visited.add(after);
    const manifest = await request({ view:'manifest',after });
    if (!Array.isArray(manifest.entries) || manifest.entries.length > 100) throw new Error('Invalid mirror manifest');
    cloudAttempts += manifest.entries.length;
    const pending = manifest.entries.filter(entry => database.prepare('SELECT fingerprint FROM mirror_attempts WHERE id=?').get(entry.id)?.fingerprint !== entry.fingerprint);
    let index = 0;
    const workers = await Promise.allSettled(Array.from({ length: Math.min(3, pending.length) }, async () => {
      while (index < pending.length) { const entry = pending[index++], bundle = await request({ view:'attempt',id:entry.id }); saveBundle(database,bundle,now()); changed++; }
    }));
    const failed = workers.find(worker => worker.status === 'rejected'); if (failed) throw failed.reason;
    after = manifest.nextAfter;
    if (after !== null && (typeof after !== 'string' || !after)) throw new Error('Invalid mirror cursor');
  } while (after);
  const runs = await request({ view:'runs' });
  if (!Array.isArray(runs.runs)) throw new Error('Invalid run manifest');
  database.exec('BEGIN IMMEDIATE');
  try { for (const run of runs.runs) database.prepare('INSERT INTO mirror_runs VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json').run(run.id,JSON.stringify(run)); database.exec('COMMIT'); }
  catch(error) { database.exec('ROLLBACK'); throw error; }
  const counts = exportResults(database,directory), checkedAt = now();
  if (database.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('Local mirror integrity failed');
  const status = { state:'ok',checkedAt,lastSuccessAt:checkedAt,counts,cloudAttempts,changed,transport:fetcher.lastTransport || 'test',lastError:null };
  const day = checkedAt.slice(0,10);
  const backupState = JSON.parse(database.prepare("SELECT value FROM mirror_meta WHERE key='backupState'").get()?.value || 'null');
  const sinceBackup = backupState ? Date.parse(checkedAt) - Date.parse(backupState.at) : Infinity;
  if (!backupState || backupState.day !== day || (counts.attempts > 0 && !backupState.attempts) ||
      (counts.finished > backupState.finished && sinceBackup >= 60000) || (changed > 0 && sinceBackup >= 900000)) {
    const destination = path.join(directory,'snapshots'); fs.mkdirSync(destination,{recursive:true});
    const filename = path.join(destination, 'results-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex') + '.sqlite'); await backup(database,filename);
    const copy = new DatabaseSync(filename); try { copy.exec('PRAGMA journal_mode=DELETE;'); if(copy.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok')throw new Error('Snapshot integrity failed'); } finally {copy.close();}
    database.prepare("INSERT INTO mirror_meta VALUES('backupState',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify({day,at:checkedAt,attempts:counts.attempts,finished:counts.finished}));
  }
  writeStatus(directory,status); return status;
}
module.exports = { openMirror, saveBundle, syncOnce, exportResults, writeStatus, atomicFile };
