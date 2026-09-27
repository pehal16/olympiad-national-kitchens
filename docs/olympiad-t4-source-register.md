# T4 — реестр источников и изображений

2026-09-27. Локальная редакционная версия, без публикации на production.

32 отдельные фотографии меню созданы встроенным ImageGen после чтения авторских рецептов и фактического просмотра минимум двух различных реальных фотографий на позицию (64 основных референса). Иностранные блюда проверены по конкретным версиям, а не по одному универсальному «канону». Авторские фото не скачаны в проект, не переданы как image inputs и не скопированы композиционно. Чебурек исправлен отдельным edit-вызовом по просьбе пользователя: всего 33 нативных вызова, 0 UI-концептов.

Оригиналы: PNG 1536×1024. Рабочие карточки: WebP 900×600, quality 85, effort 6, пропорциональное уменьшение без обрезки, EXIF/XMP удалены. Имена файлов нейтральные. Все оригиналы и оптимизированные файлы лично открыты главным агентом; затем все 32 позиции просмотрены в настоящем интерфейсе тура. Окончательная эстетическая оценка остаётся за пользователем.

Полная матрица условий/ответов хранится только в игнорируемом локальном `storage/t4-editorial-audit.md`. Ниже нет ролей «правильно/неправильно» и ключа порядка ответов: позиции перечислены по названию. Реестр — документация разработчика, не участнический runtime. Публичность самого репозитория ограничивает секретность серверного банка; это не исправляется скрытием полей API.

Creative Production board-tool недоступен для прямого вызова. Обёртки не использовались; выполнены нативная генерация и индивидуальная проверка каждого файла, а также скриншотов реального UI.

## Позиции меню

### Беляш жареный

