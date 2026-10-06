const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDishService } = require('../src/dish-service');
const { scoreQuestion } = require('../src/scoring');
const bank = require('../data/banks/tour5-photo-kitchen');

test('guest reaction is absent for drafts, future questions and old issued variants', () => {
  const question = structuredClone(bank[0]), dish = question.dishes[0];
  const attempt = { variant: { questions: [question] }, answers: {},
    drafts: { [question.id]: { dishId: dish.id, selectedIngredientIds: dish.correctIngredientIds } } };
  assert.equal(buildDishService(attempt), null);
  const answerPayload = { dishId: dish.id, selectedIngredientIds: dish.correctIngredientIds };
  attempt.answers[question.id] = { answerPayload, ...scoreQuestion(question, answerPayload) };
  delete question.guestServiceEnabled;
  assert.equal(buildDishService(attempt), null);
});

test('all 210 saved dish combinations return their exact visual and full-credit reaction only', () => {
  for (const question of bank) {
    const dish = question.dishes[0]; let count = 0;
    for (let a=0;a<5;a++) for (let b=a+1;b<6;b++) for (let c=b+1;c<7;c++) for (let d=c+1;d<8;d++) {
      const ids = [a,b,c,d].map(index => dish.items[index].id);
      const answerPayload = { dishId: dish.id, selectedIngredientIds: ids };
      const score = scoreQuestion(question, answerPayload);
      const attempt = { variant: { questions: [question] }, answers: { [question.id]: { answerPayload, ...score } } };
      const receipt = buildDishService(attempt);
      assert.equal(receipt.mood, score.autoScore === 16 ? 'pleased' : 'puzzled');
      assert.deepEqual(new Set(receipt.composition), new Set(dish.items.filter(item => ids.includes(item.id)).map(item => item.text)));
      const final = dish.photo.finals.find(entry => entry.key === ids.map(id => dish.items.find(item => item.id === id).visual.token).sort().join('+'));
      if (final) assert.deepEqual(receipt.photos.map(photo => photo.imageUrl), [final.imageUrl]);
      else { assert.equal(receipt.isTray, true); assert.equal(receipt.photos.length, 4); }
      assert.doesNotMatch(JSON.stringify(receipt), /correctIngredientIds|isCorrect|autoScore|finalScore|sourceId/);
      count++;
    }
    assert.equal(count,70);
  }
});

test('latest saved receipt is stable under score review and never uses an unanswered next dish', () => {
  const [first, second, third] = structuredClone(bank);
  const payload = question => ({ dishId: question.dishes[0].id, selectedIngredientIds: question.dishes[0].correctIngredientIds });
  const attempt = { variant: { questions: [first, second, third] }, answers: {
    [first.id]: { answerPayload: payload(first), autoScore:16, finalScore:0 },
    [second.id]: { answerPayload: payload(second), autoScore:16, finalScore:0 }
  } };
  const before = JSON.stringify(attempt);
  assert.equal(buildDishService(attempt).questionId,second.id);
  assert.equal(buildDishService(attempt).mood,'pleased');
  assert.equal(JSON.stringify(attempt),before);
  attempt.answers[second.id].answerPayload.selectedIngredientIds = ['foreign'];
  assert.equal(buildDishService(attempt),null);
});
