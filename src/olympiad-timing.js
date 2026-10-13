'use strict';

// The legacy budgets remain available for old bank editions and issued attempts.
const counts = { T1: 10, T2: 5, T3: 10, T4: 8, T5: 3 };
function shortTimingEnabled(olympiad) {
  return olympiad.questionTimeLimitSeconds === 30 &&
    olympiad.questionBank.tour4Tasks.every(q => q.menuVersion === 4);
}
function publicTiming(olympiad) {
  if (!shortTimingEnabled(olympiad)) return { durationMinutes: olympiad.durationMinutes, tours: olympiad.tours };
  const tours = olympiad.tours.map(t => ({ ...t, timeLimitMinutes: counts[t.code] * 30 / 60 }));
  return { durationMinutes: tours.reduce((sum, t) => sum + t.timeLimitMinutes, 0), tours };
}
module.exports = { shortTimingEnabled, publicTiming };
