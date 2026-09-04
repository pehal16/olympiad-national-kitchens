"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { PILOT_CONTENT_REVISION, pilotWorks } = require("../src/learning/pilot");
const { validateDefinition } = require("../src/learning/validation");
const { autoGrade } = require("../src/learning/grading");
const { sanitizeForStudent } = require("../src/learning/serializers");

function works() {
  return pilotWorks(["course-mdk", "course-2", "course-3", "course-4", "course-5"], "group-1");
}

test("MDK 01.01 pilot contains seven source-faithful, numbered practices", () => {
  const pilot = works();
  assert.equal(pilot.length, 7);
  pilot.forEach((work, index) => {
    assert.equal(work.courseId, "course-mdk");
    assert.equal(work.kind, "practice");
    assert.match(work.title, new RegExp(`Практическая работа № ${index + 1}`));
    const validation = validateDefinition(work);
    assert.equal(validation.valid, true, `${work.title}: ${JSON.stringify(validation.errors)}`);
    assert.equal(JSON.stringify(sanitizeForStudent(work)).includes("privateKey"), false);
    assert.equal(work.blocks[0].pilotContentRevision, PILOT_CONTENT_REVISION);
  });
  const serialized = JSON.stringify(pilot);
  ["Промежуточный тест", "Жарочный шкаф", "Взбивальная машина", "Холодильный шкаф", "Кроссворд", "Рефлексия"]
    .forEach((foreignText) => assert.equal(serialized.includes(foreignText), false, `unexpected pilot content: ${foreignText}`));
});

test("practice 1 uses the exact soup, puree and raw-material requisition data", () => {
  const work = works()[0];
  const net = work.blocks.find((block) => block.id === "pz1-net");
  const gross = work.blocks.find((block) => block.id === "pz1-gross");
  const request = work.blocks.find((block) => block.id === "pz1-request");
  assert.equal(net.rows.length, 10);
  assert.equal(net.rows[0].cells.perPortion, 100);
  assert.equal(net.rows[0].cells.portions, 25);
  assert.equal(net.rows[6].cells.perPortion, 160);
  assert.equal(net.rows[6].cells.portions, 30);
  assert.deepEqual(gross.rows.map((row) => row.cells.waste), [20, 20, 16, 10, 20]);
  const result = autoGrade(request, { cells: {
    "potato:amount": "9,125", "carrot:amount": "0,625", "onion:amount": "0,446",
    "cabbage:amount": "1,389", "oil:amount": "0,125", "salt:amount": "0,135",
    "milk:amount": "0,900", "butter:amount": "0,300"
  } });
  assert.equal(result.score, request.maxScore);
  assert.equal(result.correct, true);
});

test("practice 2 covers sixteen illustrated spices, application and production controls", () => {
  const work = works()[1];
  const identification = work.blocks.find((block) => block.id === "pz2-identification");
  const classification = work.blocks.find((block) => block.id === "pz2-classification");
  const distinction = work.blocks.find((block) => block.id === "pz2-distinction");
  const usage = work.blocks.find((block) => block.id === "pz2-use");
  const control = work.blocks.find((block) => block.id === "pz2-control");
  const characteristics = work.blocks.find((block) => block.id === "pz2-characteristics");
  assert.equal(identification.leftItems.length, 16);
  assert.ok(identification.leftItems.every((item) => item.src && item.alt));
  assert.equal(classification.items.length, 16);
  assert.equal(Object.keys(classification.privateKey.assignments).length, 16);
  assert.equal(distinction.items.length, 8);
  assert.equal(usage.rows.length, 7);
  assert.equal(usage.privateKey, undefined);
  assert.equal(control.items.length, 8);
  assert.equal(Object.keys(control.privateKey.assignments).length, 8);
  assert.equal(characteristics.rows.length, 16);
  assert.deepEqual(characteristics.columns.map((column) => column.id), ["appearanceAroma", "use", "qualityStorage"]);
  [identification, classification, distinction, usage, control, characteristics]
    .forEach((block) => assert.ok(block.hints?.length, `${block.id} should offer guidance`));
});

test("practice 3 reproduces recipe 423 for beef and twenty portions", () => {
  const work = works()[2];
  const recipe = work.blocks.find((block) => block.id === "pz3-recipe");
  const output = work.blocks.find((block) => block.id === "pz3-output");
  assert.match(work.blocks[0].prompt, /Голунова/);
  assert.match(work.blocks[0].prompt, /№ 423/);
  assert.deepEqual(recipe.rows.map((row) => [row.label, row.cells.gross1, row.cells.net1]), [
    ["Говядина", 103, 76], ["Вода", 12, 12], ["Крупа рисовая", 11, 11],
    ["Лук репчатый", 29, 24], ["Жир для пассерования", 4, 4],
    ["Мука пшеничная", 8, 8], ["Жир для жаренья", 7, 7]
  ]);
  assert.deepEqual(output.rows.map((row) => row.cells.output1), [135, 115, 75, 125, 315]);
  assert.equal(recipe.privateKey.cells["beef:net20"].value, 1520);
  assert.equal(output.privateKey.cells["dish:output20"].value, 6300);
});

