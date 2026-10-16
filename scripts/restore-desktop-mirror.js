"use strict";
// Restore into a NEW database only. The cloud and the read-only archive remain
// untouched; subsequent cloud changes must be reconciled, never auto-imported.
const fs = require('node:fs'), crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { createSqliteD1 } = require('../src/sqlite-d1');
const { fingerprint } = require('../ops/windows-hosting/lib/mirror-protocol');
const olympiadId = require('../data/olympiad').id;

function restoreDesktopMirror(snapshot, destination) {
  if (fs.existsSync(destination)) throw Error('Destination already exists; refusing to overwrite a database.');
  const source = new DatabaseSync(snapshot, { readOnly: true });
  let target;
  try {
    if (source.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Mirror integrity check failed.');
    const runs = source.prepare('SELECT payload_json FROM mirror_runs ORDER BY id').all().map(row => JSON.parse(row.payload_json));
    const selected = JSON.parse(source.prepare("SELECT value FROM mirror_meta WHERE key='currentRunId'").get()?.value || 'null');
    if (!selected || !runs.some(run => run.id === selected)) throw Error('Selected run is missing from the mirror.');
    const registrations = source.prepare('SELECT payload_json FROM mirror_registrations ORDER BY id').all().map(row => JSON.parse(row.payload_json));
    const bundles = source.prepare('SELECT id,sha256,bundle_json,fingerprint FROM mirror_attempts ORDER BY id').all().map(row => {
      if (crypto.createHash('sha256').update(row.bundle_json).digest('hex') !== row.sha256) throw Error('Bundle checksum mismatch.');
      const bundle = JSON.parse(row.bundle_json), attempt = JSON.parse(bundle.attempt.payload_json);
      if (!bundle.ok || bundle.version !== 1 || attempt.id !== row.id || bundle.attempt.id !== row.id || attempt.olympiadId !== olympiadId || bundle.olympiadId !== olympiadId ||
          !Array.isArray(bundle.answers) || !Array.isArray(bundle.events) ||
          bundle.answers.some(a => a.attempt_id !== row.id) || bundle.events.some(e => e.attempt_id !== row.id) ||
          (bundle.variant && bundle.variant.id !== row.id) ||
          row.fingerprint !== bundle.fingerprint || bundle.fingerprint !== fingerprint(bundle.attempt, bundle.variant, bundle.answers, bundle.events)) throw Error('Invalid mirror bundle.');
      return bundle;
    });
    if (!bundles.length) throw Error('Mirror has no attempts; refusing an empty recovery.');
    target = createSqliteD1(destination);
    const statement = (table, columns, row) => target.prepare(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`).bind(...columns.map(key => row[key] ?? null));
    const writes = [];
    for (const run of runs) writes.push(statement('olympiad_story_runs', ['id','event_date','entry_starts_at','entry_ends_at','published_at','stopped','payload_json','entry_mode'], run));
    writes.push(target.prepare("INSERT INTO olympiad_control(id,run_id) VALUES('current',?)").bind(selected));
    for (const row of registrations) writes.push(statement('olympiad_registrations', ['id','run_id','participant_signature','participant_json','expected','registered_at','mentor_override','updated_at'], row));
    for (const bundle of bundles) {
      writes.push(statement('attempts', ['id','payload_json','updated_at','state_revision','access_token_hash','story_run_id'], bundle.attempt));
      if (bundle.variant) writes.push(statement('attempt_variants', ['id','payload_json','updated_at'], bundle.variant));
      for (const row of bundle.answers) writes.push(statement('attempt_answers', ['attempt_id','question_id','payload_json','updated_at'], row));
      for (const row of bundle.events) writes.push(statement('olympiad_attempt_events', ['attempt_id','event_id','event_type','payload_json','occurred_at','received_at'], row));
    }
    target.batch(writes);
    if (target.prepare('PRAGMA integrity_check').first().integrity_check !== 'ok' || target.prepare('PRAGMA foreign_key_check').all().results.length) throw Error('Restored database integrity failed.');
    // Compare raw stored bytes, including immutable variants, clocks and owner
    // hashes, before any application can normalize expired attempts.
    for (const bundle of bundles) {
      for (const [table, key, rows] of [['attempts','id',[bundle.attempt]],['attempt_variants','id',bundle.variant ? [bundle.variant] : []],['attempt_answers','question_id',bundle.answers],['olympiad_attempt_events','event_id',bundle.events]]) {
        for (const row of rows) {
          const filter = ['attempt_answers','olympiad_attempt_events'].includes(table) ? `attempt_id=? AND ${key}=?` : `${key}=?`;
          const bindings = filter.startsWith('attempt_id') ? [row.attempt_id,row[key]] : [row[key]];
          const stored = target.prepare(`SELECT * FROM ${table} WHERE ${filter}`).bind(...bindings).first();
          for (const [column,value] of Object.entries(row)) if (stored[column] !== value) throw Error(`Restored ${table} mismatch.`);
        }
      }
    }
    const count = table => target.prepare(`SELECT COUNT(*) n FROM ${table}`).first().n;
    return { restoredAt: new Date().toISOString(), currentRunId: selected, attempts: count('attempts'), variants: count('attempt_variants'), answerRows: count('attempt_answers'), events: count('olympiad_attempt_events'), registrations: count('olympiad_registrations'), integrity: 'ok', cloudUntouched: true };
  } finally { target?.close(); source.close(); }
}
module.exports = { restoreDesktopMirror };
