# T2 «Кухни мира»: реестр источников и изображений

Источники и генерация: **2026-09-26**; итоговая проверка коррекции: **2026-09-26–27**. Частный редакционный документ; не включать в публичные participant payloads.

## Контракт

Пять фиксированных заданий по четыре взаимно-однозначные пары. Все участники получают одинаковые задания, порядок заданий, ключи и оценивание; порядок карточек и стран перемешивается. За правильную пару — 1 балл, за неверную/пустую — 0; частичный ответ допустим при досрочном завершении; максимум T2 — 20. Связь блюда с национальной кухней не означает исключительное авторство или отсутствие региональных версий. Фото помогает узнать уже названное блюдо, но состав/цвет/подача фото не являются отдельным ключом оценки.

Общий формат изображений: оригинальные AI-generated фотографии, 900×600 (3:2), WebP quality 84; нейтральные имена, без EXIF/XMP и промптов в публичных файлах. Фотографии источников не скачиваются и не копируются. Исходные генерации и браузерные QA-материалы находятся вне репозитория. Концепт интерфейса не служит кулинарным источником. Записи первоначального пакета ниже сохраняют историческую QA, а не разрешение использовать отклонённые блюда в текущем банке.

## Текущая коррекция узнаваемости · blueprint revision 5

Основание: реальное пользовательское прохождение 2026-09-26. **Узнаваемость для обычного русскоязычного студента 16–20 лет важнее количества стран.** Повтор страны между заданиями допустим; внутри каждого задания — четыре разные страны. Это редакционный фильтр здравого смысла, не статистически доказанная известность всех блюд.

| Задание | Активные пары в приватном исходном порядке | Номера изображений |
| --- | --- | --- |
| T2-01 | Тирамису → Италия; Рататуй → Франция; Венский шницель → Австрия; Фиш-энд-чипс → Великобритания | 01, 02, 03, 04 — без изменений |
| T2-02 | Онигири → Япония; Бибимбап → Республика Корея; Фо → Вьетнам; Пад-тай → Таиланд | 05, 06, 07, 08 — без изменений |
| T2-03 | Паштел-де-ната → Португалия; Гаспачо → Испания; Брюссельская вафля → Бельгия; Салат «Оливье» → Россия | 10, 11, 12, 21 |
| T2-04 | Эклер → Франция; Пекинская утка → Китай; Суп харчо → Грузия; Гуляш → Венгрия | 22, 14, 23, 16 |
| T2-05 | Крылышки баффало → США; Паста карбонара → Италия; Буррито → Мексика; Моти → Япония | 19, 24, 25, 26 |

T2-01/T2-02 полностью сохранены: изображения, пары, исходный порядок, баллы и источники. У T2-04 изменён только содержательный заголовок на «От Европы до Азии» после замены Индии Францией. Новые фото получили новые URL 21–26; старые 01–20 не перезаписаны, чтобы не менять выданные исторические варианты. Нет миграции попыток. Новые попытки получают revision 5. T2 остаётся 5×4, 20 баллов / 6 минут; олимпиада — 41 вопрос, 150 баллов / 45 минут. Банки T1/T3–T5 и UX не переделываются.

## Неактивные / отклонённые после пользовательского тестирования

| Блюдо / вариант | Прежний asset | Причина исключения из новых попыток |
| --- | --- | --- |
| Карривурст | 09 | Слишком низкая узнаваемость у целевой аудитории. |
| Баттер чикен | 13 | Слишком низкая узнаваемость у целевой аудитории. |
| Poutine | 17 | Название оказалось незнакомым при реальном прохождении. |
| Stroopwafel / Стропвафли | 18 | Название оказалось незнакомым при реальном прохождении. |
| Köttbullar / Кёттбуллар | 20 | Название оказалось незнакомым при реальном прохождении. |
| «Харчо», мегрельское ореховое мясное блюдо | 15 | Предыдущая ошибка: для генерации визуала выбрана не та разновидность kharcho; brief не отделял суп от густого мегрельского блюда. Участник воспринимал его как гуляш/тушёный фарш. Для нынешней карточки REJECT. |

