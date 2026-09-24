const test = require("node:test");
const assert = require("node:assert/strict");
const { validateOlympiadName } = require("../src/olympiad-profile");

test("olympiad accepts full names and normalizes spacing", () => {
  assert.deepEqual(validateOlympiadName("  Иванов   Иван Иванович "), {
    valid: true,
    fullName: "Иванов Иван Иванович"
  });
  assert.equal(validateOlympiadName("Ким Анна").valid, true);
  assert.equal(validateOlympiadName("Сидорова-Петрова Мария").valid, true);
});

test("olympiad rejects single-word aliases, numbers and markup in a name", () => {
  for (const value of ["Кулинар", "Иван123 Петров", "xX_Chef_Xx", "<b>Иван</b> Петров", "А Б"]) {
    assert.equal(validateOlympiadName(value).valid, false, value);
  }
});
