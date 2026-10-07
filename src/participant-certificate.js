"use strict";

const { summarizeAttempt } = require('./scoring');
const { scoresVisible } = require('./story-runs');

function certificateAvailable(attempt, settings) {
  return Boolean(attempt && attempt.status !== 'in_progress' &&
    attempt.participant?.fullName && Number.isFinite(Date.parse(attempt.finishedAt)) &&
    (attempt.storyRunId || scoresVisible(attempt, settings)));
}

// Only identity, order and the saved aggregate score belong in this document.
// Question keys, per-question verdicts and unpublished collections never do.
function buildParticipantCertificate(olympiad, attempt, settings) {
  if (!certificateAvailable(attempt, settings)) return null;
  const summary = summarizeAttempt(olympiad, attempt);
  return {
    id: attempt.id, status: attempt.status, finishedAt: attempt.finishedAt,
    participant: { fullName: attempt.participant.fullName, mentorName: attempt.participant.mentorName || '' },
    certificateOrder: olympiad.certificateOrder || null,
    story: attempt.storyRunId ? { runId: attempt.storyRunId } : null,
    summary: { totalFinalScore: summary.totalFinalScore, totalMaxScore: summary.totalMaxScore }
  };
}

module.exports = { certificateAvailable, buildParticipantCertificate };
