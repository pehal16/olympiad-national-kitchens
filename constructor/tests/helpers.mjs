export function correct(q) {
  const k = q.key;
  return {
    single_choice: k.optionId,
    multiple_choice: k.optionIds,
    short_text: k.acceptedAnswers?.[0],
    calculation: { value: k.value, unit: k.unit || "" },
    matching: k.mapping,
    classification: k.mapping,
    ordering: k.order,
    table: k.cells,
    crossword: k.words,
    hotspot: k.zoneIds,
    dish_assembly: { selectedIds: k.selectedIds, placements: k.placements },
    restaurant_kitchen: { selectedIds: k.selectedIds, served: true, phase: 4 },
    safety_checklist: k.checks,
  }[q.type];
}
