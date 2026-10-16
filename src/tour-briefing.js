"use strict";

// Enabled per attempt, so already issued routes keep their original clock policy.
function pending(attempt) {
  return Boolean(attempt?.status === 'in_progress' && attempt.tourBriefingsEnabled && attempt.tourBriefing);
}

function pausedDuration(attempt, now = Date.now()) {
  return Math.max(0, Number(attempt.pausedMs) || 0) + (pending(attempt)
    ? Math.max(0, now - Date.parse(attempt.tourBriefing.pausedAt)) : 0);
}

const instructions = {
  T1: ['Рассмотрите фотографию блюда.', 'Выберите один вариант названия и подтвердите ответ. После подтверждения откроется следующий вопрос.'],
  T2: ['Сопоставьте каждое из четырёх блюд со страной.', 'На телефоне нажмите на блюдо, затем выберите страну. Заполните все соответствия и подтвердите ответ.'],
  T3: ['Прочитайте подсказки и определите блюдо.', 'Введите название блюда и подтвердите ответ. Следите за временем задания.'],
  T4: ['Прочитайте пожелания гостя и рассмотрите меню.', 'Выберите подходящее блюдо и подтвердите заказ. Затем переходите к следующему гостю.'],
  T5: ['На каждой из трёх станций выберите четыре подходящих продукта.', 'На телефоне блюдо соберётся автоматически: выберите четыре продукта и нажмите «Подать». На компьютере следуйте подсказкам сборки. Если минута закончится раньше нажатия кнопки, будет учтён сохранённый выбор продуктов.']
};

function view(attempt, tour) {
  if (!pending(attempt) || !tour) return null;
  return {
    tourId: tour.id, code: tour.code, title: tour.title,
    description: tour.description || '', questionCount: tour.questionCount,
    timeLimitMinutes: tour.timeLimitMinutes, maxScore: tour.maxScore,
    pausedAt: attempt.tourBriefing.pausedAt,
    instructions: instructions[tour.code] || [tour.description || 'Выполните задания тура и подтвердите каждый ответ.']
  };
}

function begin(attempt, tour, now = Date.now()) {
  if (!pending(attempt) || attempt.tourBriefing.tourId !== tour?.id) return false;
  const pause = Math.max(0, now - Date.parse(attempt.tourBriefing.pausedAt));
  attempt.expiresAt = new Date(Date.parse(attempt.expiresAt) + pause).toISOString();
  attempt.pausedMs = (Number(attempt.pausedMs) || 0) + pause;
  attempt.tourStates[tour.id] = { startedAt: new Date(now).toISOString(), finishedAt: null };
  delete attempt.tourBriefing;
  return true;
}

module.exports = { pending, pausedDuration, view, begin };
