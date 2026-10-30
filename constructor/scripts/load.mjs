import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { project, question, uid } from "../shared/catalog.js";
import { acceptanceClient, report } from "./acceptance-client.mjs";

async function main() {
  const client = await acceptanceClient(),
    { request } = client;
  try {
    const count = 100,
      questions = 20,
      p = project("СИНТЕТИЧЕСКАЯ ПРИЁМКА · 100 участников");
    p.rounds[0].questions = Array.from({ length: questions }, (_, i) => ({
      ...question(),
      title: `Проверочное задание ${i + 1}`,
      shuffle: false,
    }));
    const templates = await request("/templates");
    p.awardRules = templates.slice(0, 12).map((t) => ({
      id: uid("rule"),
      mode: "participation",
      title: "Приёмочный образец",
      templateId: t.id,
    }));
    const saved = await request("/projects", { project: p }),
      release = await request(`/projects/${saved.id}/publish`, {});
    const run = await request("/runs", {
      releaseId: release.id,
      settings: { status: "open", entryMode: "codes", disclosure: "immediate" },
    });
    const people = await request(`/runs/${run.id}/participants`, {
      rows: Array.from({ length: count }, (_, i) => ({
        fullName: `Синтетический участник ${String(i + 1).padStart(3, "0")}`,
      })),
    });
    const pdfRun = await request("/runs", {
      releaseId: release.id,
      settings: { status: "open", entryMode: "codes" },
    });
    const [pdfPerson] = await request(`/runs/${pdfRun.id}/participants`, {
      rows: [{ fullName: "Образец параллельного выпуска документов" }],
    });
    const pdfSession = await request(`/public/runs/${pdfRun.id}/begin`, {
      code: pdfPerson.code,
      startKey: uid("start"),
    });
    for (const q of p.rounds[0].questions)
      await request(
        `/public/attempts/${pdfSession.attemptId}/answers/${q.id}`,
        {
          answer: q.key.optionId,
          expectedRevision: 0,
          idempotencyKey: uid("save"),
        },
        "PUT",
        pdfSession.token,
      );
    await request(
      `/public/attempts/${pdfSession.attemptId}/finish-round`,
      {},
      "POST",
      pdfSession.token,
    );
    const preview = await request(`/runs/${pdfRun.id}/awards/preview`);
    await request(`/runs/${pdfRun.id}/awards/approve`, {
      resultHash: preview.resultHash,
    });
    const start = performance.now(),
      latencies = [],
      sessions = await Promise.all(
        people.map((person) =>
          request(`/public/runs/${run.id}/begin`, {
            code: person.code,
            startKey: uid("start"),
          }),
        ),
      );
    const job = await request(`/runs/${pdfRun.id}/awards/issue`, {});
    await Promise.all(
      sessions.map(async (session) => {
        for (const [i, q] of p.rounds[0].questions.entries()) {
          const body = {
              answer: q.key.optionId,
              expectedRevision: 0,
              idempotencyKey: uid("save"),
            },
            stamp = performance.now();
          const receipt = await request(
            `/public/attempts/${session.attemptId}/answers/${q.id}`,
            body,
            "PUT",
            session.token,
          );
          latencies.push(performance.now() - stamp);
          assert.equal(receipt.revision, 1);
          if (i % 5 === 0)
            assert.deepEqual(
              await request(
                `/public/attempts/${session.attemptId}/answers/${q.id}`,
                body,
                "PUT",
                session.token,
              ),
              receipt,
            );
        }
        const done = await request(
          `/public/attempts/${session.attemptId}/finish-round`,
          {},
          "POST",
          session.token,
        );
        assert.equal(done.status, "completed");
        assert.equal(done.summary.score, questions * 2);
      }),
    );
    const duration = performance.now() - start,
      rows = await request(`/runs/${run.id}/results`);
    assert.equal(rows.length, count);
    assert.equal(new Set(rows.map((a) => a.id)).size, count);
    for (const a of rows) {
      assert.equal(a.status, "completed");
      assert.equal(Object.keys(a.answers).length, questions);
      assert.equal(a.summary.score, questions * 2);
    }
    let finalJob = await request("/jobs/" + job.id);
    const pdfDeadline = Date.now() + 180000;
    while (
      ["queued", "running"].includes(finalJob.status) &&
      Date.now() < pdfDeadline
    ) {
      await new Promise((r) => setTimeout(r, 500));
      finalJob = await request("/jobs/" + job.id);
    }
    assert.equal(finalJob.status, "completed", finalJob.error);
    assert.equal(finalJob.result.issued.length, 12);
    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.ceil(latencies.length * 0.95) - 1];
    report("constructor-load", {
      participants: count,
      answers: count * questions,
      retriedAnswers: 400,
      lost: 0,
      duplicates: 0,
      durationMs: Math.round(duration),
      saveP95Ms: Math.round(p95),
      saveMaxMs: Math.round(latencies.at(-1)),
      simultaneousPdfCount: 12,
      runId: run.id,
      passed: p95 <= 2000,
    });
    assert.ok(
      p95 <= 2000,
      `95% сохранений должны укладываться в 2 секунды; получено ${Math.round(p95)} мс`,
    );
  } finally {
    await client.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
