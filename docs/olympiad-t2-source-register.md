# T2 «Кухни мира»: реестр источников и изображений

Дата проверки всех источников и изображений: **2026-09-26**. Частный редакционный документ; не включать в публичные participant payloads.

## Контракт

Пять фиксированных заданий по четыре взаимно-однозначные пары. Все участники получают одинаковые задания, порядок заданий, ключи и оценивание; порядок карточек и стран перемешивается. За правильную пару — 1 балл, за неверную/пустую — 0; частичный ответ допустим при досрочном завершении; максимум T2 — 20. Связь блюда с национальной кухней не означает исключительное авторство или отсутствие региональных версий. Фото помогает узнать уже названное блюдо, но состав/цвет/подача фото не являются отдельным ключом оценки.

Все двадцать изображений созданы встроенным image generation по прочитанному тексту первичных официальных источников. Фотографии с сайтов не скачивались и не копировались. Все финальные WebP открыты по отдельности и проверены глазами: узнаваемость, отсутствие текста/водяных знаков/флагов/географических подсказок и грубых артефактов, соответствие выбранному описанному варианту. Формат: 900×600 (3:2), WebP quality 84; названия нейтральные, EXIF/XMP и промпты в публичные файлы не вложены. Исходные генерации находятся вне репозитория. Перегенерация ни одного финального блюда не потребовалась. Концепт интерфейса — отдельная генерация, не входит в эти 20 фото и не служит кулинарным источником.

## Источники и полные финальные промпты

### 01 · T2-01 · Тирамису → Италия

