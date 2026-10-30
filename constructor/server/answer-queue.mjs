// A short group-commit window amortizes FULL WAL synchronization without acknowledging
// an answer before the entire batch has committed. Each answer keeps its own savepoint.
export class AnswerQueue {
  constructor(store, service) {
    this.store = store;
    this.service = service;
    this.pending = [];
    this.timer = null;
  }
  save(attempt, questionId, body) {
    return new Promise((resolve, reject) => {
      this.pending.push({ attempt, questionId, body, resolve, reject });
      if (!this.timer) this.timer = setTimeout(() => this.flush(), 5);
    });
  }
  flush() {
    this.timer = null;
    const entries = this.pending.splice(0),
      outcomes = [];
    try {
      this.store.transaction(() => {
        for (const entry of entries) {
          try {
            outcomes.push({
              value: this.service.saveAnswer(
                entry.attempt,
                entry.questionId,
                entry.body,
              ),
            });
          } catch (error) {
            outcomes.push({ error });
          }
        }
      });
      for (const [i, entry] of entries.entries()) {
        const result = outcomes[i];
        if (result.error) entry.reject(result.error);
        else entry.resolve(result.value);
      }
    } catch (error) {
      for (const entry of entries) entry.reject(error);
    }
  }
  close() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.flush();
    }
  }
}
