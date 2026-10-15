"use strict";
const { authorized, fingerprint } = require('../ops/windows-hosting/lib/mirror-protocol');
const OLYMPIAD_ID = require('../data/olympiad').id;
const { retryD1 } = require('./d1-retry');
function json(status, data) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } });
}
async function handleMirrorRequest(request, env) {
  if (!env.DESKTOP_MIRROR_PUBLIC_KEY) return json(404, { ok: false });
  if (!authorized(request, env.DESKTOP_MIRROR_PUBLIC_KEY)) return json(401, { ok: false });
  const url = new URL(request.url), view = url.searchParams.get('view') || 'manifest';
  const database = env.DB.withSession ? env.DB.withSession('first-primary') : env.DB;
  try {
    if (view === 'manifest') {
      const after = url.searchParams.get('after') || '';
      if (after.length > 200) return json(400, { ok: false });
      const result = await retryD1(() => database.prepare(`SELECT a.id,a.updated_at,a.state_revision,
        COALESCE((SELECT updated_at FROM attempt_variants WHERE id=a.id),'') AS variant_updated_at,
        (SELECT COUNT(*) FROM attempt_answers WHERE attempt_id=a.id) AS answer_count,
        COALESCE((SELECT MAX(updated_at) FROM attempt_answers WHERE attempt_id=a.id),'') AS answer_updated_at,
        (SELECT COUNT(*) FROM olympiad_attempt_events WHERE attempt_id=a.id) AS event_count,
        COALESCE((SELECT MAX(received_at) FROM olympiad_attempt_events WHERE attempt_id=a.id),'') AS event_updated_at
        FROM attempts a WHERE json_extract(a.payload_json,'$.olympiadId')=?1 AND a.id>?2 ORDER BY a.id LIMIT 100`).bind(OLYMPIAD_ID, after).all());
      const rows = result.results || [];
      return json(200, { ok: true, version: 1, olympiadId: OLYMPIAD_ID, entries: rows.map(row => ({ id: row.id,
        fingerprint: JSON.stringify([row.updated_at, Number(row.state_revision), row.variant_updated_at, Number(row.answer_count), row.answer_updated_at, Number(row.event_count), row.event_updated_at]) })),
        nextAfter: rows.length === 100 ? rows.at(-1).id : null });
    }
    if (view === 'attempt') {
      const id = url.searchParams.get('id'); if (!id || id.length > 200) return json(400, { ok: false });
      // One SQL statement observes a consistent attempt/variant/answers/events
      // snapshot, without a write, session token, PM01 data or admin secrets.
      const row = await retryD1(() => database.prepare(`SELECT a.id,a.payload_json,a.updated_at,a.state_revision,a.access_token_hash,a.story_run_id,
        (SELECT json_object('id',v.id,'payload_json',v.payload_json,'updated_at',v.updated_at) FROM attempt_variants v WHERE v.id=a.id) AS variant_json,
        (SELECT json_group_array(json_object('attempt_id',b.attempt_id,'question_id',b.question_id,'payload_json',b.payload_json,'updated_at',b.updated_at)) FROM attempt_answers b WHERE b.attempt_id=a.id) AS answers_json,
        (SELECT json_group_array(json_object('attempt_id',e.attempt_id,'event_id',e.event_id,'event_type',e.event_type,'payload_json',e.payload_json,'occurred_at',e.occurred_at,'received_at',e.received_at)) FROM olympiad_attempt_events e WHERE e.attempt_id=a.id) AS events_json
        FROM attempts a WHERE a.id=?1 AND json_extract(a.payload_json,'$.olympiadId')=?2`).bind(id, OLYMPIAD_ID).first());
      if (!row) return json(404, { ok: false });
      const { variant_json, answers_json, events_json, ...attempt } = row;
      const variant = JSON.parse(variant_json || 'null'), answers = JSON.parse(answers_json || '[]'), events = JSON.parse(events_json || '[]');
      return json(200, { ok: true, version: 1, olympiadId: OLYMPIAD_ID, fingerprint: fingerprint(attempt, variant, answers, events), attempt, variant, answers, events });
    }
    if (view === 'runs') {
      const rows = await retryD1(() => database.prepare('SELECT * FROM olympiad_story_runs ORDER BY id').all());
      const control=await retryD1(()=>database.prepare("SELECT run_id FROM olympiad_control WHERE id='current'").first());
      return json(200, { ok: true, version: 1, runs: rows.results || [],currentRunId:control?.run_id||null,registryAvailable:true });
    }
    if(view==='registry'){
      const after=url.searchParams.get('after')||'';if(after.length>64)return json(400,{ok:false});
      const rows=await retryD1(()=>database.prepare('SELECT * FROM olympiad_registrations WHERE id>? ORDER BY id LIMIT 100').bind(after).all());
      const registrations=rows.results||[];return json(200,{ok:true,version:1,registrations,nextAfter:registrations.length===100?registrations.at(-1).id:null});
    }
    return json(400, { ok: false });
  } catch { return json(503, { ok: false, message: 'Mirror temporarily unavailable.' }); }
}
module.exports = { handleMirrorRequest };
