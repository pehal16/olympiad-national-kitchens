'use strict';
function enabled(attempt){return [1,2,3].includes(attempt?.variant?.questionTimingVersion);}
function deadline(attempt,question,tour){
 if(!enabled(attempt)||!question||!Number.isFinite(question.timeLimitSeconds)||question.timeLimitSeconds<=0)return null;
 const log=attempt.questionLog?.[question.id],start=Date.parse(log?.availableAt||log?.presentedAt||'');
 if(!Number.isFinite(start))return null;
 const tourStart=Date.parse(attempt.tourStates?.[tour?.id]?.startedAt||'');
 return Math.min(start+question.timeLimitSeconds*1000,Date.parse(attempt.expiresAt),Number.isFinite(tourStart)?tourStart+tour.timeLimitMinutes*60000:Infinity);
}
function timing(attempt,question,tour,now=Date.now()){
 const end=deadline(attempt,question,tour);
 return end===null?{}:{questionRemainingMs:Math.max(0,end-now),questionLimitSeconds:question.timeLimitSeconds,questionDeadline:new Date(end).toISOString()};
}
module.exports={enabled,deadline,timing};