Источники, первоначальные промпты и сами assets сохранены ниже для истории и неизменяемых старых попыток. Это не активный резерв для автоматического возврата в T2. Новая карточка называется **«Суп харчо»**; источник и визуал именно soup version. Критерии REJECT: рагу; не виден бульон; фарш/гуляш/ореховая паста. Старый visual source Mingrelian Walnut Kharcho не использовался для новой генерации.

## Первоначальный пакет revision 4: источники и полные промпты (история)

Все первоначальные двадцать изображений были созданы по прочитанному тексту первичных официальных источников и открыты по отдельности; после первой визуальной проверки повторной генерации не было. Последующее пользовательское прохождение выявило описанные выше содержательные и визуальные проблемы. Историческое PASS в записях 09/13/15/17/18/20 не отменяет нового решения об исключении.

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

Уточнения первоначального пакета ниже сохранены для истории; Стропвафли теперь неактивны.

- Фо: [21 must-try Vietnamese dishes — Vietnam Tourism](https://vietnam.travel/node/195): отдельно подтверждает плоскую рисовую лапшу и тонкую говядину; используется для уточнения, не для копирования фото.
- Стропвафли: [Dutch foods to try — I amsterdam](https://www.iamsterdam.com/en/see-and-do/restaurant-and-bars/dutch-foods-to-try): туристическая организация Amsterdam & Partners; две тонкие вафли с сиропной прослойкой.
- Гуляш: [Que doit-on savoir à propos de la cuisine hongroise? — Visit Hungary](https://visithungary.com/fr/article/que-doit-on-savoir-a-propos-de-la-cuisine-hongroise-2): различение гуляша-супа и пёркёльта.

## Первоначальное решение по матрице revision 4 (история, заменено коррекцией выше)

Ни одна из 20 пар пользователя не заменена. Для харчо выбран подтверждённый GNTA мегрельский ореховый вариант, не рисовый суп. Для Buffalo wings выбран опубликованный официальным порталом Нью-Йорка запечённый вариант. Для гуляша — суп, для рататуя — нарезанное рагу, для вафли — прямоугольная брюссельская разновидность. Эти уточнения не меняют ключи стран. Нет пересечений с активными блюдами T1 и семью зарезервированными блюдами будущего T5; это проверяется тестом. Старые сохранённые попытки не пересоздаются и сохраняют старый выданный вариант.

## Новые активные изображения revision 5: источник → brief → генерация → QA

Проверка текстов и генерация: 2026-09-26. Шесть отдельных успешных вызовов встроенного image generation, без reference-фото и image-to-image. Генерация распределена между помощниками согласно Creative Production; источники, окончательные brief, интеграция и индивидуальная визуальная приёмка выполнены основным агентом. Production-board не был доступен через требуемый skill прямой вызов; использованы штатные результаты image generation. Ни одна чужая фотография не скачана. Исходники 1536×1024; экспорт без изменения содержимого в 900×600 WebP quality 84, только ресайз/сжатие. Все шесть оригиналов и все шесть конечных WebP открыты глазами.

Внутренний тест без подписи: изображения не противоречат названиям; это проверка визуального соответствия, **не слепой эксперимент с реальными студентами** и не доказательство узнаваемости всей целевой аудиторией. Все шесть приняты с первой новой генерации. Суп харчо полностью создан заново относительно отвергнутого asset 15, но новая версия не потребовала дополнительного повтора после QA. У эклера композиция не буквально соблюдает просьбу оставить оба отрезанных конца: на тарелке одно целое изделие и один открытый срез. Это не меняет тип выпечки; принято как допустимая вариация подачи, не скрытая ошибка состава.

### 21 · T2-03 · Салат «Оливье» → Россия

- Dish ID: `olivier`.
- Основной первичный источник: [«Москва гастрономическая», меню русской кухни — mos.ru](https://www.mos.ru/upload/documents/oiv/moskva_gastronomicheskaya.pdf). Прочитан индексированный текст раздела: русское меню, Люсьен Оливье и ресторан «Эрмитаж» в Москве; современная упрощённая версия с мясом/курицей/колбасой, овощами и майонезом. Прямое открытие PDF исследовательским web-инструментом вернуло ошибку; самостоятельная сверка всего оригинального PDF не подтверждена.
- Дополнительный первичный авторский рецепт современной версии: [«Салат Оливье классический с колбасой» — Gastronom, Рита Пирко](https://www.gastronom.ru/recipe/amp/44760). Текст ингредиентов и приготовления прочитан полностью: картофель, морковь, варёная колбаса, яйца, солёный огурец, горошек, лук, майонез; небольшие кубики.
- Подтверждённые признаки → visual brief: миска обычного современного салата; кубики картофеля/моркови/колбасы/яйца/огурца, отдельные горошины, немного лука, умеренная майонезная связка. Не историческая версия XIX века, не ресторанная деконструкция, без рябчиков/икры/морепродуктов/кукурузы. Источник mos.ru подтверждает связь с российским меню, не исключительное авторство России.
- Узнаваемость: привычный салат в российских домашних застольях, столовых и магазинах; разумная редакционная вероятность знакомства с названием высокая, без заявления о статистическом охвате.
- Asset: `public/assets/olympiad/tour2/t2-active-21.webp`, 69 850 bytes; flag `ru.svg`.
- Генерация: `exec-32d2b2dd-7c8f-47e3-8395-08cf37a46ad4`.
- QA: PASS — мелкие кубики, видимый горошек и майонез, цельная миска, без географических подсказок/текста; без подписи выглядит как выбранная современная версия салата. Повтор после QA: нет.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for an educational named-dish card, landscape 3:2. Light neutral stone table, unbranded simple ivory ceramic salad bowl, soft natural side window light, 40 degree camera angle, centered whole bowl, close enough to read at thumbnail size. Natural edible textures, not illustration or plastic. Subject: familiar modern Russian Olivier salad, small even cubes of boiled potato, carrot, cooked sausage, hard-boiled egg and pickled cucumber, whole green peas and a little finely chopped onion, lightly bound with mayonnaise so individual pieces remain visible. Neat generous mound in the bowl, no decorative deconstruction. No historical game birds, caviar, seafood, corn, lettuce leaves, garnish, other foods, utensils, people, hands, text, logos, watermark, packaging, flags or country clues. Do not copy a source photograph.
```

### 22 · T2-04 · Эклер → Франция

- Dish ID: `eclair`.
- Основной первичный источник: [«Les meilleurs desserts et pâtisseries à goûter en France» — France.fr](https://www.france.fr/fr/article/patisserie-francaise/). Прочитан раздел про éclair в пятёрке классических изделий: вытянутое заварное тесто, начинка, глазурь. Именно французская страница; англоязычный вариант не использовался вместо отсутствующего там раздела.
- Дополнительная проверка формы/начинки: [Dark Chocolate Eclairs — King Arthur Baking](https://www.kingarthurbaking.com/recipes/dark-chocolate-eclairs-recipe). Прочитаны текст рецепта и пояснение о классическом ванильном кондитерском креме; продолговатые заварные оболочки с начинкой и шоколадом.
- Признаки → visual brief: золотистое продолговатое заварное изделие, светлый ванильный крем, тёмная шоколадная глазурь; два изделия/части, один срез. Без фантазийного цвета, пончиков, фруктов, Парижа/надписей/флагов.
- Узнаваемость: обычная кондитерская выпечка российских магазинов и кафе; название не требует знания редкой региональной кухни.
- Asset: `public/assets/olympiad/tour2/t2-active-22.webp`, 54 920 bytes; существующий flag `fr.svg`.
- Генерация: `exec-4f61797d-aaf4-466b-9433-cd72993756dd`.
- QA: PASS — вытянутые заварные эклеры, крем виден в срезе, шоколадная глазурь, не пончик; композиционная оговорка описана выше. Повтор после QA: нет.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for an educational named-dish card, landscape 3:2. Light neutral stone table, unbranded simple ivory ceramic plate, soft natural side window light, 40 degree camera angle, centered entire plate, close enough to read at thumbnail size. Natural edible textures, not illustration or plastic. Subject: two classic elongated eclairs with golden baked choux pastry, filled with pale vanilla pastry cream and topped with a smooth dark chocolate glaze. One is whole; the other has a clean crosswise cut that exposes the cream-filled choux shell, with both pieces beside each other. Modest contemporary pastry presentation. Clearly long choux pastries, not round doughnuts, not a layered cake. No fantasy colors, sprinkles, fruit, piped external cream, fancy deconstruction, extra food, utensils, people, hands, text, Paris landmarks, logos, watermark, packaging, flags or country clues. Do not copy a source photograph.
```

### 23 · T2-04 · Суп харчо → Грузия

- Dish ID: `kharcho` (стабильный private ID; подпись изменена с «Харчо» на «Суп харчо»).
- Активный visual source: [«Суп харчо из говядины с рисом» — Gastronom](https://www.gastronom.ru/recipe/4632/sup-harcho-iz-govjadiny-s-risom). Прочитаны ингредиенты и приготовление именно супа: говядина/бульон, рис, лук, томатная паста, молотый орех как компонент, чеснок, пряности, кинза/базилик, кислая составляющая. Не Mingrelian Walnut Kharcho. Ссылка страницы на «Коллекцию рецептов» №1 (09), 2007 отмечена, но отдельный бумажный журнал не проверен.
- Классическая дополнительная сверка: [В. В. Похлёбкин, «Национальные кухни наших народов», 1983, раздел «Харчо» — текстовая публикация](https://sheba.spb.ru/za/nacional-narod-1983.htm). Прочитан соответствующий раздел электронной транскрипции: суп на говядине с рисом, орехом, кислой основой и зеленью; допустим томатный вариант. Это сверка текста печатной рецептуры, не осмотр скана оригинальной страницы.
- Признаки → visual brief: глубокая миска, красновато-коричневый жидкий бульон с просветами между ингредиентами, различимые рис и кусочки говядины, немного зелени; лук/молотый орех рассредоточены, а не ореховая паста. Не гуща из фарша, не гуляш и не тушёное мясо без жидкости.
- Узнаваемость: знакомое русскоязычной аудитории название супа; точная подпись снижает неоднозначность по сравнению с общим «Харчо». Связь с грузинской кухней не является заявлением об исключительном происхождении каждой версии.
- Asset: `public/assets/olympiad/tour2/t2-active-23.webp`, 93 886 bytes. Старый `t2-active-15.webp` не используется в новых T2, оставлен только для неизменяемых старых попыток.
- Генерация: `exec-0c74b88b-bf03-4fc4-9b70-ad0a35c602e2` — полная новая генерация, не редактирование отвергнутого фото.
- QA: PASS — жидкий бульон хорошо виден, рис отдельными зёрнами и натуральные кусочки говядины, глубокая миска, без вида фарша/пасты/рагу. Критические REJECT-условия проверены глазами на оригинале и WebP. Повтор после новой QA: нет.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for an educational named-dish card, landscape 3:2. Light neutral stone table, unbranded simple ivory deep ceramic soup bowl, soft natural side window light, 55 degree camera angle, entire bowl centered and visible, close enough to read at thumbnail size. Subject: kharcho SOUP made with beef and rice, the soup version, not Mingrelian walnut stew. A deep bowl full of reddish-brown beef broth with clearly visible liquid pools between ingredients, several naturally irregular cooked beef chunks, individual cooked white rice grains visible in the broth, a modest sprinkling of chopped cilantro and basil. Tomato paste gives a moderate warm red-brown tint; ground walnut and onion are dispersed seasoning, never a nut paste. The liquid broth must visually dominate and look unmistakably like spoonable soup even at small card size. Natural appetizing soup texture. Reject a stew, goulash, mince, meat sauce, dry beef, porridge, or thick paste appearance. No potatoes, carrot, sour cream, whole nuts, decorative garnish, extra foods, utensils, people, hands, text, logos, watermark, packaging, flags or country clues. Do not copy a source photograph.
```

### 24 · T2-05 · Паста карбонара → Италия

- Dish ID: `carbonara`.
- Основной первичный источник: [Pasta types: Italian formats and recipes — Italia.it](https://www.italia.it/en/italy/things-to-do/pasta-types-italian-formats-and-recipes). Прочитан раздел spaghetti/carbonara: Лацио, яйца, пекорино и гуанчале. Сторонние исторические утверждения страницы, не относящиеся к нашему блюду, не используются.
- Дополнительный первичный рецепт: [Spaghetti alla carbonara — Barilla](https://www.barilla.com/it-it/ricette/tutte/spaghetti-alla-carbonara). Прочитаны ингредиенты и приготовление: желток, пекорино, гуанчале, чёрный перец, вода от пасты; эмульсия без сливок, смешивание не превращает яйцо в омлет.
- Признаки → visual brief: отдельные нити спагетти, тонкое шелковистое желтоватое покрытие яйцо/сыр, подрумяненные мясные кусочки с жировыми слоями, немного тёртого сыра/перца. Без белой лужи сливок, грибов/помидоров/зелени/яйца сверху.
- Узнаваемость: распространённое название пасты в городских кафе/доставке; «Паста» в подписи помогает участнику, не знакомому с составом рецепта.
- Asset: `public/assets/olympiad/tour2/t2-active-24.webp`, 100 960 bytes; существующий flag `it.svg`.
- Генерация: `exec-d3564262-c7fc-4cb9-863c-fe85f79fb73e`.
- QA: PASS — спагетти с тонкой эмульсией, мясо, сыр и чёрный перец; не паста, залитая белыми сливками. Повтор после QA: нет.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for an educational named-dish card, landscape 3:2. Light neutral stone table, unbranded simple ivory ceramic pasta plate, soft natural side window light, 40 degree camera angle, entire plate centered and visible, close enough to read at thumbnail size. Subject: classic spaghetti carbonara, long distinct spaghetti strands lightly coated in a glossy warm pale-gold egg-and-pecorino emulsion, with browned guanciale pieces showing natural lean-and-fat layers, a small amount of finely grated pecorino and visible black pepper flecks. Natural casually twirled mound, appetizing edible texture. The sauce is a thin silky coating on individual strands, not a pool or blanket of white liquid cream. No cream sauce, milk, Alfredo appearance, mushrooms, tomatoes, herbs, basil, fried egg or raw egg yolk on top, other foods, utensils, people, hands, text, logos, watermark, packaging, flags or country clues. Do not copy a source photograph.
```

### 25 · T2-05 · Буррито → Мексика

- Dish ID: `burrito`.
- Основной первичный источник: [Gastronomía — Portal Gubernamental del Estado de Chihuahua](https://chihuahua.gob.mx/info/gastronomia). Прочитан текст раздела портала: burritos среди типичных блюд Чиуауа; мучная тортилья и начинки, включая говядину/свинину, фасоль, чили и сыр. В нашей версии выбраны говядина и фасоль; остальные перечисленные варианты не навязываются каждому буррито.
- Признаки → visual brief: большая мягкая мучная тортилья, закрытая вокруг мяса/фасоли с подвёрнутыми концами, разрез на две половины показывает начинку. Не открытое тако и не твёрдая тако-ракушка; без неподтверждённых гарниров/рисовой начинки.
- Узнаваемость: меню мексиканской/fast-casual кухни, доставка и массовая культура; у части аудитории знакомство может быть хуже, чем у Оливье/эклера — требует следующего реального пилота, а не обещания универсальной известности.
- Asset: `public/assets/olympiad/tour2/t2-active-25.webp`, 76 562 bytes; новый flag `mx.svg`.
- Генерация: `exec-ab84565f-b334-406a-8750-38760283481d`.
- QA: PASS — закрытая мучная оболочка, два среза, говядина и фасоль; не открытая тортилья/тако. Повтор после QA: нет.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for an educational named-dish card, landscape 3:2. Light neutral stone table, unbranded simple ivory ceramic plate, soft natural side window light, 40 degree camera angle, entire plate centered and visible, close enough to read at thumbnail size. Subject: one generously filled burrito, a large soft flour tortilla with natural toasted brown spots rolled into a closed thick cylinder with tucked ends around a filling of tender cooked beef and beans. Cut the burrito cleanly across into two substantial halves, one cross-section facing the camera, with recognizable beef and beans inside and a continuous wrapped tortilla surrounding the filling. Neat casual modern food presentation, natural edible textures. Not an open wrap, not an open taco, not a hard taco shell, not a burger or sandwich. No rice, lettuce, corn, grated cheese, salsa bowl, additional foods, utensils, people, hands, text, logos, watermark, packaging, flags or country clues. Do not copy a source photograph.
```

### 26 · T2-05 · Моти → Япония

- Dish ID: `mochi`.
- Основной первичный источник: [Japanese desserts to try — JNTO](https://www.japan.travel/en/blog/japanese-desserts-to-try/). Прочитан раздел mochi/daifuku: мягкое изделие из клейкого риса; возможны анко и клубника. Дополнение: [Auspicious, nutritious and delicious — JNTO](https://www.japan.travel/en/gastronomy/article-auspicious-nutritious-and-delicious/) — прочитан текст о steamed/pounded mochigome и мягкой эластичной текстуре.
- Выбранная разновидность до генерации: **ichigo daifuku**, десертные моти с пастой адзуки и клубникой. Подпись участнику — общее «Моти», не утверждение, что все моти имеют эту начинку.
- Признаки → visual brief: мягкие округлые рисовые пирожные с матовой крахмальной поверхностью, естественные белый/нежно-розовый оттенки, два целых и разрез третьего; рисовая оболочка вокруг анко/клубники. Не макароны, данго на шпажке, пончики или шарики мороженого; без аниме/иероглифов/палочек.
- Узнаваемость: современные десертные моти встречаются в магазинах/доставке и молодёжной гастрономической культуре; без количественного заявления об охвате. Возможны различия между населёнными пунктами.
- Asset: `public/assets/olympiad/tour2/t2-active-26.webp`, 57 230 bytes; существующий flag `jp.svg`.
- Генерация: `exec-f3a60117-3893-47d5-8671-04dc28ecef3c`.
- QA: PASS — мягкая рисовая оболочка, матовая поверхность, видимая паста адзуки/клубника в разрезе; не макарон/мороженое. Повтор после QA: нет.

```text
Use case: photorealistic-natural. Create ONE original professional food photograph for an educational named-dish card, landscape 3:2. Light neutral stone table, unbranded simple ivory ceramic dessert plate, soft natural side window light, 40 degree camera angle, entire plate centered and visible, close enough to read at thumbnail size. Subject: three soft round dessert mochi in the daifuku style, made of smooth chewy glutinous-rice dough, gently flattened round shapes with a fine matte starch dusting. Natural ivory-white and very pale pink colors. Two are whole; the third is cut neatly into two halves to reveal a thin soft rice-dough skin surrounding dark red sweet azuki bean paste and a fresh strawberry center. Both cut halves stay on the plate. Modest contemporary dessert presentation, realistic pliable dough, not plastic perfect spheres. No macaron shells, layered biscuits, doughnut holes, skewered dango, ice cream scoops, glaze, sprinkles, anime, sticks, chopsticks, additional foods, people, hands, text, Japanese characters, logos, watermark, packaging, flags or country clues. Do not copy a source photograph.
```

## Коррекция revision 5: проверка и ограничения

Новые фото приняты индивидуально на уровне оригиналов, оптимизированных WebP и реальных карточек браузера; источник → признаки → brief → точный фактически переданный prompt записаны выше. Шесть новых WebP — 453 408 bytes, двадцать текущих активных фото — 1 741 136 bytes. Все 20 прежних файлов и SVG сохранены без перезаписи. Нейтральные filenames, отсутствие EXIF/XMP и локальность флагов проверены тестами. Коррекция подготовлена локально; новая публикация не выполнялась и без отдельного запроса не запускается.

Проверяемый поток: главная → синтетическая регистрация → существующий T1 → вступление T2 → все пять заданий с настоящим drag / кликами / касаниями → нейтральное подтверждение завершения. Следующий тур не дорабатывался; проверен лишь уже существующий переход.

| Проверка текущей коррекции | Результат |
| --- | --- |
| Полный `npm.cmd test` | 141/141 PASS |
| Focused scoring/variant/T2 | 23/23 PASS; все 16 частичных масок и 24 полные перестановки каждого задания |
| `npm.cmd run build:cloudflare` | PASS |
| `npm.cmd run audit:variants` | 10 000 вариантов, ноль расхождений баллов; каждое T2 в 100% вариантов |
| `npm.cmd run verify:pm01 -- http://127.0.0.1:5762` | PASS; PM01 не изменён, 100 баллов, пять вариантов/модулей, закрытых ключей в public exam нет |
| Браузер: page identity / не пустая страница / отсутствие error overlay | PASS; действующий локальный сайт «Национальные кухни мира» |
| Console/pageerror, обычный поток | PASS; 0 ошибок и предупреждений во всех трёх проходах |
| Drag-only / click-only / touch-only | Каждый проход: 5 заданий, 20 сопоставлений, ровно 5 POST ответов; подтверждённые серверные переходы |
| Сохранённые ответы синтетических попыток | Три полных T2: [4,4,4,4,4], по 20 баллов, revision 5; сверены сохранённые баллы и независимый пересчёт |
| Viewport 390×844 | Все 5 заданий пройдены; названия не обрезаны, 4 фото/4 флага каждого задания загружены; новые шесть фото проверены глазами в небольших карточках |
| Mobile 320/360/375/390/430 | T2-01: две колонки, нет горизонтального overflow, активные цели ≥44×44; все задания проверены на 390 |
| Keyboard / замещение / возврат / справка / picker cancel / double-click | PASS; состояние ответа не теряется, дубликата подтверждения нет |
| Ошибка фото / reload / storage denial / чужой drag / досрочное завершение | PASS; текстовый fallback, вступление не повторяется, таймер не сбрасывается, memory fallback, отказ чужому drag, частичный ответ сохранён |
| Privacy | Unit-проверка participant payload всех пяти T2 на 100 seeds плюс 14 реально полученных current-question payloads без закрытых ключей/всего variant |
| Неизменность области вне правок | SHA-256 T2-01/02, их восьми фото и банков T1/T3–T5 совпадают с baseline; renderer, app, CSS и правила не изменены |

Среда: установленный Chromium/Chrome через Playwright, desktop 1536×1024 (edge 1440×1000), touch-emulated 390×844; URL `http://127.0.0.1:5762`. **Browser plugin not available** — выбран разрешённый skill fallback обычного Playwright. Изолированный file backend, только вымышленные QA-участники; production D1/участники/ответы не трогались. Скриншоты, DOM snapshots и временные сценарии: `C:/Users/АМ/AppData/Local/Temp/olympiad-t2-content-qa/`, вне репозитория. Физический телефон/iOS/Safari и доступ из конкретных сетей РФ не проверены. Принудительные 404 в edge-тесте ожидаемо записаны отдельно, не маскируются как обычный здоровый поток. Реальный студенческий пилот и независимая методическая приёмка не заменяются этими проверками.

Оставшийся риск сложности: **Бибимбап**, короткое название **Фо**, **Паштел-де-ната** могут оставаться недостаточно знакомыми обычному студенту. T2-01/T2-02 и Паштел-де-ната сохранены по прямому требованию пользователя. Не менять их тайно и не утверждать, что новая матрица прошла педагогическую приёмку реальной группой; нужны следующий пользовательский пилот и решение организатора. До следующего тура разработка не расширяется.

## Флаги: происхождение и лицензия

Локальные SVG 4:3 из [flag-icons, tag v7.5.0](https://github.com/lipis/flag-icons/tree/v7.5.0/flags/4x3): первоначальные it, fr, at, gb, jp, kr, vn, th, de, pt, es, be, in, cn, ge, hu, ca, nl, us, se сохранены; для revision 5 добавлены ru и mx из того же тега. Прямые исходники: `https://raw.githubusercontent.com/lipis/flag-icons/v7.5.0/flags/4x3/<id>.svg`.

Лицензия [MIT](https://github.com/lipis/flag-icons/blob/v7.5.0/LICENSE), Copyright (c) 2013 Panayiotis Lipiridis. Полный текст сохранён в `public/assets/olympiad/flags/LICENSE.txt`. Никаких emoji, CDN или внешних ссылок при работе олимпиады. SVG проходят проверку на script/foreignObject/внешние href и src. Подпись страны остаётся доступной текстом, флаг декоративный.

## Техническая и UX-проверка первоначальной revision 4 (история)

- Браузерный plugin не доступен в этой сессии; использован установленный Chromium через Playwright. Локальный URL `http://127.0.0.1:5762`, изолированные синтетические участники, не production. Скриншоты и временные QA-скрипты вне репозитория.
- Desktop 1536×1024: все 5 заданий только настоящим drag-and-drop; повторный отдельный проход всех 5 только кликами. Mobile 390×844 с touch/coarse pointer: все 5 заданий только касаниями. В каждом проходе ровно 5 POST подтверждения и 20 сопоставлений; обычный поток без ошибок/предупреждений console и pageerror. На 320/360/375/390/430 px сетки по две колонки, нет горизонтального overflow, активные цели не меньше 44×44 px. После выбора блюда на телефоне панель стран находится в пределах viewport; ручной возврат прокруткой к странам не нужен.
- Визуально ясно, что выбрано (рамка + статус), какая страна занята (размещённая карточка + «Вернуть», на мобильной панели ещё и текст «Занято»), как исправить ответ (перенести снова / вернуть). Замещение явно возвращает прежнее блюдо в его слот; оно не исчезает. Hover не требуется. Справка раскрывается без потери ответа. Названия и кнопки читаются, изображения не обрезаны, длинные подписи переносятся. На мобильном экране первоначальная вертикальная прокрутка остаётся; шапка компактнее, повторное сопоставление доступно большим пальцем без прокрутки вверх-вниз.
- Проверены Tab/Enter/Space/Escape, возврат и отмена мобильного выбора, блокировка неполного подтверждения, ровно одна отправка при double-click, серверное продвижение, нейтральный переход «Тур 2 завершён · Ответы сохранены» без баллов. Форсированная 404 даёт «Фото недоступно» и доступное название, не мешает сопоставлению. Досрочное завершение сохраняет частичную карту. После reload intro не повторяется, таймер не сбрасывается. При недоступном localStorage intro имеет memory fallback в пределах открытой страницы; обещания сохранения между перезапусками нет. Чужой drag отвергается. Публичный ответ содержит только текущий вопрос без приватных ключей.
- Исправленные находки: глобальная защита ранее блокировала новые drag-карточки; разрешение ограничено текущим T2. На телефоне выбор страны требовал возврата прокруткой; добавлен фиксированный picker. Backdrop-filter родительской карточки нарушал привязку picker к viewport; отключён только на мобильной карточке T2. Скриншоты финального размещения сняты после завершения короткой анимации, не в промежуточном кадре.
- Сравнение с предварительным UI-концептом: сохранены светлая палитра/бирюзовый выбор, четыре страны над четырьмя фото на desktop, подсказка/справка, прогресс и нейтральное оценивание. Намеренные отличия: действующая шапка участника и оба защищённых таймера вместо выдуманной шапки концепта; реальные source-grounded фото вместо декоративных картинок концепта; перемешивание карточек/стран; штатная область кнопок слева; двухколоночная мобильная сетка с thumb picker.
- Автотесты: полный suite 140/140; focused scoring/variant/T2 22/22, 16 частичных масок и 24 полные перестановки на задание; 10 000 вариантов, ноль расхождений баллов и каждый T2 в 100% вариантов. Cloudflare build и local PM01 regression PASS. SQLite local rehearsal: 40 участников, 41 раунд, 1 804 запроса ответов с дубликатами, без ошибок. Git diff проверен. Все 20 WebP занимают суммарно 1 843 268 bytes.
- Это технически проверенный редакционный пакет, не заявление о полной независимой методической приёмке. Физические мобильные устройства, Safari и доступ из конкретных сетей РФ не проверены. Результаты тестов не разрешают выпуск официальных итогов без утверждения организатором.
- Опубликовано по отдельному запросу пользователя 2026-09-26: commit `a0acc70`, успешный Cloudflare deployment run `36268917496`, основной сайт `https://olympiad-gkts.pages.dev`. После публикации все 20 фото и 20 SVG-флагов вернули HTTP 200 с точным совпадением SHA-256; app/controller/CSS/service worker соответствуют релизу, главная показывает 41 задание. Public API сохраняет 150 баллов / 45 минут и T2 20 баллов / 6 минут. Штатный `verify:cloudflare` прошёл напрямую без HTTP shim. На production проверены только чтение и навигация главной страницы (desktop 1536×1024, touch-emulated mobile 390×844): правила раскрываются, регистрация фокусирует поле ФИО, нет console/pageerror и горизонтального overflow. Реальные участники не создавались, записи попыток/ответов не изменялись. Новый T2 выдаётся новым попыткам; сохранённые варианты остаются прежними.