- Dish ID: `tiramisu`.
- Первичный источник: [Tiramisu — Le ricette (Regione del Veneto)](https://scultura.veneto.eu/veneto-qualita-dettaglio?lang=it&uuid=6088f7f6-4ea0-4dd8-884f-d085c14b00c2). Официальный туристический портал региона Венето.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Желтки, сахар, маскарпоне, савоярди, кофе и какао; слои пропитанных кофе печений и крема, какао сверху.
- Чего не утверждаем / не добавляем: Не приписывать единственное место изобретения; не добавлять ягоды, мяту, шоколадные осколки.
- Визуальный brief: Прямоугольная порция, различимые кофейные бисквитные и светлые кремовые слои, тонкое какао.
- Asset: `public/assets/olympiad/tour2/t2-active-01.webp`.
- Генерация: `exec-e41f1fde-6b12-41b0-b03c-d5be73fb67af`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for a named-dish educational card, landscape 3:2. Light neutral stone table, simple unbranded ceramic serving dish, soft natural side window light, 40 degree camera angle, centered entire food, natural imperfect textures, close enough to read at thumbnail size, no clipped dish. No people, hands, text, pseudotext, logo, watermark, packaging, flags, national symbols, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph.
Subject brief: Tiramisu: one rectangular portion, visible alternating layers of coffee-soaked savoiardi ladyfingers and pale mascarpone cream made with egg yolks and sugar, evenly dusted fine cocoa on top. No berries, mint, chocolate shards, biscuits standing upright. Facts from Veneto official recipe, layers must be visibly sponge/ladyfingers, not a chocolate cake.
```

### 02 · T2-01 · Рататуй → Франция

- Dish ID: `ratatouille`.
- Первичный источник: [Taste Provence this weekend and make a ratatouille — France.fr](https://www.france.fr/en/article/taste-provence-this-weekend-and-make-a-ratatouille/). Национальный туристический портал Франции.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Нарезанные баклажан, кабачок, красный перец, помидор, лук, чеснок, оливковое масло и базилик; тушёное овощное блюдо.
- Чего не утверждаем / не добавляем: Не подменять нарезанное рагу спиральным тианом / confit byaldi.
- Визуальный brief: Неровные кусочки приготовленных овощей в небольшой миске; натуральная фактура.
- Asset: `public/assets/olympiad/tour2/t2-active-02.webp`.
- Генерация: `exec-1b34b0f8-ed85-441f-9ede-754c44081769`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for a named-dish educational card, landscape 3:2. Light neutral stone table, simple unbranded ceramic serving dish, soft natural side window light, 40 degree camera angle, centered entire food, natural imperfect textures, close enough to read at thumbnail size, no clipped dish. No people, hands, text, pseudotext, logo, watermark, packaging, flags, national symbols, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph.
Subject brief: Ratatouille: cooked irregular chunks of aubergine, courgette, red bell pepper, tomato and onion in light olive oil and tomato juices, small basil leaves, garlic not oversized. Shallow ceramic bowl. Rustic mixed vegetable stew, NOT concentric thin slices/tian/confit byaldi. France.fr confirms chopped stewed vegetables.
```

### 03 · T2-01 · Венский шницель → Австрия

- Dish ID: `wiener_schnitzel`.
- Первичный источник: [Wiener Schnitzel — Austria.info](https://www.austria.info/en-us/recipes/wiener-schnitzel/). Австрийское национальное туристическое представительство.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Тонкая телятина, мука, яйцо, хлебные крошки, жарка и лимон; золотистая хрустящая панировка.
- Чего не утверждаем / не добавляем: Источник не позволяет заявлять бесспорное изобретение в Вене; без кости, сыра и подливы.
- Визуальный brief: Один тонкий неровный шницель с естественной панировкой; два ломтика лимона.
- Asset: `public/assets/olympiad/tour2/t2-active-03.webp`.
- Генерация: `exec-f6f92386-b3f9-4220-95a0-e4453051dc1a`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for a named-dish educational card, landscape 3:2. Light neutral stone table, simple unbranded ceramic serving dish, soft natural side window light, 40 degree camera angle, centered entire food, natural imperfect textures, close enough to read at thumbnail size, no clipped dish. No people, hands, text, pseudotext, logo, watermark, packaging, flags, national symbols, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph.
Subject brief: Wiener Schnitzel: one large thin irregular veal escalope coated in flour/egg/breadcrumbs and pan fried until golden crisp puffed crumb surface, on a plate, only two lemon slices as garnish. NO bone, cheese, gravy, potatoes or salad. Austria Tourism recipe facts.
```

### 04 · T2-01 · Фиш-энд-чипс → Великобритания

- Dish ID: `fish_and_chips`.
- Первичный источник: [Eat like a local: a foodie map of Britain — VisitBritain](https://www.visitbritain.com/en/things-to-do/eat-local-foodie-map-britain). Официальное национальное туристическое агентство.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Жареная рыба в кляре и картофель фри связаны с британской кухней.
- Чего не утверждаем / не добавляем: Не фиксировать вид рыбы или единственную историю происхождения; не добавлять газету, горошек и соусы.
- Визуальный brief: Золотистая рыба в пузырчатом кляре и крупный жареный картофель на одной тарелке.
- Asset: `public/assets/olympiad/tour2/t2-active-04.webp`.
- Генерация: `exec-dab0d2f4-eae3-4671-9a8d-de3f7974b2c0`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for a named-dish educational card, landscape 3:2. Light neutral stone table, simple unbranded ceramic serving dish, soft natural side window light, 40 degree camera angle, centered entire food, natural imperfect textures, close enough to read at thumbnail size, no clipped dish. No people, hands, text, pseudotext, logo, watermark, packaging, flags, national symbols, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph.
Subject brief: Fish and chips: a crisp golden battered fried fish fillet served beside chunky fried potato chips on one plain plate. No newspaper, sauce, peas, lemon or garnish. VisitBritain confirms battered fried fish and chips; show natural blistered batter not breadcrumbs.
```

### 05 · T2-02 · Онигири → Япония

- Dish ID: `onigiri`.
- Первичный источник: [Konbini: Japanese convenience stores — JNTO Japan Magazine](https://www.japan.travel/en/japan-magazine/2002_konbini/). Japan National Tourism Organization.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Рисовые шарики примерно с кулак, покрытые нори, с различными начинками.
- Чего не утверждаем / не добавляем: Источник подтверждает рис и нори, но не требует точной треугольной геометрии; скрытая начинка не оценивается.
- Визуальный brief: Три мягко округлённых рисовых комочка с нижней полосой нори; без топпингов.
- Asset: `public/assets/olympiad/tour2/t2-active-05.webp`.
- Генерация: `exec-fb45133c-60b4-4d3d-8426-74468a27a414`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. ONE original professional food photograph for an educational named-dish card. Landscape 3:2, plain light neutral stone table, simple unbranded ceramic dish, soft natural side window light, 40 degree view, entire centered food clearly visible, realistic natural imperfect food texture. No people, hands, text, pseudotext, logos, watermark, flags, national symbols, packaging, cutlery, other dishes, extra garnish or unlisted ingredients. Do not reproduce any source photo.
Subject brief: Onigiri: three fist-sized gently rounded white rice balls covered at the lower half with dry dark nori seaweed. Distinct glossy cooked rice grains, no fish on top, no sauce, no sesame or garnish. JNTO text confirms rice balls covered in nori; filling enclosed and not visible.
```

### 06 · T2-02 · Бибимбап → Республика Корея

- Dish ID: `bibimbap`.
- Первичный источник: [Jeonju Bibimbap: A Dazzling Harmony of Gastronomy — VISITKOREA](https://english.visitkorea.or.kr/svc/contents/contentsView.do?menuSn=904&vcontsId=221301). Korea Tourism Organization.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Рис, овощные намуль (в том числе шпинат, проростки, папоротник, кабачок), говядина, яйцо и острая паста.
- Чего не утверждаем / не добавляем: Не считать эту подачу единственным рецептом; исключены неподтверждённые морепродукты и сыр.
- Визуальный brief: Рис с отдельными секциями овощей и говядины, одним жареным яйцом и небольшим количеством красной пасты.
- Asset: `public/assets/olympiad/tour2/t2-active-06.webp`.
- Генерация: `exec-1eb112d4-914d-4dba-a9f4-b7450ab4cfd8`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. ONE original professional food photograph for an educational named-dish card. Landscape 3:2, plain light neutral stone table, simple unbranded ceramic dish, soft natural side window light, 40 degree view, entire centered food clearly visible, realistic natural imperfect food texture. No people, hands, text, pseudotext, logos, watermark, flags, national symbols, packaging, cutlery, other dishes, extra garnish or unlisted ingredients. Do not reproduce any source photo.
Subject brief: Bibimbap: plain bowl with steamed white rice visible beneath neatly separated small sections of cooked spinach, bean sprouts, julienned zucchini, bracken and cooked beef, topped with one fried egg and small amount of red chili paste. VISITKOREA text supports these ingredients and separated presentation. No carrots, lettuce, cherry tomatoes, seafood, cheese or extra seeds.
```

### 07 · T2-02 · Фо → Вьетнам

- Dish ID: `pho`.
- Первичный источник: [The history of phở — Vietnam Tourism](https://vietnam.travel/things-to-do/history-pho). Официальный национальный туристический портал.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Говяжий бульон, рисовая лапша, тонкое мясо и нарезанные травы / зелёный лук; существуют региональные версии.
- Чего не утверждаем / не добавляем: Не превращать в рамен: без яйца, нори, свинины, кукурузы; не обобщать одну подачу на все регионы.
- Визуальный brief: Прозрачный бульон, белая плоская рисовая лапша, тонкая говядина и мелкая зелень.
- Asset: `public/assets/olympiad/tour2/t2-active-07.webp`.
- Генерация: `exec-102de6fe-95f1-4c4d-b79d-1da2e7f882a2`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. ONE original professional food photograph for an educational named-dish card. Landscape 3:2, plain light neutral stone table, simple unbranded ceramic dish, soft natural side window light, 40 degree view, entire centered food clearly visible, realistic natural imperfect food texture. No people, hands, text, pseudotext, logos, watermark, flags, national symbols, packaging, cutlery, other dishes, extra garnish or unlisted ingredients. Do not reproduce any source photo.
Subject brief: Pho: plain bowl of clear beef broth, soft flat white rice noodles, thin cooked beef slices and finely chopped herbs/chives/scallions. Vietnam Tourism text supports these; noodle strands visibly flat, NOT ramen, no egg, pork, nori, mushroom or corn, no elaborate garnish. Natural light steam optional.
```

### 08 · T2-02 · Пад-тай → Таиланд

- Dish ID: `pad_thai`.
- Первичный источник: [Pad Thai — TAT Newsroom](https://www.tatnews.org/2016/02/pad-thai/). Tourism Authority of Thailand, International PR Division.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Текст статьи описывает рисовую лапшу Sen Chan, проростки, тамаринд, сушёные креветки и тофу.
- Чего не утверждаем / не добавляем: В выбранном источнике не подтверждена вся возможная ресторанная рецептура; без крупных свежих креветок, лайма, арахиса, яйца.
- Визуальный brief: Жареная рисовая лапша с тамариндом, кубиками тофу, маленькими креветками и проростками.
- Asset: `public/assets/olympiad/tour2/t2-active-08.webp`.
- Генерация: `exec-5907c2f7-f7b5-4ea8-a2dd-895db57c9165`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. ONE original professional food photograph for an educational named-dish card. Landscape 3:2, plain light neutral stone table, simple unbranded ceramic dish, soft natural side window light, 40 degree view, entire centered food clearly visible, realistic natural imperfect food texture. No people, hands, text, pseudotext, logos, watermark, flags, national symbols, packaging, cutlery, other dishes, extra garnish or unlisted ingredients. Do not reproduce any source photo.
Subject brief: Pad Thai: pan-fried rice noodles tinted by tamarind, diced fried tofu, small dried shrimp and bean sprouts. Plain plate, lightly glossy caramel brown noodles, not soup. Use only TAT Newsroom text-confirmed ingredients; no fresh large shrimp, egg, lime, peanuts, cilantro, green herbs or unrelated vegetables.
```

### 09 · T2-03 · Карривурст → Германия

- Dish ID: `currywurst`.
- Первичный источник: [Berlin's Currywurst — visitBerlin](https://www.visitberlin.de/en/berlins-currywurst/map). Официальная туристическая организация Берлина.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Нарезанная варёная или жареная колбаска с томатным соусом, приправленным карри.
- Чего не утверждаем / не добавляем: Не выдавать одну колбаску за обязательный сорт; картофель и булочка не нужны для узнавания.
- Визуальный brief: Подрумяненные ломтики колбаски, томатный соус и немного порошка карри.
- Asset: `public/assets/olympiad/tour2/t2-active-09.webp`.
- Генерация: `exec-724c4ebf-9844-4624-867c-3817928d2bb5`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. ONE original professional food photo for a named-dish educational card, landscape 3:2. Light neutral stone table, simple ceramic plate or bowl, soft natural side light, 40 degree view, entire centered food with natural realistic texture, clearly readable in a thumbnail. No people, hands, text, pseudotext, logos, watermark, flags, national symbols, packaging, cutlery, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph.
Subject brief: Currywurst: thick browned fried sausage cut into round slices with a spiced red tomato curry sauce and a light dusting of curry powder. Serve on a plain plate, sausage and sauce only, no bun, fries, mayonnaise, garnish. visitBerlin official description confirms sliced fried sausage with curry tomato sauce.
```

### 10 · T2-03 · Паштел-де-ната → Португалия

- Dish ID: `pastel_de_nata`.
- Первичный источник: [Traditional Portuguese Recipes: Pastéis de Nata (Custard Tarts) — VisitPortugal](https://www.visitportugal.com/en/content/traditional-portuguese-recipes-past%C3%A9is-de-nata-custard-tarts). Turismo de Portugal.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Слоёное тесто, молочно-желтковый крем с сиропом; выпекание до карамелизации поверхности.
- Чего не утверждаем / не добавляем: Не утверждать, что иллюстрация воспроизводит секретный рецепт конкретной кондитерской.
- Визуальный brief: Три небольшие круглые тарталетки с видимыми слоями теста и неравномерными тёмными пятнами на креме.
- Asset: `public/assets/olympiad/tour2/t2-active-10.webp`.
- Генерация: `exec-1c9ad464-16b6-462e-b1d9-a6ae13468bb6`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. ONE original professional food photo for a named-dish educational card, landscape 3:2. Light neutral stone table, simple ceramic plate or bowl, soft natural side light, 40 degree view, entire centered food with natural realistic texture, clearly readable in a thumbnail. No people, hands, text, pseudotext, logos, watermark, flags, national symbols, packaging, cutlery, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph.
Subject brief: Pastel de nata: three small round custard tarts, golden flaky layered puff pastry shells with creamy yellow egg-and-milk custard tops showing naturally uneven dark caramelized baked spots. One tart slightly angled to show layered pastry. Plain plate. VisitPortugal recipe confirms puff pastry and caramelized egg custard. No icing, berries, mint, cinnamon stick or lemon peel as props.
```

### 11 · T2-03 · Гаспачо → Испания

- Dish ID: `gazpacho`.
- Первичный источник: [Gazpacho — Spain.info](https://www.spain.info/en/recipe/gazpacho/). Официальный туристический портал Испании.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Смешанные и протёртые помидоры, зелёный перец, хлеб, чеснок, масло, уксус, вода; возможна мелкая овощная нарезка при подаче.
- Чего не утверждаем / не добавляем: Не добавлять сливки, мясо, сыр, базилик; иллюстрация не проверяет невидимый состав.
- Визуальный brief: Гладкий красный суп без пара в простой глиняной миске, немного мелкой овощной нарезки.
- Asset: `public/assets/olympiad/tour2/t2-active-11.webp`.
- Генерация: `exec-ce2b0efb-342d-431e-8e2d-f8b327eb4395`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. ONE original professional food photo for a named-dish educational card, landscape 3:2. Light neutral stone table, simple ceramic plate or bowl, soft natural side light, 40 degree view, entire centered food with natural realistic texture, clearly readable in a thumbnail. No people, hands, text, pseudotext, logos, watermark, flags, national symbols, packaging, cutlery, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph.
Subject brief: Gazpacho: smooth blended tomato-red vegetable soup, no steam, in a plain shallow clay bowl, small amount of finely diced tomato, green pepper and cucumber in the center as optional accompaniment. Spain.info recipe facts. No cream swirl, basil, crouton mountain, cheese, meat or unlisted garnish.
```

### 12 · T2-03 · Брюссельская вафля → Бельгия

- Dish ID: `brussels_waffle`.
- Первичный источник: [Waffles — visit.brussels](https://www.visit.brussels/en/visitors/where-to-eat/waffles). Официальное туристическое представительство Брюссельского региона.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Прямоугольная брюссельская вафля с 20–24 углублениями, хрустящая и воздушная; сахарная пудра.
- Чего не утверждаем / не добавляем: Не смешивать с округлой льежской вафлей; множество топпингов не являются обязательными.
- Визуальный brief: Прямоугольная вафля с сеткой 4×6 и тонкой сахарной пудрой.
- Asset: `public/assets/olympiad/tour2/t2-active-12.webp`.
- Генерация: `exec-99e1090f-0dcf-450b-9c1c-9899aa9698df`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. ONE original professional food photo for a named-dish educational card, landscape 3:2. Light neutral stone table, simple ceramic plate or bowl, soft natural side light, 40 degree view, entire centered food with natural realistic texture, clearly readable in a thumbnail. No people, hands, text, pseudotext, logos, watermark, flags, national symbols, packaging, cutlery, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph.
Subject brief: Brussels waffle: one large rectangular golden crispy waffle, precisely 4 columns by 6 rows of deep square pockets, light dusting of icing sugar, plain ceramic plate. No round edges, filling, cream, fruit, syrup, chocolate or ice cream. Visit Brussels text confirms rectangle with 20-24 holes and icing sugar.
```

### 13 · T2-04 · Баттер-чикен → Индия

- Dish ID: `butter_chicken`.
- Первичный источник: [A gastronomic journey through must-try local — Incredible India, Chandigarh](https://www.incredibleindia.gov.in/en/chandigarh/chandigarh/a-gastronomic-journey-through-must-try-local). Министерство туризма Индии.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Murgh makhani: курица со специями, сливочный томатный карри, завершение сливочным маслом. Текст раздела Butter Chicken прочитан из HTML официальной страницы, поскольку веб-парсер показывал навигацию.
- Чего не утверждаем / не добавляем: Не заявлять спорного единственного автора; без панира, наана, риса, свежей зелени.
- Визуальный brief: Неровные кусочки курицы в красно-оранжевом густом соусе и небольшая тающая порция масла.
- Asset: `public/assets/olympiad/tour2/t2-active-13.webp`.
- Генерация: `exec-cb627ff6-80bb-4abf-82a2-9c0c22a2c8d0`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for a named-dish educational card, landscape 3:2. Light neutral stone table, simple unbranded ceramic serving dish, soft natural side window light, 40 degree camera angle, centered entire food, natural imperfect textures, close enough to read thumbnail, no clipped dish. No people, hands, text, pseudotext, logo, watermark, packaging, flags, national symbols, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph. Butter chicken: tender irregular pieces of spice-marinated chicken in a creamy tomato curry, warm red-orange smooth thick sauce, finished with a small melting dollop of butter. Show chicken pieces clearly, not paneer cubes. No rice, naan, coriander leaves, cream swirl or other ingredients.
```

### 14 · T2-04 · Пекинская утка → Китай

- Dish ID: `peking_duck`.
- Первичный источник: [Time-honored food brands — Beijing Municipal Government](https://english.beijing.gov.cn/specials/musteatmeals/timehonoredbrands/202409/t20240927_3908518.html). Официальный портал правительства Пекина, материал Dongcheng District.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Запечённая утка с хрустящей кожей и нежным мясом; текст также описывает веерную / цветочную подачу нарезки.
- Чего не утверждаем / не добавляем: Не утверждать обязательность блинчиков, огурца и отдельного соуса на основании этой страницы.
- Визуальный brief: Простая веерная нарезка запечённой утки с золотисто-коричневой кожей на овальной тарелке.
- Asset: `public/assets/olympiad/tour2/t2-active-14.webp`.
- Генерация: `exec-80b283c7-fbce-4f5a-b6c0-afe800e543cd`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for a named-dish educational card, landscape 3:2. Light neutral stone table, simple unbranded ceramic serving dish, soft natural side window light, 40 degree camera angle, centered entire food, natural imperfect textures, close enough to read thumbnail, no clipped dish. No people, hands, text, pseudotext, logo, watermark, packaging, flags, national symbols, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph. Peking duck: a neat fan of sliced roasted duck with crisp lacquered golden-brown skin and tender meat, on an oval plain plate. Simple realistic cuts, no whole raw bird, no bones protruding, no garnish, pancakes, sauce bowl, vegetables or other ingredients.
```

### 15 · T2-04 · Харчо → Грузия

- Dish ID: `kharcho`.
- Первичный источник: [Mingrelian Walnut Kharcho — Georgia Travel](https://georgia.travel/mingrelian-walnut-kharcho). Georgian National Tourism Administration.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Выбран именно мегрельский ореховый вариант: говядина, лук, грецкие орехи, чеснок, сушёный кориандр, уцхо-сунели, аджика, бульон и кислота. Статья отличает его от рисового супа харчо.
- Чего не утверждаем / не добавляем: Не описывать фотографию как универсальный рисовый суп; без риса, помидоров, кукурузной муки и гарнира гоми.
- Визуальный brief: Небольшие кусочки говядины в умеренно густом коричневом ореховом соусе; без украшений.
- Asset: `public/assets/olympiad/tour2/t2-active-15.webp`.
- Генерация: `exec-d3371696-8ea9-481e-b36b-06ad5dd1dd06`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for a named-dish educational card, landscape 3:2. Light neutral stone table, simple unbranded ceramic serving dish, soft natural side window light, 40 degree camera angle, centered entire food, natural imperfect textures, close enough to read thumbnail, no clipped dish. No people, hands, text, pseudotext, logo, watermark, packaging, flags, national symbols, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph. Kharcho, specifically the source-confirmed Mingrelian walnut variant: small tender pieces of beef in a moderately thick broth-based brown walnut sauce, made with finely fried onion, ground walnuts, garlic, dried coriander, blue fenugreek and smoked red-pepper ajika, a little vinegar. Serve in a plain shallow ceramic bowl, natural oily sheen but not oily pools. No rice, potatoes, tomatoes, corn flour, cream, garnish or ghomi. It must look like a real spicy beef-and-walnut dish, not generic tomato soup.
```

### 16 · T2-04 · Гуляш → Венгрия

- Dish ID: `goulash`.
- Первичный источник: [Puskás, Rubik, goulash… — Visit Hungary](https://visithungary.com/fr/article/puskas-rubik-goulash---les-hongrois-vont-ils-reussir-a-lemporter-sur-leur-reputation). Официальное венгерское туристическое агентство.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Суповая версия: говяжьи кубики, паприка, лук, зелёный перец, картофель; красный бульон.
- Чего не утверждаем / не добавляем: Не подменять густым пёркёльтом или мясной подливой на гарнире; без сливок и лапши.
- Визуальный brief: Красный суп с различимыми кусочками говядины и картофеля.
- Asset: `public/assets/olympiad/tour2/t2-active-16.webp`.
- Генерация: `exec-71bbbfcc-8834-4688-9056-51f0a53a2ca3`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for a named-dish educational card, landscape 3:2. Light neutral stone table, simple unbranded ceramic serving dish, soft natural side window light, 40 degree camera angle, centered entire food, natural imperfect textures, close enough to read thumbnail, no clipped dish. No people, hands, text, pseudotext, logo, watermark, packaging, flags, national symbols, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph. Goulash, the source-confirmed soup version: tender irregular beef cubes and diced potatoes in generous uniformly red paprika broth with cooked finely chopped onions and green pepper pieces. Plain ceramic soup bowl. This is clearly a soup with visible liquid, not brown gravy over a side dish. No sour cream, parsley, noodles, bread, carrots or garnish.
```

### 17 · T2-05 · Poutine → Канада

- Dish ID: `poutine`.
- Первичный источник: [Top 5 foodies musts — Bonjour Québec](https://www.bonjourquebec.com/en/to-see-and-do/getaways-in-quebec/top-5-foodies-musts). Официальный туристический портал правительства Квебека.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Хрустящий картофель фри, свежие сырные зёрна / cheese curds и насыщенная подлива.
- Чего не утверждаем / не добавляем: Не заменять cheese curds тёртым плавленым сыром; исключены необязательные мясные добавки.
- Визуальный brief: Крупный жареный картофель с неровными белыми сырными зёрнами и коричневой подливой.
- Asset: `public/assets/olympiad/tour2/t2-active-17.webp`.
- Генерация: `exec-c4723116-f4b8-4e15-968a-07c88bcebbb9`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for a named-dish educational card, landscape 3:2. Light neutral stone table, simple unbranded ceramic serving dish, soft natural side window light, 40 degree camera angle, centered entire food, natural imperfect textures, close enough to read thumbnail, no clipped dish. No people, hands, text, pseudotext, logo, watermark, packaging, flags, national symbols, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph. Poutine, the source-confirmed straightforward original: a generous mound of crispy golden fries topped with irregular fresh white cheese curds and rich savory brown gravy. Cheese curds retain distinct shapes, not melted shredded cheese. Plain shallow bowl. No pulled pork, bacon, parsley, scallions, ketchup or other additions.
```

### 18 · T2-05 · Стропвафли → Нидерланды

- Dish ID: `stroopwafels`.
- Первичный источник: [Regional products in the Netherlands — Holland.com / NBTC](https://www.holland.com/global/tourism/getting-around/interests/regional-products-in-the-netherlands). Netherlands Board of Tourism & Conventions.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Тонкие хрустящие вафли с карамельно-сиропной серединой, связанные с нидерландской кухней.
- Чего не утверждаем / не добавляем: История происхождения приведена предположительно, не превращать её в проверяемое утверждение; без шоколада и ягод.
- Визуальный brief: Тонкие круглые вафли с мелкой сеткой; сломанная половинка показывает узкую сиропную прослойку.
- Asset: `public/assets/olympiad/tour2/t2-active-18.webp`.
- Генерация: `exec-e61a66a1-73c3-499d-b9a3-b4f9802c7c2a`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for a named-dish educational card, landscape 3:2. Light neutral stone table, simple unbranded ceramic serving dish, soft natural side window light, 40 degree camera angle, centered entire food, natural imperfect textures, close enough to read thumbnail, no clipped dish. No people, hands, text, pseudotext, logo, watermark, packaging, flags, national symbols, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph. Stroopwafels: several thin round golden waffles, each made from two thin crisp waffle layers stuck together with a thin gooey caramel syrup center. Small tight fine-grid pressed waffle pattern, not thick Belgian waffle pockets. Stack two, one broken half in front shows the narrow syrup layer. Plain plate. No chocolate, strawberries, icing, whipped cream or other toppings.
```

### 19 · T2-05 · Крылышки баффало → США

- Dish ID: `buffalo_wings`.
- Первичный источник: [How to Make Baked Buffalo Wings — I LOVE NY](https://www.iloveny.com/blog/post/how-to-make-baked-buffalo-wings/). Официальный туристический портал штата Нью-Йорк; рецепт New York Kitchen.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Выбрана опубликованная запечённая версия: части крыльев, острый соус, сливочное масло, соль и перец.
- Чего не утверждаем / не добавляем: Это первичный рецепт на официальном портале, не ресторанное меню; недоступная брошюра Visit Buffalo не используется как прочитанный источник. Не объявлять запекание единственным способом.
- Визуальный brief: Реалистичные flats и drumettes, красно-оранжевый острый масляный соус, подпечённые края; без гарнира.
- Asset: `public/assets/olympiad/tour2/t2-active-19.webp`.
- Генерация: `exec-3c7533a7-a28d-40bf-8d0a-ae4928d83e81`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for a named-dish educational card, landscape 3:2. Light neutral stone table, simple unbranded ceramic serving dish, soft natural side window light, 40 degree camera angle, centered entire food, natural imperfect textures, close enough to read thumbnail, no clipped dish. No people, hands, text, pseudotext, logo, watermark, packaging, flags, national symbols, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph. Buffalo wings, source-confirmed baked version: anatomically realistic chicken wing sections, both flats and drumettes, evenly coated with red-orange hot pepper sauce and butter, lightly roasted edges, moist glossy saucy surface. Plain plate. No breadcrumbs, sesame, parsley, celery, blue-cheese sauce, rice or garnish.
```

### 20 · T2-05 · Кёттбуллар → Швеция

- Dish ID: `kottbullar`.
- Первичный источник: [Traditional Swedish meatballs recipe — Visit Sweden](https://visitsweden.com/what-to-do/food-drink/recipes/traditional-swedish-meatballs-recipe/). Официальная национальная туристическая организация.
- Прочитан текст страницы; проверено 2026-09-26.
- Подтверждённые факты: Небольшие фрикадельки из свинины и говядины с луком, сухарями, сливками и яйцом; обжарка в масле, сливочная коричневая подлива, картофельное пюре и брусничное варенье.
- Чего не утверждаем / не добавляем: Не представлять идеально пластиковыми сферами; без пасты, грибов и неподтверждённых гарниров.
- Визуальный brief: Естественно неровные небольшие подрумяненные фрикадельки, подлива, немного пюре и отдельная порция красного брусничного варенья.
- Asset: `public/assets/olympiad/tour2/t2-active-20.webp`.
- Генерация: `exec-8a95002f-07e8-4a4e-877f-cc5a2c028574`; полный фактически переданный финальный промпт ниже (сохранён из записи генерации).
- Визуальная QA: PASS — изображение открыто и проверено; состав и внешний вид пригодны как иллюстрация названного блюда, блюдо целиком, нейтральный фон, без подсказок страны. Это редакционная оценка, не независимая экспертиза.
- Перегенерация: нет; причина — финальный первый результат прошёл проверку.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for a named-dish educational card, landscape 3:2. Light neutral stone table, simple unbranded ceramic serving dish, soft natural side window light, 40 degree camera angle, centered entire food, natural imperfect textures, close enough to read thumbnail, no clipped dish. No people, hands, text, pseudotext, logo, watermark, packaging, flags, national symbols, other foods, extra garnish or unlisted ingredients. Do not copy a source photograph. Kottbullar meatballs: small tablespoon-sized hand-rolled ground pork and beef meatballs browned in butter and coated in creamy brown sauce. A small serving of mashed potatoes and a distinct spoonful of red lingonberry jam on the side, all on the same plain plate. No pasta, cucumber, raw cranberry fruit, mushrooms or garnish. Natural irregular browned meatball textures, not perfect plastic spheres.
```

## Дополнительные первичные уточнения

- Фо: [21 must-try Vietnamese dishes — Vietnam Tourism](https://vietnam.travel/node/195): отдельно подтверждает плоскую рисовую лапшу и тонкую говядину; используется для уточнения, не для копирования фото.
- Стропвафли: [Dutch foods to try — I amsterdam](https://www.iamsterdam.com/en/see-and-do/restaurant-and-bars/dutch-foods-to-try): туристическая организация Amsterdam & Partners; две тонкие вафли с сиропной прослойкой.
- Гуляш: [Que doit-on savoir à propos de la cuisine hongroise? — Visit Hungary](https://visithungary.com/fr/article/que-doit-on-savoir-a-propos-de-la-cuisine-hongroise-2): различение гуляша-супа и пёркёльта.

## Решение по предложенной матрице

Ни одна из 20 пар пользователя не заменена. Для харчо выбран подтверждённый GNTA мегрельский ореховый вариант, не рисовый суп. Для Buffalo wings выбран опубликованный официальным порталом Нью-Йорка запечённый вариант. Для гуляша — суп, для рататуя — нарезанное рагу, для вафли — прямоугольная брюссельская разновидность. Эти уточнения не меняют ключи стран. Нет пересечений с активными блюдами T1 и семью зарезервированными блюдами будущего T5; это проверяется тестом. Старые сохранённые попытки не пересоздаются и сохраняют старый выданный вариант.

## Флаги: происхождение и лицензия

Локальные SVG 4:3 из [flag-icons, tag v7.5.0](https://github.com/lipis/flag-icons/tree/v7.5.0/flags/4x3): it, fr, at, gb, jp, kr, vn, th, de, pt, es, be, in, cn, ge, hu, ca, nl, us, se. Прямые исходники: `https://raw.githubusercontent.com/lipis/flag-icons/v7.5.0/flags/4x3/<id>.svg`.

Лицензия [MIT](https://github.com/lipis/flag-icons/blob/v7.5.0/LICENSE), Copyright (c) 2013 Panayiotis Lipiridis. Полный текст сохранён в `public/assets/olympiad/flags/LICENSE.txt`. Никаких emoji, CDN или внешних ссылок при работе олимпиады. SVG проходят проверку на script/foreignObject/внешние href и src. Подпись страны остаётся доступной текстом, флаг декоративный.

## Итоговая техническая и UX-проверка

- Браузерный plugin не доступен в этой сессии; использован установленный Chromium через Playwright. Локальный URL `http://127.0.0.1:5762`, изолированные синтетические участники, не production. Скриншоты и временные QA-скрипты вне репозитория.
- Desktop 1536×1024: все 5 заданий только настоящим drag-and-drop; повторный отдельный проход всех 5 только кликами. Mobile 390×844 с touch/coarse pointer: все 5 заданий только касаниями. В каждом проходе ровно 5 POST подтверждения и 20 сопоставлений; обычный поток без ошибок/предупреждений console и pageerror. На 320/360/375/390/430 px сетки по две колонки, нет горизонтального overflow, активные цели не меньше 44×44 px. После выбора блюда на телефоне панель стран находится в пределах viewport; ручной возврат прокруткой к странам не нужен.
- Визуально ясно, что выбрано (рамка + статус), какая страна занята (размещённая карточка + «Вернуть», на мобильной панели ещё и текст «Занято»), как исправить ответ (перенести снова / вернуть). Замещение явно возвращает прежнее блюдо в его слот; оно не исчезает. Hover не требуется. Справка раскрывается без потери ответа. Названия и кнопки читаются, изображения не обрезаны, длинные подписи переносятся. На мобильном экране первоначальная вертикальная прокрутка остаётся; шапка компактнее, повторное сопоставление доступно большим пальцем без прокрутки вверх-вниз.
- Проверены Tab/Enter/Space/Escape, возврат и отмена мобильного выбора, блокировка неполного подтверждения, ровно одна отправка при double-click, серверное продвижение, нейтральный переход «Тур 2 завершён · Ответы сохранены» без баллов. Форсированная 404 даёт «Фото недоступно» и доступное название, не мешает сопоставлению. Досрочное завершение сохраняет частичную карту. После reload intro не повторяется, таймер не сбрасывается. При недоступном localStorage intro имеет memory fallback в пределах открытой страницы; обещания сохранения между перезапусками нет. Чужой drag отвергается. Публичный ответ содержит только текущий вопрос без приватных ключей.
- Исправленные находки: глобальная защита ранее блокировала новые drag-карточки; разрешение ограничено текущим T2. На телефоне выбор страны требовал возврата прокруткой; добавлен фиксированный picker. Backdrop-filter родительской карточки нарушал привязку picker к viewport; отключён только на мобильной карточке T2. Скриншоты финального размещения сняты после завершения короткой анимации, не в промежуточном кадре.
- Сравнение с предварительным UI-концептом: сохранены светлая палитра/бирюзовый выбор, четыре страны над четырьмя фото на desktop, подсказка/справка, прогресс и нейтральное оценивание. Намеренные отличия: действующая шапка участника и оба защищённых таймера вместо выдуманной шапки концепта; реальные source-grounded фото вместо декоративных картинок концепта; перемешивание карточек/стран; штатная область кнопок слева; двухколоночная мобильная сетка с thumb picker.
- Автотесты: полный suite 140/140; focused scoring/variant/T2 22/22, 16 частичных масок и 24 полные перестановки на задание; 10 000 вариантов, ноль расхождений баллов и каждый T2 в 100% вариантов. Cloudflare build и local PM01 regression PASS. SQLite local rehearsal: 40 участников, 41 раунд, 1 804 запроса ответов с дубликатами, без ошибок. Git diff проверен. Все 20 WebP занимают суммарно 1 843 268 bytes.
- Это технически проверенный редакционный пакет, не заявление о полной независимой методической приёмке. Физические мобильные устройства, Safari и доступ из конкретных сетей РФ не проверены. Результаты тестов не разрешают выпуск официальных итогов без утверждения организатором. Публикация этой версии ещё не выполнена.
