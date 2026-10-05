export const philadelphia = {
  "title": "Ролл «Филадельфия» с огурцом",
  "variant": "Версия с огурцом • фотографическая сборка",
  "preset": "photo",
  "maxItems": 4,
  "imageUrl": "/assets/olympiad/visual-v3/philadelphia/05912790113024a4.webp",
  "imageAlt": "Фотографический образец Филадельфии с огурцом",
  "note": "Демонстрационный образец подачи версии с огурцом. Выбирайте продукты и рассматривайте свою сборку на большой тарелке.",
  "items": [
    {
      "id": "p_7e36d2",
      "text": "Рис и нори",
      "imageUrl": "/assets/olympiad/tour5/t5-v1-b27662dac3c6.webp",
      "layerUrl": "/assets/olympiad/visual-v3/philadelphia/ec86191f0c73d4e1.webp"
    },
    {
      "id": "p_b921a4",
      "text": "Сливочный сыр",
      "imageUrl": "/assets/olympiad/tour5/t5-v1-381e198037ab.webp",
      "layerUrl": "/assets/olympiad/visual-v3/philadelphia/a78f49864c2d6c23.webp"
    },
    {
      "id": "p_40f8c1",
      "text": "Огурец",
      "imageUrl": "/assets/olympiad/tour5/t5-v1-3eccd3ccf954.webp",
      "layerUrl": "/assets/olympiad/visual-v3/philadelphia/318ad7dc89791ec9.webp"
    },
    {
      "id": "p_d61b09",
      "text": "Лосось",
      "imageUrl": "/assets/olympiad/tour5/t5-v1-35fc57c6ba3f.webp",
      "layerUrl": "/assets/olympiad/visual-v3/philadelphia/11850c907f446a3a.webp"
    },
    {
      "id": "p_2ab7e5",
      "text": "Креветки",
      "imageUrl": "/assets/olympiad/tour5/t5-v1-b27a89865383.webp",
      "layerUrl": "/assets/olympiad/visual-v3/philadelphia/d6b4dba822831099.webp"
    },
    {
      "id": "p_893cd0",
      "text": "Тунец",
      "imageUrl": "/assets/olympiad/tour5/t5-v1-c9d0fd75602e.webp",
      "layerUrl": "/assets/olympiad/visual-v3/philadelphia/bc23f08b1f64f8a0.webp"
    },
    {
      "id": "p_e5047a",
      "text": "Угорь",
      "imageUrl": "/assets/olympiad/tour5/t5-v1-93a1e3924847.webp",
      "layerUrl": "/assets/olympiad/visual-v3/philadelphia/c3d68298e42d23ce.webp"
    },
    {
      "id": "p_16af93",
      "text": "Крабовые палочки",
      "imageUrl": "/assets/olympiad/tour5/t5-v1-661e4c76a647.webp",
      "layerUrl": "/assets/olympiad/visual-v3/philadelphia/4eed71bea66c5a11.webp"
    }
  ],
  "finals": [
    {
      "ids": [
        "p_40f8c1",
        "p_7e36d2",
        "p_b921a4",
        "p_d61b09"
      ],
      "imageUrl": "/assets/olympiad/visual-v3/philadelphia/05912790113024a4.webp"
    },
    {
      "ids": [
        "p_2ab7e5",
        "p_40f8c1",
        "p_7e36d2",
        "p_b921a4"
      ],
      "imageUrl": "/assets/olympiad/visual-v3/philadelphia/3600de5807f7e3a0.webp"
    },
    {
      "ids": [
        "p_40f8c1",
        "p_7e36d2",
        "p_893cd0",
        "p_b921a4"
      ],
      "imageUrl": "/assets/olympiad/visual-v3/philadelphia/650be98f70805a89.webp"
    },
    {
      "ids": [
        "p_2ab7e5",
        "p_40f8c1",
        "p_b921a4",
        "p_d61b09"
      ],
      "imageUrl": "/assets/olympiad/visual-v3/philadelphia/2a8196753302df65.webp"
    }
  ]
};

// Appearance-only catalog for the no-score design demonstration. No grading keys.
export function planPhotos(selectedIds, dish = philadelphia) {
  const ids = [...selectedIds].sort();
  if (ids.length > dish.maxItems || new Set(ids).size !== ids.length ||
      ids.some(id => !dish.items.some(item => item.id === id))) throw new Error('Invalid composition');
  const key = ids.join('+') || 'empty';
  if (!ids.length) return {key, phase: 'empty', paths: []};
  if (ids.length === dish.maxItems) {
    const photo = dish.finals.find(item => [...item.ids].sort().join('+') === key);
    return {key, phase: photo ? 'assembled' : 'unprepared', paths: photo ? [photo.imageUrl] : []};
  }
  return {key, phase: 'open', paths: dish.items.filter(item => ids.includes(item.id)).map(item => item.layerUrl)};
}