- Рецептура: Автор Jane: дрожжевое тесто, говяжий фарш с луком. Собранные края с центральным отверстием, жарка обеих сторон.
- [Авторский источник 1](https://everydfood.com/fried-meat-pie/)
- Просмотренное реальное фото 1: [страница](https://everydfood.com/fried-meat-pie/), [само фото](https://everydfood.com/wp-content/uploads/2023/02/DSCN1836-768x576.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-01-d-ref-a.png`. Круглые жареные пышные изделия, мясо в центральном отверстии.
- Просмотренное реальное фото 2: [страница](https://everydfood.com/fried-meat-pie/), [само фото](https://everydfood.com/wp-content/uploads/2023/02/DSCN1868-768x576.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-01-d-ref-b.png`. Другая фотография беляшей на прямоугольной тарелке, собраные края; зелень не перенесена.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-f7b11c45-732a-43ae-8af8-69c4b8c162e7.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-25e781c94f6a.webp`; 80770 байт; SHA-256 `2faea0cb20bc43427affb8586f13199780924f25ebeb28fe394b717c8d66672f`.
- Визуальная проверка: Дрожжевой пористый мякиш, круглые жареные пирожки с открытым мясным центром и разрезом.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, landscape 3:2. One specific portion on a simple unbranded matte off-white ceramic plate on a light neutral stone table. Soft side-window daylight, plausible cooked texture, moderate natural shadows, 40-degree camera angle so the structure is clearly visible. Entire food portion and plate visible with safe margins, food fills most of the frame. No people, hands, text, packaging, logos, flags, ornaments, watermark, pseudo-letters, plastic texture, excessive shine, flying ingredients, impossible geometry, interface or frame. No unlisted sides, sauces or decoration. Do not copy source photographs. Subject: three round fried belyashi, each made from softly puffed yeast dough with a golden-brown exterior, uneven natural fried patches and a gathered pleated top leaving a small central opening that reveals cooked ground meat and onion. One pie is cleanly cut in half, both halves stay on the same plate, showing airy pale bread-like crumb surrounding a moist cooked meat filling. The other two are whole, with the meat opening clearly visible. This is fried yeast-dough meat pastry, not baked pies, not thin flat chebureki, not dumplings, not doughnuts. No cheese, sauces, garnish or additional ingredients.
```

### Брауни

- Рецептура: Мука, яйца, какао, сливочное масло, сахар и шоколадные chips; нагрев масла с сахаром помогает получить тонкую корочку. Брауни пекут до влажных крошек на тестере, но без сырого теста, остужают перед нарезкой; выбран плотный fudgy вариант без орехов/глазури.
- [Авторский источник 1](https://www.kingarthurbaking.com/recipes/fudge-brownies-recipe)
- Просмотренное реальное фото 1: [страница](https://www.kingarthurbaking.com/recipes/fudge-brownies-recipe), [само фото](https://www.kingarthurbaking.com/sites/default/files/styles/featured_image_sm_2x/public/2026-08/Fudge-Brownies_2026_INT_H_1610.jpg?itok=tUhDAsEv). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T15-10-01-160Z.png`. Лично просмотрено: плотный приготовленный шоколадный срез с очень мелкими порами и включённым шоколадом; тонкая потрескавшаяся верхняя корочка, центр не течёт.
- Просмотренное реальное фото 2: [страница](https://www.kingarthurbaking.com/recipes/fudge-brownies-recipe), [само фото](https://www.kingarthurbaking.com/sites/default/files/styles/featured_image_sm_2x/public/recipe_legacy/4-3-large_0.jpg?itok=B_wh_AEn). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T15-10-03-333Z.png`. Лично просмотрено: квадратные куски брауни с тонкой ломкой корочкой и плотной влажной структурой; кофе/другие порции референса не переносятся.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-bfb5-7b22-a127-ac2acf5e1957/exec-53c2ddc9-33af-41a0-a7cf-7bbb3dbed87b.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-64d018af2c9b.webp`; 72906 байт; SHA-256 `7106c7aa718fe34d3e01f1e51b15f5e84dab8a1eefb83ad80a97afd415d091ca`.
- Визуальная проверка: Два квадратных куска с тонкой потрескавшейся корочкой. Плотный влажный приготовленный срез с шоколадными включениями, без потока/лужи. Без крема/ягод/орехов/сахарной пудры, вся порция и тарелка видны.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional natural editorial food photograph for an educational menu card, landscape 3:2. One specific serving on a simple unbranded matte ivory ceramic plate on a light neutral stone table, soft side window daylight, realistic edible textures, moderate soft shadows, calm light background, camera at 40 degrees above table. Food large and readable at card size, the entire food serving and plate visible without cropping, comfortable safe margins on all sides. No people, hands, text, labels, logos, packaging, flags, ornaments, watermark, pseudo-letters, plastic-looking texture, excessive gloss, floating ingredients, impossible geometry, interface, frame, or unrequested garnish, decoration or sauce. Do not copy any source photograph. Subject: fudgy chocolate brownies. A modest serving of two square brownie pieces about 3 cm high, set low on the plate with a slight natural overlap, cut sides facing the camera. Deep dark-brown cooked dense moist fine-textured crumb with tiny pores and a few embedded chocolate pieces; the brownie holds its square shape, no liquid chocolate or batter flowing out. A delicate thin light-brown paper-like crackly baked top, naturally fractured into fine uneven patches. The crumb looks fudgy and tender rather than airy sponge cake, but it is completely baked and structurally solid. No icing, frosting, cream, berries, nuts, fruit, syrup, melted-chocolate puddle, chocolate sauce, powdered sugar, decoration, extra food or utensils.
```

### Вареники отварные с картофелем

- Рецептура: Автор Ирина Сердюк: начинка из отварного размятого картофеля с луком. Круги теста складывают в полумесяцы, защипывают и отваривают.
- [Авторский источник 1](https://www.iamcook.ru/showrecipe/1329)
- Просмотренное реальное фото 1: [страница](https://www.iamcook.ru/showrecipe/1329), [само фото](https://img.iamcook.ru/old/upl/recipes/cat/u-df1ad945d4eed10bb342926807280d33.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-01-b-ref-a.png`. Отварные полумесяцы с рельефным защипом, соус/лук сервировки исключены.
- Просмотренное реальное фото 2: [страница](https://www.iamcook.ru/showrecipe/1329), [само фото](https://img.iamcook.ru/old/upl/recipes/misc/3c72b09f90f707f5b7da8278f365feaa.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-01-b-ref-b.png`. Другая реальная процессная фотография: светлые вареники отвариваются в кастрюле.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-823bcfb5-6f0d-46ac-8d74-dd332a1b9a94.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-a4128dc7645e.webp`; 46882 байт; SHA-256 `deb807789e7e7e9050925e2d97dadb569a2165731e2343b6c25e49cd002048ac`.
- Визуальная проверка: Полумесяцы, не соединённые кончики, картофельная светлая начинка; без мяса/жарки.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, landscape 3:2. One specific portion on a simple unbranded matte off-white ceramic plate on a light neutral stone table. Soft side-window daylight, plausible cooked texture, moderate natural shadows, 40-degree camera angle so the structure is clearly visible. Entire food portion and plate visible with safe margins, food fills most of the frame. No people, hands, text, packaging, logos, flags, ornaments, watermark, pseudo-letters, plastic texture, excessive shine, flying ingredients, impossible geometry, interface or frame. No unlisted sides, sauces or decoration. Do not copy source photographs. Subject: a portion of six BOILED potato vareniki, soft pale ivory wheat dough, distinct crescent or half-moon shapes, natural handmade pinched braided curved seams, pointed ends NOT joined into rings. Five whole and one neatly cut into two halves, both halves on the plate, cross-section facing camera clearly showing a pale cream mashed potato filling with just subtle onion specks. Thin pliable cooked dough with gentle moisture, natural handmade variation. Absolutely no browning or frying, no meat filling, no upright pleated khinkali, no ring-shaped pelmeni, no cheese stretches, no fried onion topping, no sour cream, no garnish, no broth or utensils.
```

### Говядина вок полосками с перцем и луком

- Рецептура: Bill Leung, Pepper Steak: тонкие полоски говядины поперёк волокон, сладкий красный/зелёный перец и лук; овощи можно резать полосками. Быстрая жарка в воке, коричневая соево-устричная основа, без лапши/риса в самом блюде; отдельную подачу риса не переносим.
- [Авторский источник 1](https://thewoksoflife.com/pepper-steak-recipe/)
- [Авторский источник 2](https://thewoksoflife.com/beef-and-pepper-stir-fry/)
- Просмотренное реальное фото 1: [страница](https://thewoksoflife.com/pepper-steak-recipe/), [само фото](https://thewoksoflife.com/wp-content/uploads/2022/12/pepper-steak-11.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-03-c-ref-a.png`. Готовые натурально неровные полоски мяса, перец/лук, коричневый соус; орнаменты посуды и палочки исключены.
- Просмотренное реальное фото 2: [страница](https://thewoksoflife.com/pepper-steak-recipe/), [само фото](https://thewoksoflife.com/wp-content/uploads/2022/12/pepper-steak-9.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-03-c-ref-b.png`. Другая процессная фотография готовой смеси в воке, видно натуральное сочетание мяса/перца/лука; вок и лопатка исключены.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-5d807ea6-464f-40f6-9fa8-64a0b8e2afc7.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-ba305d7f18c6.webp`; 97510 байт; SHA-256 `ec6f530fa91f297901b1b08b8faf3f26c012ddd9d17781e7f7ce1b6177cb333c`.
- Визуальная проверка: Полоски говядины преобладают, красный/зелёный перец и лук, умеренный соус; без ананаса/лапши/риса/курицы.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, landscape 3:2. One specific portion on a simple unbranded matte off-white ceramic plate on a light neutral stone table. Soft side-window daylight, plausible cooked texture, moderate natural shadows, 40-degree camera angle so the structure is clearly visible. Entire food portion and plate visible with safe margins, food fills most of the frame. No people, hands, text, packaging, logos, flags, ornaments, watermark, pseudo-letters, plastic texture, excessive shine, flying ingredients, impossible geometry, interface or frame. No unlisted sides, sauces or decoration. Do not copy source photographs. Subject: one portion of wok stir-fried beef with sweet red and green bell peppers and softened onion. Beef is cut against the grain into thin irregular elongated strips, naturally curled at some edges, with browned seared surfaces and recognizable fibrous cooked meat texture, not uniform cubed nuggets. Bell pepper and onion are cut into matching strips, lightly cooked with softened surfaces while keeping their real vegetable structure. A small amount of natural brown soy-and-oyster-based sauce clings thinly to the beef and peppers, not a puddle or thick neon syrup. Beef is the dominant visible ingredient. No noodles, rice, pineapple, fruit, chicken, broccoli, carrots, sesame seeds, scallions, herb garnish or other foods. No wok, utensils or chopsticks in frame.
```

### Гренки с сыром

- Рецептура: Выбрана простая версия: ломтики хлеба около 1.5 см обжаривают с одной стороны, переворачивают, посыпают полутвёрдым сыром и дают ему расплавиться. Второй редакционный рецепт показывает запечённые ломтики белого хлеба с сыром; его зелень и сметанный вариант не переносятся.
- [Авторский источник 1](https://www.gastronom.ru/recipe/55302/grenki-s-syrom-na-skovorode)
- [Авторский источник 2](https://www.gastronom.ru/recipe/57877/grenki-pjatiminutki-s-syrom-v-duhovke)
- Просмотренное реальное фото 1: [страница](https://www.gastronom.ru/recipe/55302/grenki-s-syrom-na-skovorode), [само фото](https://images.gastronom.ru/VcVbT3sdd3LcThFe_rcRvhtuglnA3UzdFp_meTKLl5o/pr:recipe-cover-image/g:ce/rs:auto:0:0:0/L2Ntcy9hbGwtaW1hZ2VzLzRiODBkYjRlLWU5NDEtNDY5MC04OTY3LThlOTNiYzAyYmU2OS5qcGc.webp). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T15-07-52-695Z.png`. Three recognizable toasted white-bread slices with visible bread structure and melted pale cheese; pan/juice/paprika and outdoor styling not reused.
- Просмотренное реальное фото 2: [страница](https://www.gastronom.ru/recipe/57877/grenki-pjatiminutki-s-syrom-v-duhovke), [само фото](https://images.gastronom.ru/KLMoUkyYK50B5DVnB4kdX0bKGkoSALhJr9TmcOuKXRI/pr:recipe-cover-image/g:ce/rs:auto:0:0:0/L2Ntcy9hbGwtaW1hZ2VzLzA0NzUwMzE3LTM2OTctNGJhMy1hMGVhLWM2YjM1MzBkZmQ0OC5qcGc.webp). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T15-07-54-523Z.png`. Baked white-bread cheese toasts with browned edges, porous crumb and melted cheese. Source herbs are omitted because selected simpler pan recipe requires no herbs.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-bfb5-7b22-a127-ac2acf5e1957/exec-7d0ed3dc-cca2-4faf-bafa-c1fea41ee476.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-348af1be026d.webp`; 76506 байт; SHA-256 `a7d5c562e118971a9a9ff9f817ff764b4954e70331ad680e0a25edd8e9c94b3d`.
- Визуальная проверка: Три ломтика хлеба, открытый пористый мякиш и корка. Расплавленный сыр, без сладких соусов/ягод/зелени. Порция и тарелка полностью видны, без текста/национальных маркеров.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional natural editorial food photograph for an educational menu card, landscape 3:2. One specific serving on a simple unbranded matte ivory ceramic plate on a light neutral stone table, soft side window daylight, realistic edible textures, moderate soft shadows, calm light background, camera at 40 degrees above table. Food large and readable at card size, the entire food serving and plate visible without cropping, comfortable safe margins on all sides. No people, hands, text, labels, logos, packaging, flags, ornaments, watermark, pseudo-letters, plastic-looking texture, excessive gloss, floating ingredients, impossible geometry, interface, frame, or unrequested garnish, decoration or sauce. Do not copy any source photograph. Subject: savory cheese toast, Russian grenki with cheese. One modest serving of three toasted slices of ordinary white bread, about 1.5 cm thick, with naturally porous bread crumb clearly visible at the cut sides and a golden toasted crust. A modest layer of grated semi-hard cheese has melted unevenly on each top with small pale creamy patches and a few light golden spots; leave part of the bread surface readable, not a solid thick cheese slab. Lay the bread slices low, casually side by side with only slight overlap, not a sandwich. This must unmistakably be sliced bread with cheese, not pancakes, French toast with sweet toppings, or waffles. No herbs, paprika dust, berries, fruit, sugar, glaze, jam, syrup, sauce bowl, extra foods or utensils.
```

### Капрезе

- Рецептура: Fresh cold sliced red tomato, fresh mozzarella and basil salad with modest olive-oil moisture, no balsamic glaze or extra salad ingredients.
- Проверенный факт: Love and Lemons documents sliced ripe tomato, water-packed fresh mozzarella and basil, assembled without cooking; balsamic is explicitly optional.
- Проверенный факт: Kenji López-Alt's primary Serious Eats recipe confirms fresh mozzarella, tomato, basil and olive oil and recommends avoiding balsamic or pesto.
- Проверенный факт: Only red tomato slices selected to reduce visual confusion with cucumber; no fruit, avocado, Greek-salad additions or melted cheese.
- [Авторский источник 1](https://www.loveandlemons.com/caprese-salad/)
- [Авторский источник 2](https://www.seriouseats.com/classic-caprese-salad-recipe)
- Просмотренное реальное фото 1: [страница](https://www.loveandlemons.com/caprese-salad/), [само фото](https://cdn.loveandlemons.com/wp-content/uploads/2019/08/caprese-salad-recipe.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/06-d-1.png`. Personally viewed finished salad photograph: sliced ripe heirloom tomatoes, soft fresh white mozzarella and broad basil leaves. Colored heirloom tomatoes, surrounding props and utensils not carried into final.
- Просмотренное реальное фото 2: [страница](https://www.seriouseats.com/classic-caprese-salad-recipe), [само фото](https://www.seriouseats.com/thmb/K94N9SoTuHNaN2-x-4XPpdxboUk%3D/1500x0/filters%3Ano_upscale%28%29%3Amax_bytes%28150000%29%3Astrip_icc%28%29%3Aformat%28webp%29/classic-caprese-salad-recipe-hero-05_1-9ce2f9b0601c45279e07320f9548fa66.JPG). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/06-d-3.png`. Personally viewed second independently photographed real salad credited to Julia Estrada: ripe tomato seed chambers, irregular fresh mozzarella with milky texture and basil. Bread, utensils, colored table and seasoning abundance excluded.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-4d9b-7c62-819b-cde780f9088f/exec-41d66d90-564a-45fe-aa96-6d13714c92db.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-09be1d7c438a.webp`; 68046 байт; SHA-256 `82969acbdb1c5c5ead891754f063ae0c5daafa3c5d09b8550b0460c7f205dfe7`.
- Визуальная проверка: Entire plate visible; red juicy tomato slices, white fresh mozzarella and basil only, cold ungrilled presentation, natural texture and modest moisture, no excluded Greek-salad ingredients.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, not a collage. Landscape 3:2. Scene: calm light neutral stone tabletop, simple unbranded off-white ceramic plate or shallow bowl appropriate to the food, soft side window daylight, realistic food textures, moderate natural shadows, restrained highlights. Camera at 35-45 degrees above table unless a slightly higher angle is needed to show structure. The entire portion and entire dish must fit in frame with clear safe margins on all sides; food large and readable at thumbnail size. Subject: one fresh cold Caprese salad portion on a simple round off-white ceramic plate. Ripe red tomato slices with authentic juicy seed chambers alternate loosely with slices of soft fresh white mozzarella and a few fresh green basil leaves tucked naturally between them. Clearly tomato, fresh mozzarella and basil only; natural variation in the slice edges and widths, delicate milky cheese texture, thin transparent olive-oil moisture, no exaggerated gloss. A modest appetizing composition, not a precisely identical geometric fan and not a stacked tower. No cucumber, olives, feta, onion, lettuce, avocado, fruit, nuts, balsamic glaze, pesto, bread, grilled components, melted cheese, extra herb garnish or additional food. No unmentioned garnishes, sides, sauces or decorations. No people, hands, text, lettering, packaging, logos, watermark, flags, national ornaments, country props, interfaces or frames. No CGI or plastic food, excessive shine, flying ingredients or impossible geometry. Do not copy any reference photograph.
```

Дополнительно просмотрен близкий кроп, **не засчитанный** вторым референсом: [фото](https://cdn.loveandlemons.com/wp-content/uploads/2019/08/caprese-salad-recipe-1.jpg); `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/06-d-2.png`.

### Кесадилья с сыром без мяса

- Рецептура: Isabel Orozco-Moore: сыр на половине тонкой мучной тортильи. Тортилью складывают, поджаривают в сковороде до расплавления сыра.
- [Авторский источник 1](https://www.isabeleats.com/cheese-quesadilla/)
- Просмотренное реальное фото 1: [страница](https://www.isabeleats.com/cheese-quesadilla/), [само фото](https://www.isabeleats.com/wp-content/uploads/2024/03/cheese-quesadillas-small-9.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-02-a-ref-a.png`. Готовые сектора с тонкими оболочками и расплавленным сыром; все соусы исключены.
- Просмотренное реальное фото 2: [страница](https://www.isabeleats.com/cheese-quesadilla/), [само фото](https://www.isabeleats.com/wp-content/uploads/2024/03/cheese-quesadillas-small-5.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-02-a-ref-b.png`. Отдельный кадр сырного разреза/тяги; рука и соусы не перенесены.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-78dd8292-cd63-43db-848e-7c728ebad53e.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-c2b17f804e93.webp`; 68400 байт; SHA-256 `ac939b0380a7dfa4395151c8d743a9336265fad2c3e8821931feb8505813379b`.
- Визуальная проверка: Три сырных сектора тонкой сложенной тортильи, без мяса, пиццы, открытого тако или гарниров.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, landscape 3:2. One specific portion on a simple unbranded matte off-white ceramic plate on a light neutral stone table. Soft side-window daylight, plausible cooked texture, moderate natural shadows, 40-degree camera angle so the structure is clearly visible. Entire food portion and plate visible with safe margins, food fills most of the frame. No people, hands, text, packaging, logos, flags, ornaments, watermark, pseudo-letters, plastic texture, excessive shine, flying ingredients, impossible geometry, interface or frame. No unlisted sides, sauces or decoration. Do not copy source photographs. Subject: one cheese-only quesadilla made from a large thin soft flour tortilla folded in half around melted pale Monterey Jack cheese, toasted in a skillet until unevenly golden brown and lightly blistered. Cut into three substantial triangular sectors resting naturally beside each other, not a stack of thick pancakes. One cut edge angled toward the camera clearly shows the two thin tortilla layers and warm melted cheese between them; a short natural cheese strand may connect two adjacent sectors, not a dramatic suspended cheese pull. No meat, vegetables, herbs, salsa, sour cream, guacamole, additional foods or bowls. Not a pizza, open taco, burrito, layered flatbread or bread sandwich.
```

### Кольца кальмара в кляре

- Рецептура: Restaurant sous-chef Ilya Kipryushkin's squid rings in egg/flour/sour-cream batter, lightly fried; no breadcrumb or onion-ring substitution.
- Проверенный факт: The named chef recipe cleans squid, slices it into rings, dips into flour and egg/flour/sour-cream batter, and fries until golden. Cross-cut shows one solid white seafood wall, not onion layers.
- [Авторский источник 1](https://ura-povara.ru/recipes/kolca-kalmara-v-kljare/)
- Просмотренное реальное фото 1: [страница](https://ura-povara.ru/recipes/kolca-kalmara-v-kljare/), [само фото](https://ura-povara.ru/wp-content/uploads/2019/01/kolca-kalmara-v-klyare-final-desktop-624-351.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/05-b-1.png`. Personally viewed finished fried squid rings: moderately thin pale/golden egg coating, irregular ring shapes.
- Просмотренное реальное фото 2: [страница](https://ura-povara.ru/recipes/kolca-kalmara-v-kljare/), [само фото](https://ura-povara.ru/wp-content/uploads/2019/01/kolca-kalmara-v-klyare-02.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/05-b-2.png`. Personally viewed preparation: actual sliced squid tube rings, smooth single pale flesh wall, no onion layering.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-4d9b-7c62-819b-cde780f9088f/exec-2f9b685b-8580-4c9e-b88b-85d0df6b60f5.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-249f1ce708ba.webp`; 69604 байт; SHA-256 `5474d11e08a8f83d10af34f13f1c4fdd1c81bf237caf15dc876eb44635a2ae8d`.
- Визуальная проверка: Seven golden battered rings with one cut open showing solid white squid. No concentric onion layers, tentacles, sauces or extras.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, not a collage. Landscape 3:2. Scene: calm light neutral stone tabletop, simple unbranded off-white ceramic plate or shallow bowl appropriate to the food, soft side window daylight, realistic food textures, moderate natural shadows, restrained highlights. Camera at 35-45 degrees above table unless a slightly higher angle is needed to show structure. The entire portion and entire dish must fit in frame with clear safe margins on all sides; food large and readable at thumbnail size. Subject: seven cooked squid calamari rings lightly coated in a moderate egg-and-flour batter and fried to light golden brown. Naturally uneven elliptical rings with small variations in diameter, thin crisp irregular coating, NOT thick breadcrumb doughnuts. One ring is neatly cut across its tube wall with its two cut ends facing camera, clearly revealing a single solid opaque white squid-meat band beneath the thin golden coating. The cut interior is smooth seafood flesh with no concentric vegetable layers. No onion rings, onion fibers, shrimp, tentacles, fries, lemon, sauces or green garnish. No unmentioned garnishes, sides, sauces or decorations. No people, hands, text, lettering, packaging, logos, watermark, flags, national ornaments, country props, interfaces or frames. No CGI or plastic food, excessive shine, flying ingredients or impossible geometry. Do not copy any reference photograph.
```

### Креветки темпура

- Рецептура: Shrimp-only ebi tempura, lightly battered with tails left on; no rice, noodle, roll or vegetable assortment.
- Проверенный факт: Namiko Hirasawa Chen describes light ice-cold flour/egg/water batter and frying to a pale-golden airy coating. She explicitly contrasts light specialist/home coating with excess hanaage batter; shrimp are prepared to remain fairly straight.
- [Авторский источник 1](https://www.justonecookbook.com/shrimp-tempura/)
- Просмотренное реальное фото 1: [страница](https://www.justonecookbook.com/shrimp-tempura/), [само фото](https://cdn.justonecookbook.com/spai/q_glossy%2Bret_img%2Bto_auto/www.justonecookbook.com/wp-content/uploads/2020/03/Shrimp-Tempura-3130-II.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/05-a-1.png`. Personally viewed real vertical photograph: shrimp with tails in light golden uneven batter, no panko crumbs. Sauce and basket excluded.
- Просмотренное реальное фото 2: [страница](https://www.justonecookbook.com/shrimp-tempura/), [само фото](https://cdn.justonecookbook.com/spai/q_glossy%2Bret_img%2Bto_auto/www.justonecookbook.com/wp-content/uploads/2020/03/Shrimp-Tempura-3138-I.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/05-a-2.png`. Personally viewed separate horizontal photograph of same recipe, closer side angle: pale airy coating and tail visibility. No vegetables adopted.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-4d9b-7c62-819b-cde780f9088f/exec-0ddc22a2-f2d2-4c25-bbca-d60f67a8c10c.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-75dc924af180.webp`; 65666 байт; SHA-256 `173641e7ec947e3ddf67f27ae5027bb928f6026730133f812a8215ed8c19ec04`.
- Визуальная проверка: Five shrimp with visible red tail fans and light golden airy thin-edged batter, not dry panko or nugget shapes; entire plate with margins, no extras.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, not a collage. Landscape 3:2. Scene: calm light neutral stone tabletop, simple unbranded off-white ceramic plate or shallow bowl appropriate to the food, soft side window daylight, realistic food textures, moderate natural shadows, restrained highlights. Camera at 35-45 degrees above table unless a slightly higher angle is needed to show structure. The entire portion and entire dish must fit in frame with clear safe margins on all sides; food large and readable at thumbnail size. Subject: five shrimp tempura with exposed small coral-red tail fans, recognizable slender shrimp bodies lightly straightened. The shrimp have a THIN light pale-golden crisp tempura batter, delicate airy irregular tiny bubbles and a few fine lacy edges, close to the natural shrimp outline, not bulky. Simple loose low arrangement so each shrimp and its tail can be understood. Not breaded panko ebi fry, not thick dry crumbs, chicken nuggets, large rough battered cylinders or massive coating. No rice, noodles, sushi rolls, vegetables, lemon, dipping sauce or decorative paper. No unmentioned garnishes, sides, sauces or decorations. No people, hands, text, lettering, packaging, logos, watermark, flags, national ornaments, country props, interfaces or frames. No CGI or plastic food, excessive shine, flying ingredients or impossible geometry. Do not copy any reference photograph.
```

### Куриные наггетсы

- Рецептура: Автор Natasha Kravchuk: курицу мелко измельчают и формуют небольшими порциями. Выбрана подтверждённая версия золотистой панировки из мелко дроблённых cornflakes и Parmesan; запекание, без соусов/гарниров в визуале.
- [Авторский источник 1](https://natashaskitchen.com/baked-chicken-nuggets-recipe/)
- Просмотренное реальное фото 1: [страница](https://natashaskitchen.com/baked-chicken-nuggets-recipe/), [само фото](https://natashaskitchen.com/wp-content/uploads/2014/11/Baked-Chicken-Nuggets-21-600x900.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-03-d-ref-a.png`. Готовые небольшие овальные наггетсы с золотистой крошкой; рука, кетчуп и watermark не переносим.
- Просмотренное реальное фото 2: [страница](https://natashaskitchen.com/baked-chicken-nuggets-recipe/), [само фото](https://natashaskitchen.com/wp-content/uploads/2014/11/Baked-Chicken-Nuggets-12.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-03-d-ref-b.png`. Отдельное фото запечённых небольших наггетсов на противне с тонкой зернистой панировкой; противень/бумага исключены.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-435f5f76-2ad6-4f9b-bf46-17ffde6aa11c.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-0ce96a1754bf.webp`; 91068 байт; SHA-256 `82b012a549c2a4dd1465f9d5396064cf1ec96da9434122f0f6f4cc05bbbcfee8`.
- Визуальная проверка: Овальные небольшие наггетсы с естественной крошкой и светлой куриной серединой в разрезе; без сосисок/сырной тяги/фри/соусов/брендов.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, landscape 3:2. One specific portion on a simple unbranded matte off-white ceramic plate on a light neutral stone table. Soft side-window daylight, plausible cooked texture, moderate natural shadows, 40-degree camera angle so the structure is clearly visible. Entire food portion and plate visible with safe margins, food fills most of the frame. No people, hands, text, packaging, logos, flags, ornaments, watermark, pseudo-letters, plastic texture, excessive shine, flying ingredients, impossible geometry, interface or frame. No unlisted sides, sauces or decoration. Do not copy source photographs. Subject: one portion of seven small homemade chicken nuggets, slightly irregular flattened oval bite-sized shapes with realistic crisp golden breadcrumb coating made from finely crushed cornflakes and a little Parmesan. Not factory-perfect repeated circles. One nugget is cut open into two nearby halves revealing a moist pale cooked chicken center that is finely chopped, no raw pink meat. Thin crisp coating with small visible crumbs, cooked matte-golden surface, natural variation in browning. All pieces on one plate. No fries, potatoes, dipping sauce, bowls, ketchup, vegetables, herbs, lemon, branding or additional foods. No elongated tenders, sausages, cheese sticks or giant schnitzel.
```

### Куриный рулет с сыром

- Рецептура: Julia cook's boneless whole chicken-thigh fillet rolled around hard cheese, baked and sliced for the card.
- Проверенный факт: The author's recipe debones and unfolds chicken thighs, adds hard cheese, rolls and bakes. The selected core filling is cheese only, not ham, sausage, omelet or ground meat.
- [Авторский источник 1](https://www.iamcook.ru/showrecipe/24211)
- Просмотренное реальное фото 1: [страница](https://www.iamcook.ru/showrecipe/24211), [само фото](https://img.iamcook.ru/2021/upl/recipes/zen/u-8d90dc2c6b94ccbae4cab73c6677e42b.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/04-d-1.png`. Personally viewed: browned baked chicken thigh rolls with cheese, no minced filling.
- Просмотренное реальное фото 2: [страница](https://www.iamcook.ru/showrecipe/24211), [само фото](https://img.iamcook.ru/2021/upl/recipes/byusers/misc/137451/cdfd4ce96a977a20b3610a803e2352a2-2021.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/04-d-2.png`. Personally viewed: unfolded whole raw chicken thigh fillets topped with grated cheese before rolling.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-4d9b-7c62-819b-cde780f9088f/exec-6ebc4bbe-ba20-4626-b566-92e931b1e347.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-a671e93bf480.webp`; 65542 байт; SHA-256 `fafea7c9f7d4c88385b3bdd43d64d716cf9dc03a40af44b94bd013f34178dc4c`.
- Визуальная проверка: Sliced rolled whole chicken fillet with clear fibers and pale-yellow cheese on cut faces, thin browned exterior, no minced sausage structure.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, not a collage. Landscape 3:2. Scene: calm light neutral stone tabletop, simple unbranded off-white ceramic plate or shallow bowl appropriate to the food, soft side window daylight, realistic food textures, moderate natural shadows, restrained highlights. Camera at 35-45 degrees above table unless a slightly higher angle is needed to show structure. The entire portion and entire dish must fit in frame with clear safe margins on all sides; food large and readable at thumbnail size. Subject: one small cooked chicken roulade with hard cheese, made by rolling a boneless whole chicken thigh fillet around thin cheese layers. Serve as four or five thick crosswise slices loosely overlapping, no intact sausage-looking cylinder. Each cut face must show natural whole-muscle pale cooked chicken fibers folded in a loose spiral around a modest pale-yellow melted cheese layer, with slightly uneven juicy structure and a thin golden browned exterior. Real rolled intact fillet, not ground chicken, sausage filling, smooth processed meat or a solid block of cheese. No ham, bacon, egg omelet, vegetables, herbs, mushrooms, bread, crumbs, sauce or other filling. No unmentioned garnishes, sides, sauces or decorations. No people, hands, text, lettering, packaging, logos, watermark, flags, national ornaments, country props, interfaces or frames. No CGI or plastic food, excessive shine, flying ingredients or impossible geometry. Do not copy any reference photograph.
```

### Курица в кисло-сладком соусе с ананасом и перцем

- Рецептура: Bill Leung: жареные кусочки курицы в лёгком кляре, кетчупно-уксусный соус, лук/сладкий перец; ананас явно допускается рецептом. Helen: конкретная версия с ананасными кусочками, сладким перцем и луком; фото этой версии реально проверены.
- [Авторский источник 1](https://thewoksoflife.com/sweet-and-sour-chicken/)
- [Авторский источник 2](https://hintofhelen.com/sweet-sour-chicken-fakeaway/)
- Просмотренное реальное фото 1: [страница](https://hintofhelen.com/sweet-sour-chicken-fakeaway/), [само фото](https://hintofhelen.com/wp-content/uploads/2019/07/Sweet-Sour-Chicken-Recipe-Hint-of-Helen-3-1170x1755.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-03-a-ref-a.png`. Отдельная фотография сверху: курица, перец/лук и жёлтые ананасные кусочки в красно-янтарном соусе.
- Просмотренное реальное фото 2: [страница](https://hintofhelen.com/sweet-sour-chicken-fakeaway/), [само фото](https://hintofhelen.com/wp-content/uploads/2019/07/Sweet-Sour-Chicken-Recipe-Hint-of-Helen-12-1170x1755.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-03-a-ref-b.png`. Другая фотография той же версии с ананасом и перцем, иной угол и размещение; зелень, палочки, дополнительные блюда исключены.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-3be07d5f-434a-4bf7-8317-6623f80b2b10.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-97a341bf650e.webp`; 87636 байт; SHA-256 `0f3c273078d3040078569eea4da3ba010b5a8122284853b2b1b6b2ba62bb3488`.
- Визуальная проверка: Небольшие кусочки курицы, ананас различим, красный/зелёный перец и лук; естественный красно-янтарный соус, нет риса/лапши/зелени.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, landscape 3:2. One specific portion on a simple unbranded matte off-white ceramic plate on a light neutral stone table. Soft side-window daylight, plausible cooked texture, moderate natural shadows, 40-degree camera angle so the structure is clearly visible. Entire food portion and plate visible with safe margins, food fills most of the frame. No people, hands, text, packaging, logos, flags, ornaments, watermark, pseudo-letters, plastic texture, excessive shine, flying ingredients, impossible geometry, interface or frame. No unlisted sides, sauces or decoration. Do not copy source photographs. Subject: one portion of sweet-and-sour chicken with pineapple and sweet bell peppers. Tender cooked chicken in irregular bite-sized chunks with a thin lightly crisp battered surface, interspersed with clearly recognizable golden-yellow pineapple chunks and cooked red and green bell pepper pieces, a few softened onion pieces. A moderate translucent natural red-amber ketchup-and-vinegar sweet-and-sour sauce lightly coats the chicken and vegetables; cooked chicken and pineapple textures remain visible, not covered in thick fluorescent red syrup. All ingredients rest realistically on the plate, no floating pieces. No rice, noodles, sesame seeds, scallions, herbs, sauces in separate bowls, spring rolls or additional foods. Not teriyaki strips, orange chicken, nuggets or beef.
```

### Курица терияки ломтиками без фруктов

- Рецептура: Автор Namiko Hirasawa Chen: обжаренные бескостные бёдра курицы, затем нарезка. Основная глазурь — соевый соус, мирин, саке и сахар; без фруктов и кунжутной посыпки.
- [Авторский источник 1](https://www.justonecookbook.com/chicken-teriyaki/)
- Просмотренное реальное фото 1: [страница](https://www.justonecookbook.com/chicken-teriyaki/), [само фото](https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2024/04/Chicken-Teriyaki-7968-I-2-800x534.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-03-b-ref-a.png`. Готовые поперечные ломтики курицы с коричневой глазурью; салат/томат/соусник/watermark не перенесены.
- Просмотренное реальное фото 2: [страница](https://www.justonecookbook.com/chicken-teriyaki/), [само фото](https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2025/12/Teriyaki-Chicken-Skin-Off-step-by-step-73-800x533.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-03-b-ref-b.png`. Другая реальная процессная фотография нарезки: светлые срезы и обжаренный верх, руки/нож не переносим.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-1657aed9-c615-4924-8e1a-f5bf81985a11.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-613be72c9a05.webp`; 87386 байт; SHA-256 `0e60c12459f6f0313eb3c934e73b62ad2e89969a43c0bbba245745b55bdd3503`.
- Визуальная проверка: Куриные срезы видны, коричневая глазурь и обжаренный верх; без фруктов, гарниров, овощей и дополнительных соусов.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, landscape 3:2. One specific portion on a simple unbranded matte off-white ceramic plate on a light neutral stone table. Soft side-window daylight, plausible cooked texture, moderate natural shadows, 40-degree camera angle so the structure is clearly visible. Entire food portion and plate visible with safe margins, food fills most of the frame. No people, hands, text, packaging, logos, flags, ornaments, watermark, pseudo-letters, plastic texture, excessive shine, flying ingredients, impossible geometry, interface or frame. No unlisted sides, sauces or decoration. Do not copy source photographs. Subject: one portion of teriyaki chicken, two boneless cooked chicken thighs neatly sliced across into thick bite-sized strips, arranged naturally in two overlapping rows on the plate. Each strip has a lightly browned pan-seared exterior with a restrained rich brown soy-and-sugar glaze made with mirin and sake, and several cut faces clearly reveal tender pale cooked chicken. Glaze adheres thinly to the meat rather than drowning it in a puddle; natural modest sheen, not plastic or neon sauce. No fruit whatsoever, no pineapple, peppers, sesame seeds, scallions, rice, noodles, salad, tomato wedges, sauce bowl, garnish or extra foods. Not battered sweet-and-sour chicken or beef stir fry.
```

### Лосось на гриле

- Рецептура: Heidi Larsen's plain grilled whole salmon fillet with oil/salt/pepper; sides, sauce and lemon omitted for the educational card.
- Проверенный факт: This author-tested grill recipe uses intact skin-on salmon fillets, seasons simply, cooks on hot grates and briefly turns to brown the flesh. The structure remains a fillet with flakes rather than battered fish.
- [Авторский источник 1](https://www.foodiecrush.com/best-grilled-salmon/)
- Просмотренное реальное фото 1: [страница](https://www.foodiecrush.com/best-grilled-salmon/), [само фото](https://www.foodiecrush.com/wp-content/uploads/2019/05/Grilled-Salmon-foodiecrush.com-029-683x1024.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/05-c-1.png`. Personally viewed finished individual coral salmon fillet with char lines alongside salad/asparagus; all sides excluded.
- Просмотренное реальное фото 2: [страница](https://www.foodiecrush.com/best-grilled-salmon/), [само фото](https://www.foodiecrush.com/wp-content/uploads/2019/05/Grilled-Salmon-foodiecrush.com-023-683x1024.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/05-c-3.png`. Personally viewed separate cooked-fillet platter photograph: natural tapered sections and muscle lines. Lemon/sauce excluded.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-4d9b-7c62-819b-cde780f9088f/exec-1a9f22e8-dde7-4e63-9af8-1cf9ebfe3ddc.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-f1ed6037a8b2.webp`; 63544 байт; SHA-256 `c67bcab106376123a950b9887c519b2cc3da4779c21bb76f779c2a75448f64f2`.
- Визуальная проверка: One intact tapered cooked salmon fillet, natural muscle flakes and modest grill marks, skin edge, no batter or garnish.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, not a collage. Landscape 3:2. Scene: calm light neutral stone tabletop, simple unbranded off-white ceramic plate or shallow bowl appropriate to the food, soft side window daylight, realistic food textures, moderate natural shadows, restrained highlights. Camera at 35-45 degrees above table unless a slightly higher angle is needed to show structure. The entire portion and entire dish must fit in frame with clear safe margins on all sides; food large and readable at thumbnail size. Subject: one modest cooked grilled salmon FILLET portion with its natural tapered whole-fillet form, not a cross-cut horseshoe steak. Warm coral-orange cooked flesh, fine naturally separated muscle flakes along the side, a thin darker skin edge underneath, only three or four subtle authentic browned grill marks on top. Freshly cooked moist fish, restrained natural sheen, not raw sashimi and not an artificially glossy glaze. No batter, breading, sauce, rice, noodles, lemon, vegetables, herbs or other side dishes. No unmentioned garnishes, sides, sauces or decorations. No people, hands, text, lettering, packaging, logos, watermark, flags, national ornaments, country props, interfaces or frames. No CGI or plastic food, excessive shine, flying ingredients or impossible geometry. Do not copy any reference photograph.
```

### Люля-кебаб

- Рецептура: Ground lamb-and-beef mixture formed into elongated continuous kebabs on metal skewers, without bread or sides.
- Проверенный факт: Janelle Leatherwood's first-hand family recipe mixes ground lamb and beef with onion and seasoning, shapes long patties around skewers and grills them. The key distinction is ground meat, not intact cubes.
- [Авторский источник 1](https://thestuffedgrapeleaf.com/lula-kebabs/)
- Просмотренное реальное фото 1: [страница](https://thestuffedgrapeleaf.com/lula-kebabs/), [само фото](https://thestuffedgrapeleaf.com/wp-content/uploads/2022/04/lula-kebabs-flame-720x476.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/04-b-1.png`. Personally viewed: continuous hand-formed long ground-meat kebabs on metal skewers grilling; whole-muscle barbecue behind excluded.
- Просмотренное реальное фото 2: [страница](https://thestuffedgrapeleaf.com/lula-kebabs/), [само фото](https://thestuffedgrapeleaf.com/wp-content/uploads/2022/04/lula-kebabs-bbq-720x476.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/04-b-2.png`. Personally viewed: grilled elongated kebabs on a foil tray, textured continuous minced meat surfaces, not separate cubes.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-4d9b-7c62-819b-cde780f9088f/exec-fa0ea899-6759-4e3f-a0b8-98a3cc54f011.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-eda748bf03c2.webp`; 81854 байт; SHA-256 `29a7aff820e47a7184393757cdabc335e2e683febb3bd8a2815561b01a4c4179`.
- Визуальная проверка: Two whole elongated ground-meat kebabs on coherent metal skewers, no casing or cube separation, natural browned surface, no bread/sides.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, not a collage. Landscape 3:2. Scene: calm light neutral stone tabletop, simple unbranded off-white ceramic plate or shallow bowl appropriate to the food, soft side window daylight, realistic food textures, moderate natural shadows, restrained highlights. Camera at 35-45 degrees above table unless a slightly higher angle is needed to show structure. The entire portion and entire dish must fit in frame with clear safe margins on all sides; food large and readable at thumbnail size. Subject: two cooked lula kebabs of finely chopped lamb-and-beef with onion, formed as continuous elongated slightly flattened meat cylinders around TWO straight flat metal skewers. Natural coarsely minced meat texture visible on the moderately browned surface, gentle hand-formed uneven ridges, juicy interior suggested by small breaks in the crust. One coherent meat shape on each coherent skewer, not separate chunks. Show handles and pointed ends with plausible alignment. No whole-muscle meat cubes, sausages in casings, bread, rice, salad or dipping sauce. No unmentioned garnishes, sides, sauces or decorations. No people, hands, text, lettering, packaging, logos, watermark, flags, national ornaments, country props, interfaces or frames. No CGI or plastic food, excessive shine, flying ingredients or impossible geometry. Do not copy any reference photograph.
```

### Мясные котлеты с пюре

- Рецептура: Pork-and-chicken ground-meat kotleti, lightly breaded and fried, served with a modest mashed-potato side.
- Проверенный факт: Natasha Kravchuk's family-tested recipe grinds pork/chicken, forms flattened patties, coats in crumbs and pan-fries. The recipe explicitly suggests mashed potatoes for lunch.
- [Авторский источник 1](https://natashaskitchen.com/chicken-and-turkey-katleti-russian-meat-patties/)
- Просмотренное реальное фото 1: [страница](https://natashaskitchen.com/chicken-and-turkey-katleti-russian-meat-patties/), [само фото](https://natashaskitchen.com/wp-content/uploads/2015/05/Chicken-and-Pork-Katleti-3.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/04-c-1.png`. Personally viewed: close-up golden breaded minced patties; garnish excluded.
- Просмотренное реальное фото 2: [страница](https://natashaskitchen.com/chicken-and-turkey-katleti-russian-meat-patties/), [само фото](https://natashaskitchen.com/wp-content/uploads/2015/05/Chicken-and-Pork-Katleti-2.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/04-c-2.png`. Personally viewed: browned cooked patties in a casserole, natural uneven shapes.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-4d9b-7c62-819b-cde780f9088f/exec-f1557fec-2131-43e7-851e-9bd4541e32a7.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-87c930ed6a12.webp`; 78350 байт; SHA-256 `aaa07570b8d17f3adbb5f61b2d0d1a01d913364b328718f7c9130fd7e32aa6ab`.
- Визуальная проверка: Two oval ground-meat patties, one partly cut to show minced texture, modest mash; no steak, gravy or extra garnish.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, not a collage. Landscape 3:2. Scene: calm light neutral stone tabletop, simple unbranded off-white ceramic plate or shallow bowl appropriate to the food, soft side window daylight, realistic food textures, moderate natural shadows, restrained highlights. Camera at 35-45 degrees above table unless a slightly higher angle is needed to show structure. The entire portion and entire dish must fit in frame with clear safe margins on all sides; food large and readable at thumbnail size. Subject: two modest oval cooked meat kotleti made from ground pork and chicken, with a small soft mound of creamy mashed potato beside them on the same plate. The patties have gently irregular oval shapes, a thin golden-brown crumb crust with natural darker fried spots, and subtle coarse minced-meat texture. One patty is intact; the second has a small clean section removed and resting alongside so its tender fully cooked fine-ground meat interior is visible. Only a modest portion of plain mashed potato, not a towering sculpted swirl. No whole steak, chop, large meat fibers, round meatballs, gravy, herbs or other vegetables. No unmentioned garnishes, sides, sauces or decorations. No people, hands, text, lettering, packaging, logos, watermark, flags, national ornaments, country props, interfaces or frames. No CGI or plastic food, excessive shine, flying ingredients or impossible geometry. Do not copy any reference photograph.
```

### Оладьи со сметаной

- Рецептура: Выбран мучной вариант: мука, яйца, сметана, разрыхлитель; не творожный и не картофельный. Густое тесто порционируют ложкой, жарят небольшие пышные лепёшки; сметана допустима для подачи.
- [Авторский источник 1](https://www.gastronom.ru/recipe/54812/pyshnye-oladi-na-smetane)
- Просмотренное реальное фото 1: [страница](https://www.gastronom.ru/recipe/54812/pyshnye-oladi-na-smetane), [само фото](https://images.gastronom.ru/_gTPxCO2yPq2DJO6P-6EU8vEJd4HaxNxgpKWVlbcKFQ/pr:recipe-cover-image/g:ce/rs:auto:0:0:0/L2Ntcy9hbGwtaW1hZ2VzLzc1YTk5YjcxLTdhN2UtNDJiMy04NGNlLWIwZjRhZDk0ZjYyMi5qcGc.webp). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T14-50-18-400Z.png`. Лично просмотрено: небольшие толстые мучные лепёшки, неровный овально-круглый край, светлый пышный бок и пятнистое подрумянивание. Ягоды, сахар и красный соус референса исключены из задания.
- Просмотренное реальное фото 2: [страница](https://www.gastronom.ru/recipe/54812/pyshnye-oladi-na-smetane), [само фото](https://images.gastronom.ru/0vVa5vdaICmnI6y9SJqMga0VArnytfYHh1bHXfa9t7U/pr:recipe-step-image/g:ce/rs:auto:0:0:0/L2Ntcy9hbGwtaW1hZ2VzLzA1YzEzMGM5LWRjOGUtNDNkYS1hMGUyLTU4ODViODcwZjI3ZS5qcGc.webp). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T14-50-19-892Z.png`. Лично просмотрено: оладьи на сковороде небольшие, высокие, с нерегулярной округлой формой и бледным боковым поясом, не тонкий блин.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-bfb5-7b22-a127-ac2acf5e1957/exec-2803ddc3-2bbe-4341-8fcb-4dfa900bb5b1.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-73d09e4f21ba.webp`; 65980 байт; SHA-256 `b1b1113c8f119d206ac8de993ff44c83dde61bbd9610c174b8cfcddc7e99ff27`.
- Визуальная проверка: Небольшие пышные оладьи, нерегулярный округло-овальный край. Сметана отдельно; нет варенья/сиропа/сахарного декора. Без явных творожных зёрен или картофельных волокон. Рецептуру нельзя полностью доказать по фото: подпись «мучные оладьи» обязательна для версии задания.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional natural editorial food photograph for an educational menu card, landscape 3:2. One specific serving on a simple unbranded matte ivory ceramic plate on a light neutral stone table, soft side window daylight, realistic edible textures, moderate soft shadows, calm light background, camera at 40 degrees above table. Food large and readable at card size, the entire food serving and plate visible without cropping, comfortable safe margins on all sides. No people, hands, text, labels, logos, packaging, flags, ornaments, watermark, pseudo-letters, plastic-looking texture, excessive gloss, floating ingredients, impossible geometry, interface, frame, or unrequested garnish, decoration or sauce. Do not copy any source photograph. Subject: small fluffy Russian wheat-flour oladyi with sour cream. A modest serving of four small plump fried flour-batter pancakes, each roughly oval or irregularly round, visibly thick and softly risen, naturally uneven edges and mottled golden browned faces with pale fluffy sides. They are spoon-portioned little oladyi, not a perfectly uniform tall American pancake stack and not thin crepes. Arrange them casually overlapping low on the plate, allowing their thickness to read. A tiny plain ivory bowl on the plate contains a modest spoonful of thick white sour cream. These are flour oladyi, NO cottage cheese grains, NO grated potato strands, not syrniki or potato fritters. No jam, berries, syrup, honey, powdered sugar, butter pat, garnish, extra food or utensils.
```

### Панкейки с сиропом

- Рецептура: Мучное тесто с молоком/яйцом/разрыхлителем жарят на слегка смазанной поверхности. Авторский материал показывает светлый пористый мякиш и подачу с maple syrup; выбран пышный вариант без дополнительных ягод/масла.
- [Авторский источник 1](https://www.kingarthurbaking.com/recipes/simply-perfect-pancakes-recipe)
- [Авторский источник 2](https://www.kingarthurbaking.com/blog/2011/08/13/simply-perfect-pancakes-guaranteed-to-please)
- Просмотренное реальное фото 1: [страница](https://www.kingarthurbaking.com/recipes/simply-perfect-pancakes-recipe), [само фото](https://www.kingarthurbaking.com/sites/default/files/styles/featured_image_sm_2x/public/recipe_legacy/48-3-large.jpg?itok=1utbKpk3). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T14-55-52-776Z.png`. Лично просмотрено: стопка довольно ровных толстых круглых изделий; сбоку виден пористый мякиш. Ягоды и масло референса не переносятся.
- Просмотренное реальное фото 2: [страница](https://www.kingarthurbaking.com/blog/2011/08/13/simply-perfect-pancakes-guaranteed-to-please), [само фото](https://www.kingarthurbaking.com/sites/default/files/blog-images/2011/08/SimplyPerfectPancakes-12.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T14-55-54-370Z.png`. Лично просмотрено: ровная золотистая поверхность и светлая пористая середина панкейка на разломе, существенно толще тонкого блина.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-bfb5-7b22-a127-ac2acf5e1957/exec-e681512a-5cd2-4f30-bbba-a959579a7f91.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-eac915b4d670.webp`; 60272 байт; SHA-256 `3a1d3386aafc29108f8169fa9b076522297ba4b938776c978cdc86d09abb59ce`.
- Визуальная проверка: Ровные круглые пышные изделия небольшой стопкой из трёх. Умеренный сироп, без больших луж/варенья/сметаны. Пористые светлые бока видны, не тонкие складки. Вся тарелка/порция в кадре, без текста/национальных маркеров.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional natural editorial food photograph for an educational menu card, landscape 3:2. One specific serving on a simple unbranded matte ivory ceramic plate on a light neutral stone table, soft side window daylight, realistic edible textures, moderate soft shadows, calm light background, camera at 40 degrees above table. Food large and readable at card size, the entire food serving and plate visible without cropping, comfortable safe margins on all sides. No people, hands, text, labels, logos, packaging, flags, ornaments, watermark, pseudo-letters, plastic-looking texture, excessive gloss, floating ingredients, impossible geometry, interface, frame, or unrequested garnish, decoration or sauce. Do not copy any source photograph. Subject: fluffy American pancakes with a moderate amount of maple syrup. One small low stack of three evenly round medium-sized griddle pancakes with broad smooth golden-brown faces, neatly rounded soft edges and visibly thick pale fluffy sides, natural tiny pores and subtle variation, not perfectly cloned discs. A restrained thin drizzle of translucent amber maple syrup rests mainly on the top pancake and runs a short natural trail down one side, with just a little touching the plate, never a glossy syrup flood. The stack must read as thick American pancakes, not thin folded Russian blini, irregular fried oladyi or waffles. No butter pat, berries, fruit, sour cream, jam, powdered sugar, garnishes, utensils or extra food.
```

### Пельмени отварные с мясом

- Рецептура: Круги пшеничного теста складывают с мясным фаршем; кончики соединяют. Сформованные изделия отваривают, не жарят.
- [Авторский источник 1](https://www.iamcook.ru/showrecipe/660)
- Просмотренное реальное фото 1: [страница](https://www.iamcook.ru/showrecipe/660), [само фото](https://img.iamcook.ru/old/upl/recipes/cat/u1-be607f74c5c1e8344ede2ddfbe8f41bb.JPG). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-01-a-ref-a.png`. Палевые влажные пельмени с сомкнутыми концами, сметана не перенесена.
- Просмотренное реальное фото 2: [страница](https://www.iamcook.ru/showrecipe/660), [само фото](https://img.iamcook.ru/old/upl/recipes/misc/2afafae40d3b6dffe8edfa15b978f4d2.JPG). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-01-a-ref-b.png`. Другой общий ракурс круглых ушек; орнамент тарелки не перенесён.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-d641131f-b4b8-4bc6-9647-527a291eb0d2.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-6746f8e391a2.webp`; 54742 байт; SHA-256 `36dc4047a18366ef0259fd7f57c96885283bd41de283f954c03e54b88483b655`.
- Визуальная проверка: Ушки сомкнуты, начинка мясная видна в разрезе; не хинкали и не жареные.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, landscape 3:2. One specific portion on a simple unbranded matte off-white ceramic plate on a light neutral stone table. Soft side-window daylight, plausible cooked texture, moderate natural shadows, 40-degree camera angle so the structure is clearly visible. Entire food portion and plate visible with safe margins, food fills most of the frame. No people, hands, text, packaging, logos, flags, ornaments, watermark, pseudo-letters, plastic texture, excessive shine, flying ingredients, impossible geometry, interface or frame. No unlisted sides, sauces or decoration. Do not copy source photographs. Subject: a portion of seven small Russian BOILED meat pelmeni. Thin soft pale ivory cooked wheat dough, natural slight moisture, compact rounded dumplings made by folding a filled circle into a half-moon and joining the two ends into a rounded ear shape, closed pinched seams, NOT tall gathered pouches. Six whole dumplings and one cut cleanly into two pieces, both pieces on the plate with a cross-section facing the camera, revealing compact cooked minced beef-and-pork filling surrounded by thin dough. Natural handmade variation. Absolutely no fried or browned surfaces, no khinkali tops, no pleated upright soup dumplings, no potato filling, no sour cream, no broth, no garnish or utensils.
```

### Печенье с шоколадной крошкой

- Рецептура: Выбран хрустящий, не chewy вариант тестовой кухни: пшеничная мука, масло, сахар, яйцо, разрыхление, semisweet chips. Небольшие порции ложкой пекут до равномерного золотистого цвета и отсутствия мягкого центра; остужают. Сохраняются chips и рассыпчатая структура, без крема/жидкого центра/орехов.
- [Авторский источник 1](https://www.kingarthurbaking.com/recipes/crunchy-whole-grain-chocolate-chip-cookies-recipe)
- Просмотренное реальное фото 1: [страница](https://www.kingarthurbaking.com/recipes/crunchy-whole-grain-chocolate-chip-cookies-recipe), [само фото](https://www.kingarthurbaking.com/sites/default/files/styles/featured_image_sm_2x/public/2021-11/crunchy-whole-grain-chocolate-chip-cookies_1021.jpg?itok=TBXso5tl). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T15-22-26-668Z.png`. Лично просмотрено: небольшие слегка нерегулярные золотистые cookies с видимыми chips, суховатой мелкопористой поверхностью и трещинками; не шоколадные квадратные brownies.
- Просмотренное реальное фото 2: [страница](https://www.kingarthurbaking.com/recipes/crunchy-whole-grain-chocolate-chip-cookies-recipe), [само фото](https://www.kingarthurbaking.com/sites/default/files/styles/featured_image_sm_2x/public/2021-11/crunchy-whole-grain-chocolate-chip-cookies-2_1021.jpg?itok=CabAMuZ3). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T15-22-28-260Z.png`. Лично просмотрено: верхний ракурс той же хрустящей тестовой версии; один разломанный cookie на противне показывает рассыпчатый приготовленный край без жидкого шоколадного центра. Молоко/противень/бумага не переносятся.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-bfb5-7b22-a127-ac2acf5e1957/exec-ce3bbfd9-f0b4-458f-8ad1-244d832da805.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-dae64b038175.webp`; 68468 байт; SHA-256 `ff99e6c31d12b6ef1f813a999cf04e41e970291a662660ff8db4a2403478f1db`.
- Визуальная проверка: Небольшие три cookies, одно разломлено на неравные части. Виден светло-золотистый рассыпчатый срез с тёмными chips, не brownie/пряник/жидкий центр. Вся порция и тарелка в кадре, естественные крошки, нет декора/текста.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional natural editorial food photograph for an educational menu card, landscape 3:2. One specific serving on a simple unbranded matte ivory ceramic plate on a light neutral stone table, soft side window daylight, realistic edible textures, moderate soft shadows, calm light background, camera at 40 degrees above table. Food large and readable at card size, the entire food serving and plate visible without cropping, comfortable safe margins on all sides. No people, hands, text, labels, logos, packaging, flags, ornaments, watermark, pseudo-letters, plastic-looking texture, excessive gloss, floating ingredients, impossible geometry, interface, frame, or unrequested garnish, decoration or sauce. Do not copy any source photograph. Subject: crisp chocolate-chip cookies. One modest serving of three small golden-brown round cookies made with wheat flour, slightly irregular hand-portioned edges, naturally cracked matte baked surfaces and scattered embedded dark semisweet chocolate chips. Two cookies remain whole; the third is naturally broken into two unequal pieces placed near the front, exposing a fully cooked fine crumbly light golden porous interior with a few embedded chocolate chips and two or three tiny natural cookie crumbs immediately nearby. Low casually overlapping arrangement, not a tall perfect stack. The broken cookie must look crisp and crumbly, not dense fudgy, wet, soft brownie, gingerbread, sponge cake or chocolate lava filling. No chocolate sauce, molten chocolate pool, frosting, icing, cream, nuts, berries, fruit, sugar dust, garnish, extra foods or utensils.
```

### Початок кукурузы с сырной посыпкой

- Рецептура: Isabel Orozco-Moore: кукуруза на початке, тонкая майонезная основа, Cotija, чили. Вариант гриль разрешён рецептом; кинзу можно исключить.
- [Авторский источник 1](https://www.isabeleats.com/authentic-mexican-street-corn/)
- Просмотренное реальное фото 1: [страница](https://www.isabeleats.com/authentic-mexican-street-corn/), [само фото](https://www.isabeleats.com/wp-content/uploads/2025/06/elote-recipe-small-5.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-02-b-ref-a.png`. Початки с белым рассыпчатым сыром и чили; зёрна/оболочка читаются.
- Просмотренное реальное фото 2: [страница](https://www.isabeleats.com/authentic-mexican-street-corn/), [само фото](https://www.isabeleats.com/wp-content/uploads/2025/06/elote-recipe-small-6.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-02-b-ref-b.png`. Другой отдельный ракурс початков с сыром; палочки, лайм, зелень не перенесены.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-69786020-9797-44ff-92d1-548d3e0b7130.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-729e840af16b.webp`; 79464 байт; SHA-256 `26d71c38b634c2b52eb5618246699e11e94d97c017ccd5c447c5ab1b5d221642`.
- Визуальная проверка: Целый жёлтый початок, умеренная Cotija, зёрна хорошо видны, без тортильи/зелени/дополнений.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, landscape 3:2. One specific portion on a simple unbranded matte off-white ceramic plate on a light neutral stone table. Soft side-window daylight, plausible cooked texture, moderate natural shadows, 40-degree camera angle so the structure is clearly visible. Entire food portion and plate visible with safe margins, food fills most of the frame. No people, hands, text, packaging, logos, flags, ornaments, watermark, pseudo-letters, plastic texture, excessive shine, flying ingredients, impossible geometry, interface or frame. No unlisted sides, sauces or decoration. Do not copy source photographs. Subject: one whole cooked ear of corn on the cob, lying naturally diagonally on the plate, bright warm yellow plump kernels individually visible, a few subtle browned grilled spots. A thin creamy mayonnaise coating and a moderate dusting of fine crumbled white Cotija cheese with just a very light pinch of red chile powder, leaving most kernel rows clearly readable. No cilantro or other herbs, no lime wedges, no extra sauce bowls, no wooden sticks, no husks or leaves, no tortillas, no other foods. This is prepared Mexican-style corn on the cob, not cut corn in a cup, not corn bread and not a cheese-covered sausage.
```

### Равиоли с рикоттой и шпинатом

- Рецептура: Boiled square fresh egg-pasta ravioli with white ricotta and chopped spinach filling. No meat, sauce garnish or hard yellow cheese pieces.
- Проверенный факт: GialloZafferano documents thin fresh egg-pasta sheets sealed around ricotta-and-spinach filling and cut into small squares.
- Проверенный факт: The related serving recipe explicitly boils ravioli in salted water; its butter/sage garnish is intentionally omitted for the specified plain educational version.
- Проверенный факт: The source identifies the filled-pasta serving as a classic Italian Sunday-lunch dish; this supports Italian culinary context, not exclusive national ownership.
- [Авторский источник 1](https://www.giallozafferano.com/recipes/Ricotta-and-spinach-ravioli.html)
- [Авторский источник 2](https://www.giallozafferano.com/recipes/Ricotta-and-spinach-ravioli-with-butter-and-sage.html)
- Просмотренное реальное фото 1: [страница](https://www.giallozafferano.com/recipes/Ricotta-and-spinach-ravioli.html), [само фото](https://ptps.stbm.it/t/mj75op_large.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/06-a-1.png`. Personally viewed actual photograph of raw square fresh ravioli, thin dough with crimped edges and one opening exposing green-white filling. Raw flour intentionally not retained in final cooked version.
- Просмотренное реальное фото 2: [страница](https://www.giallozafferano.com/recipes/Ricotta-and-spinach-ravioli-with-butter-and-sage.html), [само фото](https://ptps.stbm.it/t/m72ygh_large.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/06-a-2.png`. Personally viewed separate cooked serving photograph: soft moist pale-golden squares, slightly irregular sealed edges and domed spinach centers. Sage and butter puddle not reproduced.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-4d9b-7c62-819b-cde780f9088f/exec-932242b9-2945-4f2a-8964-96f63eb5b3f7.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-51e097c6fa28.webp`; 57936 байт; SHA-256 `90663a00decd2606225b860eb2915937507a7674f0b0a0add6224da1568b7d91`.
- Визуальная проверка: Entire plate visible; naturally moist boiled square pasta, sealed edges and thin dough; cut halves clearly show white ricotta and green spinach, no excluded additions.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, not a collage. Landscape 3:2. Scene: calm light neutral stone tabletop, simple unbranded off-white ceramic plate or shallow bowl appropriate to the food, soft side window daylight, realistic food textures, moderate natural shadows, restrained highlights. Camera at 35-45 degrees above table unless a slightly higher angle is needed to show structure. The entire portion and entire dish must fit in frame with clear safe margins on all sides; food large and readable at thumbnail size. Subject: one appetizing portion of eight small boiled square ricotta-and-spinach ravioli, made from thin fresh golden egg pasta with neatly sealed slightly irregular crimped edges and softly domed centers. Naturally moist cooked pasta, not fried and not floured raw pasta. One raviolo is cut cleanly in half and its two halves face the camera so the delicate white ricotta mixed with chopped dark green spinach is unmistakably visible inside the thin pasta shell. Arrange the ravioli loosely on a simple off-white ceramic plate, only very light natural moisture, no puddle of sauce. No meat, fish, meat sauce, tomato sauce, browned crust, visible chunks of hard yellow cheese, sage leaves or additional garnish. No unmentioned garnishes, sides, sauces or decorations. No people, hands, text, lettering, packaging, logos, watermark, flags, national ornaments, country props, interfaces or frames. No CGI or plastic food, excessive shine, flying ingredients or impossible geometry. Do not copy any reference photograph.
```

### Ризотто с грибами

- Рецептура: Creamy arborio risotto with sautéed ordinary cremini mushrooms; grain structure remains visible, without parsley/cheese garnish.
- Проверенный факт: Author Nagi Maehashi specifies arborio rice and white or Swiss-brown/cremini mushrooms; starch gives the rice its creamy coherence.
- Проверенный факт: The recipe cooks rice with stock and stirring, then mixes in sautéed mushrooms.
- Проверенный факт: Finished texture is loose and creamy rather than dry separate rice or a firm molded mound; garnish is excluded from the requested image.
- [Авторский источник 1](https://www.recipetineats.com/mushroom-risotto/)
- Просмотренное реальное фото 1: [страница](https://www.recipetineats.com/mushroom-risotto/), [само фото](https://www.recipetineats.com/tachyon/2019/10/Mushroom-Risotto_7.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/06-c-1.png`. Personally viewed real bowl photograph: creamy coherent rice with readable grains, browned mushroom slices/quarters; spoon and parsley omitted.
- Просмотренное реальное фото 2: [страница](https://www.recipetineats.com/mushroom-risotto/), [само фото](https://www.recipetineats.com/tachyon/2019/10/Mushroom-Risotto_6.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/06-c-2.png`. Personally viewed separate finished risotto photograph in a cooking pot: loose starch-rich consistency surrounding distinct rice, real irregular mushroom shapes. No pan/utensil/garnish copied.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-4d9b-7c62-819b-cde780f9088f/exec-e3efd001-683e-4d46-ba62-20e92f12e0eb.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-638c0a7eb419.webp`; 77204 байт; SHA-256 `e1422de0f900e4cf647b4bbbea55bb6f3508322021b3b258e5ba8e4abcee9cdc`.
- Визуальная проверка: Entire bowl visible; creamy loose mushroom risotto, plump individual rice grains visible and natural sliced mushroom gills/caps. No pilaf/paella colors or extras.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, not a collage. Landscape 3:2. Scene: calm light neutral stone tabletop, simple unbranded off-white ceramic plate or shallow bowl appropriate to the food, soft side window daylight, realistic food textures, moderate natural shadows, restrained highlights. Camera at 35-45 degrees above table unless a slightly higher angle is needed to show structure. The entire portion and entire dish must fit in frame with clear safe margins on all sides; food large and readable at thumbnail size. Subject: one appetizing serving of mushroom risotto in a shallow off-white ceramic bowl. Short plump arborio rice grains are individually readable while held together by a naturally creamy, gently flowing beige starch-rich sauce; loose coherent risotto that settles in the bowl, not dry separate pilaf, not rice porridge and not a molded mound. Naturally sautéed sliced cremini mushrooms with visible curved caps and darker gills are mixed through the rice and a few lie on its surface. Moderate natural variation in rice grains and mushroom slices, realistic restrained buttery moisture, no glossy plastic. No saffron yellow rice, paella, peas, carrot cubes, meat, shrimp, fresh herb garnish, cheese shavings, bread or side dishes. No unmentioned garnishes, sides, sauces or decorations. No people, hands, text, lettering, packaging, logos, watermark, flags, national ornaments, country props, interfaces or frames. No CGI or plastic food, excessive shine, flying ingredients or impossible geometry. Do not copy any reference photograph.
```

### Спагетти болоньезе

- Рецептура: International everyday spaghetti serving with simmered beef-mince tomato sauce, not presented as the definitive traditional Bologna ragù recipe.
- Проверенный факт: Author Nagi Maehashi explicitly uses ground beef, crushed tomato, tomato paste and spaghetti.
- Проверенный факт: The meat is browned while broken into small pieces and simmered in tomato sauce, which clings to the cooked strands.
- Проверенный факт: Parmesan and parsley are optional serving additions and intentionally omitted. This authored everyday version is not an exclusive national-origin claim.
- [Авторский источник 1](https://www.recipetineats.com/spaghetti-bolognese/)
- Просмотренное реальное фото 1: [страница](https://www.recipetineats.com/spaghetti-bolognese/), [само фото](https://www.recipetineats.com/tachyon/2018/07/Spaghetti-Bolognese.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/06-b-1.png`. Personally viewed finished dish: thin round strands below red-brown sauce with irregular small beef particles; optional parmesan, herb garnish and utensil omitted.
- Просмотренное реальное фото 2: [страница](https://www.recipetineats.com/spaghetti-bolognese/), [само фото](https://www.recipetineats.com/tachyon/2018/07/Spaghetti-Bolognese_4.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/06-b-2.png`. Personally viewed separate real close-up in a dark bowl: moist thick tomato sauce, distinct browned mince and tangled spaghetti; not carbonara or layered pasta.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-4d9b-7c62-819b-cde780f9088f/exec-5dfad676-1093-4ec2-978b-c5079762b86b.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-b076d4a3e1c9.webp`; 94450 байт; SHA-256 `dee351f32c8c931c07faadf0bac1f7ae08a0c3e44dbb96d0c5d555d89da5e15b`.
- Визуальная проверка: Entire bowl visible, natural round spaghetti strands and clear irregular minced beef throughout tomato sauce; no cheese/herb toppings or excluded alternative dishes.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, not a collage. Landscape 3:2. Scene: calm light neutral stone tabletop, simple unbranded off-white ceramic plate or shallow bowl appropriate to the food, soft side window daylight, realistic food textures, moderate natural shadows, restrained highlights. Camera at 35-45 degrees above table unless a slightly higher angle is needed to show structure. The entire portion and entire dish must fit in frame with clear safe margins on all sides; food large and readable at thumbnail size. Subject: one appetizing normal serving of spaghetti Bolognese in a shallow off-white ceramic pasta bowl. Clearly long round spaghetti strands, naturally tangled and coated in a rich muted red-brown tomato-based sauce with many small irregular browned beef-mince particles unmistakably visible throughout the sauce. A generous central spoonful of the same meat sauce rests on the spaghetti, with some strands visible around it; cooked tomato and softened onion blend into the sauce. The texture is moist and thick enough to cling, not watery soup and not oversized meatballs. No cream, egg sauce, bacon strips, layered pasta, ravioli, lasagne, cheese topping, fresh herb garnish, extra food or side dishes. No unmentioned garnishes, sides, sauces or decorations. No people, hands, text, lettering, packaging, logos, watermark, flags, national ornaments, country props, interfaces or frames. No CGI or plastic food, excessive shine, flying ingredients or impossible geometry. Do not copy any reference photograph.
```

### Сырные палочки в панировке

- Рецептура: Автор Sharlis: плавящийся сыр (моцарелла допустима), бруски, яйцо/мука/сухари. Панируют и жарят в масле до золотистости; соус подачи исключён.
- [Авторский источник 1](https://www.iamcook.ru/showrecipe/23359)
- Просмотренное реальное фото 1: [страница](https://www.iamcook.ru/showrecipe/23359), [само фото](https://img.iamcook.ru/2020/upl/recipes/cat/u-b672e2cbe5ca0cc1443a4e21b2525e73.JPG). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-02-c-ref-a.png`. Палочки золотистой сухарной панировки, одна надломлена с сырной серединой.
- Просмотренное реальное фото 2: [страница](https://www.iamcook.ru/showrecipe/23359), [само фото](https://img.iamcook.ru/2020/upl/recipes/byusers/misc/56313/9515f3159f7b182cf12c032155dbbda6-2020.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-02-c-ref-b.png`. Отдельный близкий общий кадр палочек, надлом на фоновой ложке; соус/watermark/ложку не копируем.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-34a63ad0-a2dd-4d9f-bdfa-bed39a73e8ac.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-ac908e2d5b41.webp`; 78154 байт; SHA-256 `7ec049f4c1fc7a262cc72aa1bce6590e7722d1fc806fff384a80d769d34f665e`.
- Визуальная проверка: Продолговатые палочки с сухарной корочкой, разлом с короткой сырной тягой; никаких сосисок/мяса.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, landscape 3:2. One specific portion on a simple unbranded matte off-white ceramic plate on a light neutral stone table. Soft side-window daylight, plausible cooked texture, moderate natural shadows, 40-degree camera angle so the structure is clearly visible. Entire food portion and plate visible with safe margins, food fills most of the frame. No people, hands, text, packaging, logos, flags, ornaments, watermark, pseudo-letters, plastic texture, excessive shine, flying ingredients, impossible geometry, interface or frame. No unlisted sides, sauces or decoration. Do not copy source photographs. Subject: a modest portion of five whole fried mozzarella cheese sticks plus one cheese stick broken into two halves, all resting naturally on the same plate. Straight slightly uneven short rectangular sticks encased in a thin golden-brown crisp breadcrumb crust, clearly visible individual fine crumbs and a few darker fried flecks. The broken front stick reveals a soft pale melted cheese center with a short natural stretchy connection between its two nearby halves, no hands or suspended food. The cheese occupies nearly the full cross-section, not hollow bread and not meat. No sausages, chicken, tomato sauce, dipping bowls, herb garnish, potatoes, additional foods or decoration.
```

### Тонкие блины с вареньем

- Рецептура: Выбраны тонкие мягкие мучные блины, не миниатюрные толстые blini. Жидкое тесто распределяют тонким слоем, после приготовления блины складывают; ягодное варенье допустимо.
- [Авторский источник 1](https://www.allrecipes.com/recipe/215962/blini-russian-pancakes/)
- Просмотренное реальное фото 1: [страница](https://www.allrecipes.com/recipe/215962/blini-russian-pancakes/), [само фото](https://www.allrecipes.com/thmb/NN0mL6n76YazDwnOoLbSePN9fv4=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/AR-215962-blini-russian-pancakes-ddmfs-step7-3x4-f630160e5a61400cbe914e29d018cc02.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T14-45-32-082Z.png`. Лично просмотрено: поднятая мягкая кромка крайне тонкого блина легко изгибается; поверхность пятнисто-румяная, не сплошная корочка панкейка.
- Просмотренное реальное фото 2: [страница](https://www.allrecipes.com/recipe/215962/blini-russian-pancakes/), [само фото](https://www.allrecipes.com/thmb/GlcXkwv9HKUIfjEufWxfvOO-1ME=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/AR-215962-blini-russian-pancakes-ddmfs-step12-2-3x4-e03a733c833643f6b94ee5d35c02b5a9.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T14-45-34-663Z.png`. Лично просмотрено: тонкие мягкие складки блина, рядом густое тёмное ягодное варенье; это не прозрачный сироп. Орнаменты/руки/приборы референса в генерацию не переносятся.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-bfb5-7b22-a127-ac2acf5e1957/exec-69d61b33-d271-4fb6-b34e-e16f80521e3c.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-a10f479e6bc2.webp`; 80602 байт; SHA-256 `d0717138f69e27e895888957f555af234fe65c42cc9f23f8d0a6e2c22bc0625d`.
- Визуальная проверка: Тонкие гибкие края и мягкие складки читаются. Отдельное густое ягодное варенье, без прозрачного сиропа. Вся тарелка/порция в безопасных полях; без сахара/ягод/несладкой начинки/текста.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional natural editorial food photograph for an educational menu card, landscape 3:2. One specific serving on a simple unbranded matte ivory ceramic plate on a light neutral stone table, soft side window daylight, realistic edible textures, moderate soft shadows, calm light background, camera at 40 degrees above table. Food large and readable at card size, the entire food serving and plate visible without cropping, comfortable safe margins on all sides. No people, hands, text, labels, logos, packaging, flags, ornaments, watermark, pseudo-letters, plastic-looking texture, excessive gloss, floating ingredients, impossible geometry, interface, frame, or unrequested garnish, decoration or sauce. Do not copy any source photograph. Subject: thin flexible Russian blini with berry jam. A modest serving of three very thin round wheat-flour blini, lightly mottled golden brown on pale golden surfaces; two loosely folded in quarters and one softly rolled, with clearly visible paper-thin flexible edges and overlapping thin layers, naturally imperfect delicate shape. They are soft and bendable, not thick leavened pancakes and not brittle wafers. A single tiny plain ivory dish beside them on the plate contains a modest spoonful of dark red berry jam with recognizable softened berry pieces and seeds, a gentle natural cooked-jam sheen, not a smooth clear syrup. No whole fresh berries, powdered sugar, cream, butter pat, meat, cheese, thick pancake stack, waffles, extra foods or utensils.
```

### Хлебный панини с томатами и моцареллой

- Рецептура: Bread Dad: две хлебные половины, свежая моцарелла, томаты, прижимной гриль. Ciabatta допустима; в нашей минимальной версии нет базилика и необязательной бальзамической глазури.
- [Авторский источник 1](https://breaddad.com/caprese-panini-recipe/)
- Просмотренное реальное фото 1: [страница](https://breaddad.com/caprese-panini-recipe/), [само фото](https://breaddad.com/wp-content/uploads/2024/03/caprese-panini-6.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-02-d-ref-a.png`. Реальная сборка хлебного панини: пористый хлеб, моцарелла/томаты, базилик/глазурь не переносим.
- Просмотренное реальное фото 2: [страница](https://breaddad.com/caprese-panini-recipe/), [само фото](https://breaddad.com/wp-content/uploads/2024/03/caprese-panini-4.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-02-d-ref-b.png`. Отдельная фотография готовых прижатых ciabatta на гриле с параллельными следами и мягким сыром.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-ecd6589d-219f-434b-a2b8-f648c33e8706.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-e491ab807d36.webp`; 79020 байт; SHA-256 `1d28dd679520b68bff0eacec51a2f3ff73179f2e1f8fd28929c5cd0713b7a148`.
- Визуальная проверка: Пористый хлеб, томаты и моцарелла видны в разрезе; не тортилья/бургер.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, landscape 3:2. One specific portion on a simple unbranded matte off-white ceramic plate on a light neutral stone table. Soft side-window daylight, plausible cooked texture, moderate natural shadows, 40-degree camera angle so the structure is clearly visible. Entire food portion and plate visible with safe margins, food fills most of the frame. No people, hands, text, packaging, logos, flags, ornaments, watermark, pseudo-letters, plastic texture, excessive shine, flying ingredients, impossible geometry, interface or frame. No unlisted sides, sauces or decoration. Do not copy source photographs. Subject: one hot pressed bread panini filled only with tomato slices and melted fresh mozzarella cheese. Use a small crusty ciabatta-style wheat bread roll sliced horizontally, toasted in a panini press, showing restrained parallel golden-brown grill marks on the bread crust. Cut the sandwich cleanly into two substantial halves, both halves resting on the plate with one cross-section toward camera so the airy bread crumb, red tomato slices and soft pale mozzarella filling are unmistakable. Bread has real irregular air holes and lightly compressed crumb, not thin tortilla layers. No meat, lettuce, basil or other herbs, pesto, balsamic drizzle, sauce, side dishes or decoration. Not a burger, tortilla wrap, pizza or quesadilla.
```

### Чебурек жареный

- Рецептура: Автор Нина Минина-Р: тонкое бездрожжевое тесто, мясной фарш с луком. Тесто складывают полумесяцем и жарят в масле.
- [Авторский источник 1](https://www.iamcook.ru/showrecipe/3241)
- Просмотренное реальное фото 1: [страница](https://www.iamcook.ru/showrecipe/3241), [само фото](https://img.iamcook.ru/old/upl/recipes/cat/u-d0dd482f571b29ceb3a231a93741dabe.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-01-c-ref-a.png`. Готовые плоские пузырчатые полумесяцы, прочая сервировка исключена.
- Просмотренное реальное фото 2: [страница](https://www.iamcook.ru/showrecipe/3241), [само фото](https://img.iamcook.ru/old/upl/recipes/misc/7d16f823f3b4edad3f75671a97c08ab3.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/t4-01-c-ref-b.png`. Другая фотография: два плоских чебурека жарятся в масле, пузырчатый верх.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-9545a9b5-d725-4bf3-abda-9c0e0ec821c5.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-58bb072d4ce9.webp`; 77080 байт; SHA-256 `4f1baf678395ac314ce2ed977a35e20ea8306e3613b5ec1505673814276483f1`.
- Визуальная проверка: Почти целый плоский полумесяц, небольшой отрезанный угол; разная пузырчатость оболочки, тонкое тесто, рыхлый сочный мясной фарш. Полная тарелка с полями. Форма и начинка заметно натуральнее первой попытки; окончательную эстетическую оценку делает пользователь.
- Попыток: 2.

Точный исходный промпт:

```text
Use case: precise-object-edit. Input image 1 is the edit target, the previously generated cheburek food photograph. Preserve the neutral pale stone tabletop, simple unbranded matte ivory plate, soft side-window daylight, photorealistic-natural editorial food style and landscape 3:2 composition. Correct ONLY the cheburek presentation and cooked-food realism: replace the two large rigid evenly sliced halves with ONE large thin flat nearly whole fried half-moon cheburek. Its silhouette must read as a genuine semicircular folded thin dough pastry, not a puffed bread pie. The naturally uneven golden crust has a convincing varied distribution of small and larger airy fried blisters, a few darker toasted spots, slight delicate wrinkles, a thin irregular hand-sealed edge with no identical repeated machine-like scallops. Remove only a SMALL triangular end corner, no more than one tenth of the pastry, and rest that small piece beside the main cheburek. The small cut opening and loose cut piece show a thin layer of juicy loosely crumbly cooked minced meat and softened onion inside very thin tender dough. The meat is irregular crumbles with moist natural gaps, NOT a dense smooth uniform sausage strip, NOT a thick geometrically perfect slab. No thick bread crumb, no stacked pastry, no second full cheburek, no raw meat. Leave all food on the same plate. The ENTIRE plate and portion must fit in frame with clear safe margins on every side. No people, hands, text, utensils, sauces, herbs, garnish, vegetables, logos, watermark, flags, extra foods, framing or UI. No excessive shine or artificial plastic texture. Do not copy source photographs.
```

Повторная обработка: User feedback: improve realistic nearly whole cheburek; small removed corner; thin blistered crust and loose juicy mince.

Сохранённый отклонённый оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-f46ddcb3-96f6-4c35-89df-d4e2032cb09d.png`.
Новый выбранный оригинал: `C:/Users/АМ/.codex/generated_images/01a0df77-3025-78e3-b338-bfdb0417c2c4/exec-9545a9b5-d725-4bf3-abda-9c0e0ec821c5.png`.

Точный промпт изменения:

```text
Use case: precise-object-edit. Input image 1 is the edit target, the previously generated cheburek food photograph. Preserve the neutral pale stone tabletop, simple unbranded matte ivory plate, soft side-window daylight, photorealistic-natural editorial food style and landscape 3:2 composition. Correct ONLY the cheburek presentation and cooked-food realism: replace the two large rigid evenly sliced halves with ONE large thin flat nearly whole fried half-moon cheburek. Its silhouette must read as a genuine semicircular folded thin dough pastry, not a puffed bread pie. The naturally uneven golden crust has a convincing varied distribution of small and larger airy fried blisters, a few darker toasted spots, slight delicate wrinkles, a thin irregular hand-sealed edge with no identical repeated machine-like scallops. Remove only a SMALL triangular end corner, no more than one tenth of the pastry, and rest that small piece beside the main cheburek. The small cut opening and loose cut piece show a thin layer of juicy loosely crumbly cooked minced meat and softened onion inside very thin tender dough. The meat is irregular crumbles with moist natural gaps, NOT a dense smooth uniform sausage strip, NOT a thick geometrically perfect slab. No thick bread crumb, no stacked pastry, no second full cheburek, no raw meat. Leave all food on the same plate. The ENTIRE plate and portion must fit in frame with clear safe margins on every side. No people, hands, text, utensils, sauces, herbs, garnish, vegetables, logos, watermark, flags, extra foods, framing or UI. No excessive shine or artificial plastic texture. Do not copy source photographs.
```

### Шашлык из свинины

- Рецептура: Cooked whole-muscle pork pieces on flat metal skewers; plain service without unmentioned garnishes.
- Проверенный факт: Georgia Travel describes medium pork pieces threaded and grilled; pork is a popular Georgian variant of a broader Caucasian/Asian skewer tradition, not an exclusively owned dish.
- Проверенный факт: Natasha Kravchuk's tested recipe cuts pork into pieces, threads and grills it; her reply explicitly permits metal skewers.
- [Авторский источник 1](https://georgia.travel/mtsvadi)
- [Авторский источник 2](https://natashaskitchen.com/pork-skewers-shashlik/)
- Просмотренное реальное фото 1: [страница](https://georgia.travel/mtsvadi), [само фото](https://storage.georgia.travel/images/shutterstock-1902463720-1.webp). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/04-a-georgia.png`. Personally opened screenshot: irregular whole pork pieces on flat metal skewers over charcoal; browned rather than evenly blackened.
- Просмотренное реальное фото 2: [страница](https://natashaskitchen.com/pork-skewers-shashlik/), [само фото](https://natashaskitchen.com/wp-content/uploads/2013/06/pork-skewers-1-4.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/04-a-natasha.png`. Personally opened screenshot: cooked pork chunks on skewers; natural fibrous meat, brown spots and irregular sizes. Onion/bread/sides not adopted.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-4d9b-7c62-819b-cde780f9088f/exec-68b9ce85-5969-4fdb-b6f9-a7cf53f75000.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-481e9c27db06.webp`; 86942 байт; SHA-256 `c4e3a4e94ccb00f5dc93765fe8d21225a8281dd8d674ad10a6b58830a80bc9d7`.
- Визуальная проверка: Two geometrically coherent metal skewers and six whole-muscle cooked pork chunks, natural browning, no sides. Entire plate and tips/handles visible.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, not a collage. Landscape 3:2. Scene: calm light neutral stone tabletop, simple unbranded off-white ceramic plate or shallow bowl appropriate to the food, soft side window daylight, realistic food textures, moderate natural shadows, restrained highlights. Camera at 35-45 degrees above table unless a slightly higher angle is needed to show structure. The entire portion and entire dish must fit in frame with clear safe margins on all sides; food large and readable at thumbnail size. Subject: pork shashlik, six naturally irregular cooked whole-muscle pork chunks threaded on TWO parallel straight flat metal skewers, three chunks on each. Medium substantial pieces of real pork with a browned outside, a little rendered fat and only sparse darker grilled spots, juicy not burnt. Each skewer is one continuous geometrically coherent metal strip entering and leaving the aligned meat; handle and pointed tip visible. No ground meat, cylindrical kebab, minced patty, perfectly identical cubes, blackened crust, vegetables, onion rings, bread or dipping sauce. No unmentioned garnishes, sides, sauces or decorations. No people, hands, text, lettering, packaging, logos, watermark, flags, national ornaments, country props, interfaces or frames. No CGI or plastic food, excessive shine, flying ingredients or impossible geometry. Do not copy any reference photograph.
```

### Шоколадный маффин

- Рецептура: Тестовая кухня PJ Hamel: мука, какао, молоко, яйца, разрыхлитель и сода, масло, chocolate chips. Бумажные формы, высокая поднявшаяся верхушка; выпечка до чистого тестера. Выбран простой маффин без необязательных крупного сахара, крема, джема; пористый приготовленный мякиш, не жидкий центр.
- [Авторский источник 1](https://www.kingarthurbaking.com/recipes/chocolate-breakfast-muffins-recipe)
- Просмотренное реальное фото 1: [страница](https://www.kingarthurbaking.com/recipes/chocolate-breakfast-muffins-recipe), [само фото](https://www.kingarthurbaking.com/sites/default/files/styles/featured_image_sm_2x/public/2025-08/Chocolate-Breakfast-Muffins-4.jpg?itok=80eaMBpv). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T15-15-38-498Z.png`. Лично просмотрено: шоколадный маффин раскрыт на бумажной формочке, приготовленный пористый мякиш и небольшие шоколадные включения; нет жидкого центра. Сахарная посыпка/кофе/другие порции исключены.
- Просмотренное реальное фото 2: [страница](https://www.kingarthurbaking.com/recipes/chocolate-breakfast-muffins-recipe), [само фото](https://www.kingarthurbaking.com/sites/default/files/styles/featured_image_sm_2x/public/2025-08/Chocolate-Breakfast-Muffins-1.jpg?itok=qchGUc4S). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T15-15-39-968Z.png`. Лично просмотрено: высоко поднявшийся купол шоколадного маффина с естественными трещинками; видны бумажные формочки соседних изделий. Крупный сахар сверху и контекстные предметы не переносятся.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-bfb5-7b22-a127-ac2acf5e1957/exec-6dbfa76c-12be-4117-a948-45afb1e01f66.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-4f190c63de8a.webp`; 70018 байт; SHA-256 `50f5f3c1d9a00bc5ebfc18783b19fead1e3bf73170ebd7a28415a629d679a1b7`.
- Визуальная проверка: Один маффин в бумажной формочке, часть открыта и лежит рядом. Виден пористый аэрированный срез, не fudgy брауни/жидкий фондан. Нет кремовой шапки/жидкой начинки/пудры/ягод, порция и тарелка целиком.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional natural editorial food photograph for an educational menu card, landscape 3:2. One specific serving on a simple unbranded matte ivory ceramic plate on a light neutral stone table, soft side window daylight, realistic edible textures, moderate soft shadows, calm light background, camera at 40 degrees above table. Food large and readable at card size, the entire food serving and plate visible without cropping, comfortable safe margins on all sides. No people, hands, text, labels, logos, packaging, flags, ornaments, watermark, pseudo-letters, plastic-looking texture, excessive gloss, floating ingredients, impossible geometry, interface, frame, or unrequested garnish, decoration or sauce. Do not copy any source photograph. Subject: one chocolate muffin with its airy porous cooked crumb visible. One modest individual tall chocolate muffin baked in an unprinted plain tan pleated paper muffin liner. A small neat wedge has been cut out from the front and rests directly beside the remaining muffin on the same plate; the liner is peeled down only at that opening so the cut side is readable. The muffin has a gently domed risen top with naturally uneven fine cracks, soft fully cooked dark cocoa-brown crumb with distinct small irregular air pores, noticeably aerated and lighter in structure than dense fudgy brownie. A few small embedded baked chocolate chips are permitted, never a liquid filling or molten pool. Remaining muffin and paper liner clearly retain the familiar muffin shape. No frosting, icing, whipped cream, liquid center, chocolate sauce, nuts, fruit, berries, coarse sugar topping, powdered sugar, decoration, scattered chocolate chips, extra foods or utensils.
```

### Шоколадный фондан

- Рецептура: Авторская шоколадная версия Sally: шоколад, масло, небольшое количество муки, сахар, яйца и желтки; порционные формы. Оболочка затвердевает при короткой выпечке, центр остаётся текучим; изделие переворачивают на тарелку и подают тёплым. Добавочные мороженое/ягоды/сиропы необязательны и в выбранном изображении отсутствуют.
- [Авторский источник 1](https://sallysbakingaddiction.com/chocolate-lava-cakes/)
- [Авторский источник 2](https://www.bbcgoodfood.com/recipes/chocolate-fondant/)
- Просмотренное реальное фото 1: [страница](https://sallysbakingaddiction.com/chocolate-lava-cakes/), [само фото](https://sallysbakingaddiction.com/wp-content/uploads/2017/02/lava-cake-1024x1536.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T15-13-31-654Z.png`. Лично просмотрено: крупный план порционного цилиндрического шоколадного cake, аккуратно открытая передняя часть и густой естественный текучий шоколадный центр. Мороженое/малина/мята/соус сверху не переносятся.
- Просмотренное реальное фото 2: [страница](https://sallysbakingaddiction.com/chocolate-lava-cakes/), [само фото](https://sallysbakingaddiction.com/wp-content/uploads/2017/02/chocolate-lava-cakes-2.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/.playwright-cli/page-2026-09-27T15-13-32-905Z.png`. Лично просмотрено: более широкий самостоятельный ракурс той же авторской версии показывает сохранённую наружную форму и центр, вышедший при разрезе. Ложки/ягоды/мороженое исключены.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-bfb5-7b22-a127-ac2acf5e1957/exec-f17a08a1-0c84-4e4e-a72d-382ed1b925af.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-b74c3e91a06f.webp`; 66496 байт; SHA-256 `a7c99102d405c75c594fd3e55110fb9e4a1ba237da7ad38dc16ec43d036f4683`.
- Визуальная проверка: Сохранена порционная цилиндрическая форма и отделённая аккуратная часть. Из открытого центра естественно выходит шоколад, не вся порция разрушена. Нет мороженого/ягод/внешнего соуса; порция и тарелка целиком.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional natural editorial food photograph for an educational menu card, landscape 3:2. One specific serving on a simple unbranded matte ivory ceramic plate on a light neutral stone table, soft side window daylight, realistic edible textures, moderate soft shadows, calm light background, camera at 40 degrees above table. Food large and readable at card size, the entire food serving and plate visible without cropping, comfortable safe margins on all sides. No people, hands, text, labels, logos, packaging, flags, ornaments, watermark, pseudo-letters, plastic-looking texture, excessive gloss, floating ingredients, impossible geometry, interface, frame, or unrequested garnish, decoration or sauce. Do not copy any source photograph. Subject: one individual chocolate fondant lava cake. A modest small round ramekin-baked chocolate cake, inverted onto the plate, with a naturally baked dark-brown outer shell and gently rounded cylindrical shape that remains upright. A neat small wedge has been cut away from the front and rests immediately beside the cake, allowing the cut opening to face the camera. From that opening, the warm chocolate center naturally flows a short distance onto the plate in one modest thick dark-chocolate pool, with realistic soft folds and a restrained edible satin sheen, not a huge liquid flood or separate sauce poured over the cake. The outer cake shell and separate cut wedge remain structurally intact; the flowing center is the key visible feature. Not a brownie square, not a muffin, no dense fully set center, no destroyed collapsed chocolate mass. No ice cream, cream, berries, fruit, mint, powdered sugar, garnish, nuts, caramel, external syrup or sauce, extra food or utensils.
```

### Японский омлет

- Рецептура: Classic plain tamagoyaki rolled from thin cooked egg layers, not dashimaki, cheese, nori-wrapped sushi or an arbitrary mixed variant.
- Проверенный факт: Namiko Hirasawa Chen's classic recipe seasons eggs, cooks successive thin layers, rolls them into a compact shape and slices. The main distinguishing feature is visible rolled egg layers.
- [Авторский источник 1](https://www.justonecookbook.com/tamagoyaki/)
- Просмотренное реальное фото 1: [страница](https://www.justonecookbook.com/tamagoyaki/), [само фото](https://cdn.justonecookbook.com/spai/q_glossy%2Bret_img%2Bto_auto/www.justonecookbook.com/wp-content/uploads/2024/02/Simple-Tamagoyaki-4672-II.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/05-d-1.png`. Personally viewed cooked classic omelette slices: many thin folded yellow egg layers, subtle pores; bamboo leaf excluded.
- Просмотренное реальное фото 2: [страница](https://www.justonecookbook.com/tamagoyaki/), [само фото](https://cdn.justonecookbook.com/spai/q_glossy%2Bret_img%2Bto_auto/www.justonecookbook.com/wp-content/uploads/2024/02/Simple-Tamagoyaki-4701-V.jpg). Скриншот: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/05-d-2.png`. Personally viewed separate plate photo from the same classic recipe: oval-rectangular layered cross-sections, no cheese. Plate ornament and daikon excluded.
- Оригинал: `C:/Users/АМ/.codex/generated_images/01a0df76-4d9b-7c62-819b-cde780f9088f/exec-16f4482f-b241-454f-9a76-b118a892986c.png`.
- Карточка: `/assets/olympiad/tour4/t4-menu-v1-c9a04732be61.webp`; 54632 байт; SHA-256 `343c8dd6d1a2051f6152c9ec1e2aff20ec4df7f5048c218fc1df768039232522`.
- Визуальная проверка: Five yellow rolled egg slices with multiple thin layered cut faces, natural pores; no cheese, rice, nori or garnish.
- Попыток: 1.

Точный исходный промпт:

```text
Use case: photorealistic-natural. Create ONE original professional editorial food photograph for an educational menu card, not a collage. Landscape 3:2. Scene: calm light neutral stone tabletop, simple unbranded off-white ceramic plate or shallow bowl appropriate to the food, soft side window daylight, realistic food textures, moderate natural shadows, restrained highlights. Camera at 35-45 degrees above table unless a slightly higher angle is needed to show structure. The entire portion and entire dish must fit in frame with clear safe margins on all sides; food large and readable at thumbnail size. Subject: five thick slices of classic tamagoyaki Japanese rolled egg omelette, gently rounded rectangular or oval cross-sections, loosely lined up with the cut faces visible. Soft golden-yellow cooked egg, many very thin naturally uneven rolled egg layers clearly discernible on each cut face, tiny subtle air pores, tender moist real omelette texture. A gently golden exterior, no dark burned crust. Must read as repeatedly rolled thin egg sheets, not a smooth yellow cheese block, sponge cake or pastry roll. No cheese, rice, nori, sushi, vegetables, daikon, sauce, herbs or garnish. No unmentioned garnishes, sides, sauces or decorations. No people, hands, text, lettering, packaging, logos, watermark, flags, national ornaments, country props, interfaces or frames. No CGI or plastic food, excessive shine, flying ingredients or impossible geometry. Do not copy any reference photograph.
```

## Сохранение истории

Первая версия чебурека сохранена вне public: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/rejected-cheburek-first.webp`, исходный PNG также сохранён. Она не была опубликована и не была выдана настоящим участникам. Новая фотография получила новое непрозрачное имя; старые production-ассеты и сохранённые варианты не переписаны.

Полные локальные receipts: `C:/Users/АМ/AppData/Local/Temp/olympiad-t4-qa/worker1.json`, `worker2.json`, `worker3.json`, `asset-results.json`. Содержат дополнительные метрики, историю генерации и реально просмотренных фото. Скриншоты и исходные PNG находятся по указанным фактическим локальным путям; после очистки временного каталога эти пути не будут переносимыми ссылками.
