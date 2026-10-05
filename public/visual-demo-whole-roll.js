// Appearance and local workflow only. No exam answers, score or grading keys.
export function createWholeRollDish(base) {
  return {
    ...base,
    variant: 'Версия с огурцом • целый ролл без нарезки',
    preset: 'whole-roll',
    imageUrl: '/assets/olympiad/visual-v4/philadelphia/whole-roll-v1.webp',
    imageAlt: 'Один целый длинный ролл Филадельфия с лососем снаружи и огурцом внутри, без нарезки',
    note: 'Ресторанная версия с огурцом. Собираем и подаём один целый ролл без нарезки: рис и нори, сливочный сыр, огурец, лосось снаружи.',
    finals: [{
      ids: ['p_7e36d2', 'p_b921a4', 'p_40f8c1', 'p_d61b09'],
      imageUrl: '/assets/olympiad/visual-v4/philadelphia/whole-roll-v1.webp'
    }]
  };
}

function validate(ids, dish) {
  if (ids.length > dish.maxItems || new Set(ids).size !== ids.length ||
      ids.some(id => !dish.items.some(item => item.id === id))) throw new Error('Invalid composition');
}

export function nextRollStage(stage, action, selectedIds, dish) {
  const ids = [...selectedIds];
  validate(ids, dish);
  if (!['lay', 'rolled', 'served'].includes(stage)) throw new Error('Invalid assembly stage');
  if (action === 'edit' || action === 'clear' || action === 'change') return 'lay';
  if (action === 'roll' && stage === 'lay' && ids.length === dish.maxItems) return 'rolled';
  if (action === 'serve' && stage === 'rolled' && ids.length === dish.maxItems) return 'served';
  return stage;
}

export function planWholeRoll(selectedIds, dish, stage = 'lay') {
  const ids = [...selectedIds].sort();
  validate(ids, dish);
  if (!['lay', 'rolled', 'served'].includes(stage)) throw new Error('Invalid assembly stage');
  const key = ids.join('+') || 'empty';
  if (stage !== 'lay' && ids.length !== dish.maxItems) throw new Error('Incomplete rolled composition');
  if (!ids.length) return { key, phase: 'empty', stage, paths: [] };
  if (stage === 'lay') {
    // Four products still remain laid out until the participant chooses to roll.
    return { key, phase: 'open', stage, paths: dish.items.filter(item => ids.includes(item.id)).map(item => item.layerUrl) };
  }
  const sample = dish.finals.find(item => [...item.ids].sort().join('+') === key);
  return { key, phase: sample ? 'whole' : 'unprepared', stage, paths: sample ? [sample.imageUrl] : [] };
}