test("practices 4 and 5 contain the exact workplace and machine tasks", () => {
  const workplace = works()[3];
  const flow = workplace.blocks.find((block) => block.id === "pz4-flow");
  assert.deepEqual(flow.flowLanes.map((lane) => lane.label), ["Картофель", "Морковь", "Грибы"]);
  assert.equal(flow.flowLanes.flatMap((lane) => lane.steps).length, 15);
  assert.equal(flow.flowLanes.flatMap((lane) => lane.steps).filter((step) => step.requiresControl).length, 3);
  assert.match(flow.wastePath, /маркированная ёмкость/);

  const equipment = works()[4];
  const cards = equipment.blocks.find((block) => block.id === "pz5-cards");
  const time = equipment.blocks.find((block) => block.id === "pz5-time");
  const batches = equipment.blocks.find((block) => block.id === "pz5-batches");
  assert.deepEqual(cards.columns.map((column) => column.label), ["МОК-150М", "МПР-350М"]);
  assert.equal(cards.rows.length, 8);
  assert.equal(time.privateKey.value, 12);
  assert.deepEqual(Object.fromEntries(Object.entries(batches.privateKey.cells).map(([key, value]) => [key, value.value])), {
    "full:value": 4, "remainder:value": 2, "total:value": 5
  });
});

test("practice 6 follows the fish-workplace source task and uses four verified visuals", () => {
  const work = works()[5];
  const source = work.blocks.find((block) => block.id === "pz6-source");
  const zones = work.blocks.find((block) => block.id === "pz6-zones");
  const sanitaryOrder = work.blocks.find((block) => block.id === "pz6-sanitary-order");
  const flow = work.blocks.find((block) => block.id === "pz6-flow");
  const workplace = work.blocks.find((block) => block.id === "pz6-workplace");
  const evidence = work.blocks.find((block) => block.id === "pz6-file");

  assert.equal(work.estimatedMinutes, 90);
  assert.match(work.instructions, /15 кг охлаждённой чешуйчатой рыбы/);
  assert.equal(source.images.length, 4);
  assert.ok(source.images.every((image) => image.src.startsWith("/assets/learning/practices/pz6/") && image.alt));
  assert.deepEqual(zones.categories.map((category) => category.label), [
    "Сырьевая зона", "Предварительная обработка", "Разделочная зона", "Чистая зона"
  ]);
  assert.equal(zones.items.length, 12);
  assert.equal(Object.keys(zones.privateKey.assignments).length, 12);
  assert.deepEqual(sanitaryOrder.privateKey.order, [
    "personal-preparation", "check-raw", "prepare-containers", "dirty-operations",
    "transition-sanitation", "clean-stage", "pack-output", "finish-sanitation"
  ]);
  assert.equal(flow.flowLanes[0].steps.length, 6);
  assert.equal(flow.flowLanes[0].steps.filter((step) => step.requiresControl).length, 4);
  assert.equal(workplace.rows.length, 6);
  assert.deepEqual(workplace.columns.map((column) => column.id), ["equipment", "zone", "control"]);
  assert.equal(evidence.required, true);
  assert.deepEqual(evidence.allowedExtensions, ["pdf", "docx", "jpg", "jpeg", "png"]);
});

test("practice 7 covers fish-processing equipment and safe RO-1M operation for two pairs", () => {
  const work = works()[6];
  const source = work.blocks.find((block) => block.id === "pz7-source");
  const equipment = work.blocks.find((block) => block.id === "pz7-equipment");
  const parts = work.blocks.find((block) => block.id === "pz7-parts");
  const order = work.blocks.find((block) => block.id === "pz7-order");
  const safety = work.blocks.find((block) => block.id === "pz7-safety");
  const card = work.blocks.find((block) => block.id === "pz7-card");
  const evidence = work.blocks.find((block) => block.id === "pz7-file");

  assert.equal(work.estimatedMinutes, 180);
  assert.match(work.title, /Практическая работа № 7/);
  assert.match(work.instructions, /РО-1М/);
  assert.equal(source.images.length, 4);
  assert.ok(source.images.every((image) => image.src.startsWith("/assets/learning/practices/pz7/") && image.alt));
  assert.deepEqual(Object.keys(equipment.privateKey.pairs), ["ro1m", "pr2", "gs1", "grinder"]);
  assert.equal(Object.keys(parts.privateKey.pairs).length, 6);
  assert.deepEqual(order.privateKey.order, [
    "prepare-place", "inspect-machine", "prepare-flow", "idle-check",
    "process-fish", "stop-machine", "disconnect", "clean-parts"
  ]);
  assert.equal(safety.items.length, 12);
  assert.equal(Object.keys(safety.privateKey.assignments).length, 12);
  assert.equal(card.rows.length, 8);
  assert.deepEqual(card.columns.map((column) => column.id), ["action", "control"]);
  assert.equal(evidence.required, true);
  assert.equal(work.blocks.reduce((sum, block) => sum + Number(block.maxScore || 0), 0), 100);
  assert.doesNotMatch(JSON.stringify(work), /при включ[её]нном двигателе/i);
});

test("every scored pilot step has progressive student guidance", () => {
  works().forEach((work) => {
    work.blocks.filter((block) => Number(block.maxScore || 0) > 0).forEach((block) => {
      assert.ok(Array.isArray(block.hints) && block.hints.length > 0, `${work.title}: ${block.id}`);
      assert.ok(block.hints.every((hint) => typeof hint === "string" && hint.trim().length > 12), `${block.id}: weak hint`);
    });
  });
});
