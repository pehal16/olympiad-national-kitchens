import { ApiError } from './api.js?v=1.1.2';

function clone(value) {
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
}

function responseRevision(payload, fallback) {
  const value = payload?.revision ?? payload?.draftRevision ?? payload?.answerRevision ?? payload?.submissionRevision ?? payload?.submission?.draftRevision ?? payload?.submission?.revision;
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export class AutosaveQueue {
  constructor({ submissionId, revision = 0, save, storageKey, delay = 650, onStatus, onSaved, onConflict, onError }) {
    this.submissionId = submissionId;
    this.revision = Number(revision) || 0;
    this.save = save;
    this.storageKey = storageKey || `learning:draft:${submissionId}`;
    this.delay = delay;
    this.onStatus = onStatus || (() => {});
    this.onSaved = onSaved || (() => {});
    this.onConflict = onConflict || (() => {});
    this.onError = onError || (() => {});
    this.pending = new Map();
    this.timers = new Map();
    this.running = false;
    this.waiters = [];
    this.destroyed = false;
    this.onlineHandler = () => this.flushAll().catch(() => {});
    window.addEventListener('online', this.onlineHandler);
  }

  schedule(blockId, value) {
    if (this.destroyed) return;
    this.pending.set(blockId, clone(value));
    this.writeBackup();
    this.onStatus({ state: 'pending', label: 'Есть несохранённые изменения' });
    clearTimeout(this.timers.get(blockId));
    this.timers.set(blockId, setTimeout(() => {
      this.timers.delete(blockId);
      this.pump().catch(() => {});
    }, this.delay));
  }

  writeBackup() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        submissionId: this.submissionId,
        revision: this.revision,
        updatedAt: new Date().toISOString(),
        answers: Object.fromEntries(this.pending),
      }));
    } catch {
      // Autosave continues even when storage is unavailable or full.
    }
  }

  readBackup() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey));
      return parsed?.submissionId === this.submissionId ? parsed : null;
    } catch { return null; }
  }

  clearBackupIfEmpty() {
    if (this.pending.size) return;
    try { localStorage.removeItem(this.storageKey); } catch { /* no-op */ }
  }

  async pump() {
    if (this.running || this.destroyed) return;
    this.running = true;
    try {
      while (this.pending.size && !this.destroyed) {
        const [blockId, value] = this.pending.entries().next().value;
        this.onStatus({ state: 'saving', label: 'Сохраняем…', blockId });
        try {
          const payload = await this.save(blockId, clone(value), this.revision);
          if (this.pending.get(blockId) === value || JSON.stringify(this.pending.get(blockId)) === JSON.stringify(value)) {
            this.pending.delete(blockId);
          }
          this.revision = responseRevision(payload, this.revision + 1);
          this.writeBackup();
          this.onSaved({ blockId, value, payload, revision: this.revision });
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            this.onStatus({ state: 'conflict', label: 'Конфликт изменений', blockId });
            this.onConflict({ blockId, value, error, revision: this.revision });
          } else if (error instanceof ApiError && error.code === 'NETWORK_ERROR') {
            this.onStatus({ state: 'offline', label: 'Нет сети — черновик сохранён на устройстве', blockId });
            this.onError({ blockId, value, error, retryable: true });
          } else {
            this.onStatus({ state: 'error', label: 'Не удалось сохранить', blockId });
            this.onError({ blockId, value, error, retryable: false });
          }
          throw error;
        }
      }
      if (!this.pending.size) {
        this.clearBackupIfEmpty();
        this.onStatus({ state: 'saved', label: 'Все изменения сохранены' });
      }
    } finally {
      this.running = false;
      const waiters = this.waiters.splice(0);
      waiters.forEach(({ resolve }) => resolve());
    }
  }

  async flushAll() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    if (this.running) {
      await new Promise((resolve) => this.waiters.push({ resolve }));
    }
    if (this.pending.size) await this.pump();
  }

  setRevision(revision) {
    if (Number.isFinite(Number(revision))) this.revision = Number(revision);
  }

  destroy() {
    this.destroyed = true;
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    window.removeEventListener('online', this.onlineHandler);
  }
}
