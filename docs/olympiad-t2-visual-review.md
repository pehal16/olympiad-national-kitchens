# Тур 2 — полный визуальный пересмотр всех 20 изображений

Дата проверки: 2026-09-27. Blueprint revision 6. **Подготовлено локально; не опубликовано.**

## Объём и границы

По прямой просьбе пользователя просмотрены исходные двадцать активных изображений, первичные рецепты/туристические источники и реальные фотографии каждого блюда. Затем отредактированы собственные ранее сгенерированные изображения: все двадцать новых исходников и итоговых WebP открыты индивидуально основным агентом, а изображения повторно проверены в карточках действующего интерфейса. Старые ограничения на сохранение фотографий T2-01/T2-02 сняты именно этой новой просьбой, не расширением задачи по инициативе агента.

Это фотореалистичные **AI-иллюстрации**, не документальные фотографии приготовленных блюд. У блюд существуют региональные и семейные варианты; проверен конкретный выбранный подтип. Источники для внешнего вида не доказывают исключительное происхождение из одной страны. Тексты, названия, страны, приватные ключи, порядок пяти заданий, 20 баллов и 6 минут не изменены; другие туры, PM01, интерфейс и реальные попытки не менялись.

Использован режим редактирования ImageGen с единственным собственным старым изображением в качестве входа, один результат на блюдо. Сторонние фотографии только просмотрены в браузере для фактологической сверки; они не скачаны для повторной публикации, не скопированы и не поданы генератору. Creative Production задал поштучный контроль идентичности/фактуры и параллельную обработку. Его панель сравнения недоступна в данном наборе прямых инструментов: вместо неё использованы индивидуальные просмотры и реальные скриншоты карточек, без имитации публикации в панели.

Новые файлы `t2-active-27.webp` … `46.webp`: 900×600, WebP quality 84, нейтральные имена, без EXIF/XMP/промптов в публичных метаданных. Исторические 01–26 сохранены без изменения байтов для уже выданных вариантов. Полные исходные промпты и прежняя история остаются в [исходном реестре](olympiad-t2-source-register.md); ниже записаны **точные фактически отправленные промпты редактирования**, не восстановленные описания.

## Текущие файлы

| Задание | Блюдо | Страна (прежний ключ) | Старый файл | Новый файл |
|---|---|---|---|---|
| T2-01 | Тирамису | IT | 01 | 27 |
| T2-01 | Рататуй | FR | 02 | 28 |
| T2-01 | Венский шницель | AT | 03 | 29 |
| T2-01 | Fish and chips | GB | 04 | 30 |
| T2-02 | Онигири | JP | 05 | 31 |
| T2-02 | Бибимбап | KR | 06 | 32 |
| T2-02 | Фо | VN | 07 | 33 |
| T2-02 | Пад-тай | TH | 08 | 34 |
| T2-03 | Паштел-де-ната | PT | 10 | 35 |
| T2-03 | Гаспачо | ES | 11 | 36 |
| T2-03 | Брюссельская вафля | BE | 12 | 37 |
| T2-03 | Салат «Оливье» | RU | 21 | 38 |
| T2-04 | Эклер | FR | 22 | 39 |
| T2-04 | Пекинская утка | CN | 14 | 40 |
| T2-04 | Суп харчо | GE | 23 | 41 |
| T2-04 | Гуляш | HU | 16 | 42 |
| T2-05 | Крылышки баффало | US | 19 | 43 |
| T2-05 | Паста карбонара | IT | 24 | 44 |
| T2-05 | Буррито | MX | 25 | 45 |
| T2-05 | Моти | JP | 26 | 46 |

## Проверка каждого блюда и точные промпты

Ссылки ниже — прочитанные источники и фактически просмотренная фотография. Недоступность отдельных ресурсов и отличие вспомогательной фотографии от выбранной рецептуры указаны явно. Скриншоты источников, исходные PNG и технические QA-файлы сохранены вне репозитория; персональные пути не включены в редакционный реестр. Реестр не включать в participant payloads.

### 27 — Тирамису

- Собственный исходник: `t2-active-01.webp`; новый: `t2-active-27.webp`.
- Источники: [источник 1](https://scultura.veneto.eu/veneto-qualita-dettaglio?lang=it&uuid=6088f7f6-4ea0-4dd8-884f-d085c14b00c2), [источник 2](https://www.giallozafferano.com/recipes/Tiramisu.html).
- Фактически просмотрено: [реальная фотография](https://www.giallozafferano.com/images/260-26067/Tiramisu_780x520_wm.jpg); снимок проверки `worker7-tiramisu-reference.png`.
- Исправление и визуальная проверка: Убрана жёсткая «бисквитная» геометрия; сохранены два слоя пропитанных савоярди, мягкий крем маскарпоне и какао. Проверены неровный влажный срез и отсутствие лишнего декора.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Edit only the supplied original tiramisu food photograph into a more natural photorealistic serving, not a new recipe. Keep its neutral light stone table, unbranded off-white ceramic plate, landscape 3:2 composition and soft daylight. Keep one rectangular portion of tiramisu with two layers of coffee-soaked savoiardi ladyfingers, pale mascarpone cream made with egg yolks and sugar, and fine cocoa dusting. Make the cut faces slightly yielding and spoon-soft, with recognizable irregular biscuit cross-sections and moist coffee soaking, gently imperfect mascarpone edges and natural cocoa fall; remove the overly straight cake-like block and rigid stripe appearance. The whole portion and plate must be visible, food occupying most of the frame. Real cooked edible texture, modest tasteful serving, not melting into a puddle. Do not add sponge cake, chocolate cake, extra biscuit layers, berries, mint, chocolate shards, utensils, hands, extra dishes, flags, national props, text, logos or watermark. Do not copy any source photograph.
```

### 28 — Рататуй

- Собственный исходник: `t2-active-02.webp`; новый: `t2-active-28.webp`.
- Источники: [источник 1](https://www.france.fr/en/article/taste-provence-this-weekend-and-make-a-ratatouille/), [источник 2](https://www.meilleurduchef.com/fr/recette/ratatouille-nicoise.html).
- Фактически просмотрено: [реальная фотография](https://files.meilleurduchef.com/mdc/photo/recette/ratatouille-nicoise/ratatouille-nicoise-640.jpg); снимок проверки `worker7-ratatouille-reference.png`.
- Исправление и визуальная проверка: Смягчены тушёные овощи и их кожица, сделана менее одинаковая нарезка. Сохранён рубленый рататуй, а не спиральный тьян/confit byaldi.
- Ограничение/выбор варианта: France.fr подтверждает состав рубленого рататуя, но его спиральная главная иллюстрация не использована как образец выбранной подачи; просмотрена фотография рубленого блюда шефа Филиппа.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Edit the supplied original ratatouille food photograph to make the vegetables more honestly cooked and naturally served, without changing its recipe. Keep neutral light stone table, unbranded off-white shallow ceramic bowl, landscape 3:2 and soft natural daylight. Show rustic CHOPPED ratatouille: irregular bite-size pieces of aubergine, courgette, red pepper, softened tomato and translucent onion cooked together in light olive oil and tomato juices. Reduce the large block-like grilled vegetables into naturally varied smaller spoon-size pieces with softened slightly wrinkled skins, tender collapsed edges, moist cooked flesh and gentle sauce clinging between them. Keep vegetable identities discernible; not raw salad, not black-charred roasted cubes, not a puree. Retain only a very modest scattered amount of small basil pieces, remove decorative herb branches and fabric from the background. Do not arrange circular slices, a spiral, tian or confit byaldi. Entire bowl visible, food large and clear at thumbnail size, realistic imperfect edible textures. No utensils, hands, extra dishes, flags, country props, text, logos or watermark. Do not copy a source photograph.
```

### 29 — Венский шницель

- Собственный исходник: `t2-active-03.webp`; новый: `t2-active-29.webp`.
- Источники: [источник 1](https://www.austria.info/en-us/recipes/wiener-schnitzel/).
- Фактически просмотрено: [реальная фотография](https://fuutazbsb.filerobot.com/1fidu6qj7Fzmn3nbgjo58p2mC_sZWY3MjFhZGVkNjAwZDll/Wiener-Schnitzel-c8626998-8038-4677-a4ad-b00a67750537?func=crop&gravity=center&h=576&q=75&w=1728); снимок проверки `worker7-schnitzel-reference.png`.
- Исправление и визуальная проверка: Сохранена тонкая широкая отбивная; панировка стала воздушнее, неровнее и менее одинаковой по цвету. Это не наггетс и не рыба в кляре.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Refine the supplied original Wiener Schnitzel food photograph into a natural photorealistic serving of the SAME dish. Keep neutral light stone table, unbranded off-white ceramic plate, landscape 3:2, soft natural daylight, one large irregular veal escalope and the two lemon slices. Change only the schnitzel texture and proportions: visibly thinner pounded meat with an uneven softly waved perimeter; loose finely crumbed golden breading with natural raised souffle blisters, folds and delicate small air pockets rather than a uniformly thick crunchy slab. Real freshly pan-fried crumb with subtle golden color variation, not coarse artificial nugget crumbs, not smooth fish batter, not dry burnt edges. Entire plate and schnitzel visible, food occupying most of frame. Maintain recognizable Wiener Schnitzel silhouette, do not add potatoes, salad, gravy, cheese, bone, extra dishes, cutlery, hands, text, logos, watermark, flags or country clues. Do not copy a source photograph.
```

### 30 — Fish and chips

- Собственный исходник: `t2-active-04.webp`; новый: `t2-active-30.webp`.
- Источники: [источник 1](https://www.visitbritain.com/en/things-to-do/eat-local-foodie-map-britain), [источник 2](https://colmansfishandchips.co.uk/), [источник 3](https://colmansfishandchips.co.uk/gallery/).
- Фактически просмотрено: [реальная фотография](https://colmansfishandchips.co.uk/wp-content/uploads/2020/05/seafish-207-300x197.jpg); снимок проверки `worker7-fish-real-reference.png`.
- Исправление и визуальная проверка: Треугольные картофельные дольки заменены прямыми толстыми брусками; у цельного филе добавлена естественная пузырчатая, складчатая корочка кляра.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Edit the supplied original fish and chips food photograph to correct the potato cut and make the fish batter authentically natural. Keep the same neutral light stone table, unbranded off-white ceramic plate, landscape 3:2, soft natural daylight and simple two-food serving. Show ONE elongated whole fried white-fish fillet with irregular craggy golden batter, natural small bubbles, folded crunchy ridges and slight color variation, not breadcrumbs, not a uniform smooth orange slab. Replace ALL triangular potato wedges with proper straight thick-cut fried chips: peeled rectangular potato batons of irregular hand-cut lengths, squarish cross-sections, natural pale-golden faces and browned ends. No triangular wedges and no skin-on crescent wedges. The fillet and chips must be easy to distinguish. Entire plate and food visible, food occupying most of the frame, realistic imperfect fresh fried texture. Do not add newspaper, sauce, peas, lemon, garnish, extra dishes, utensils, hands, text, logos, watermark, flags or country props. Do not copy a source photograph.
```

### 31 — Онигири

- Собственный исходник: `t2-active-05.webp`; новый: `t2-active-31.webp`.
- Источники: [источник 1](https://www.japan.travel/en/japan-magazine/2002_konbini/), [источник 2](https://www.justonecookbook.com/onigiri-rice-balls/).
- Фактически просмотрено: [реальная фотография](https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2023/09/Onigiri-Japanese-Rice-Balls-2071-I-2-800x534.jpg); снимок проверки `worker7-onigiri-reference.png`.
- Исправление и визуальная проверка: Уточнён треугольный силуэт трёх рисовых форм, уменьшена площадь нори. Различимы короткие приготовленные рисовые зёрна; начинка закрыта.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Edit the supplied original onigiri photograph to correct the rice-ball silhouette and natural rice texture, keeping the SAME simple dish and setting. Keep three white rice onigiri, neutral light stone table, unbranded off-white ceramic plate, landscape 3:2 and soft daylight. Reshape each rice ball into a clearly recognizable thick hand-formed TRIANGLE with three rounded corners, flattened front and back faces, substantial thickness, softly imperfect sides and a stable broad base; not a round dome, not a tall cone, not a sphere, not sushi nigiri. Make individual small short-grain cooked rice grains legible and gently compacted with natural slightly sticky texture, not huge pearl-like grains or a homogeneous white lump. Reduce the dry dark nori to a modest rectangular wrap centered over the lower portion and bottom, leaving most of the triangular rice face and sides visible. Keep fillings enclosed and not visible. Entire plate and all three onigiri visible, subject large enough for an educational thumbnail. No sesame, fillings on top, fish topping, sauce, garnish, skewers, chopsticks, extra dishes, hands, text, logos, watermark, flags or country props. Do not copy a source photograph.
```

### 32 — Бибимбап

- Собственный исходник: `t2-active-06.webp`; новый: `t2-active-32.webp`.
- Источники: [источник 1](https://english.visitkorea.or.kr/svc/contents/contentsView.do?menuSn=904&vcontsId=221301).
- Фактически просмотрено: [реальная фотография](https://english.visitkorea.or.kr/public/images/foodtrip/foodtrip33/12_Bibimbap/bibimbap1.jpg); снимок проверки `worker7-bibimbap-reference.png`.
- Исправление и визуальная проверка: Сделаны естественнее глазунья, паста и отдельные секции приготовленных добавок. Рис, шпинат, папоротник, ростки, кабачок и говядина сохранены; новых овощей нет.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Refine the supplied original bibimbap photograph into a believable freshly prepared bowl of the SAME recipe, not a rearranged salad or soup. Keep neutral light stone table, unbranded off-white ceramic bowl, landscape 3:2, soft natural daylight and visible steamed short-grain white rice underneath. Retain distinct naturally placed sections of cooked spinach, cooked bracken fern stems, blanched bean sprouts, lightly stir-fried julienned zucchini, cooked sliced or small pieces of beef, one fried egg and a modest spoonful of red gochujang paste. Make topping sections less mechanically symmetrical while still clearly separated; natural irregular small strands and pieces, authentic lightly oily cooked textures, not raw zucchini. Make the egg white naturally asymmetric with subtle browned crisp edges, gently uneven opaque white and an intact softly irregular yellow yolk, not a perfect circular plastic cutout. Gochujang should be a small natural spooned mound, not a flawless red disk. Entire bowl visible, food fills most of frame and remains readable as bibimbap in a thumbnail. No broth, broccoli, salad lettuce, tomatoes, cheese, seafood, carrots, extra ingredients, sesame shower, additional dishes, chopsticks, utensils, hands, text, logos, watermark, flags or country props. Do not copy a source photograph.
```

### 33 — Фо

- Собственный исходник: `t2-active-07.webp`; новый: `t2-active-33.webp`.
- Источники: [источник 1](https://vietnam.travel/node/195).
- Фактически просмотрено: [реальная фотография](https://vietnam.travel/sites/default/files/inline-images/top-vietnamese-dishes-2_2.jpg); снимок проверки `worker7-pho-reference.png`.
- Исправление и визуальная проверка: Говядина тоньше и менее плоская, зелень умеренная; заметны прозрачный бульон и плоские рисовые ленты. Нет яйца, свинины и признаков рамена.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Edit the supplied original pho food photograph to improve the authentic broth, beef and noodle texture while keeping its SAME minimal beef pho recipe and setting. Keep neutral light stone table, unbranded off-white ceramic bowl, landscape 3:2 composition and soft natural daylight. Show a substantial bowl of clear warm golden-beef broth with a visibly open translucent liquid surface around the ingredients and a few natural tiny droplets. Beneath and partly through the broth show soft FLAT white rice-noodle ribbons with clearly flat broad sides and thin edges, naturally relaxed and folded, not thick round udon strands or a dry noodle pile. Replace the thick flat slabs of beef with delicate THIN cooked or medium-cooked beef slices, irregular soft curled edges, fine realistic meat fibers and modest overlapping pieces partly sitting in broth. Reduce the herb pile to a sparse natural sprinkling of finely chopped scallion rings and a little cilantro. Keep the full bowl visible and food large and readable in a thumbnail; realistic hot edible texture, not overly polished. No egg, pork, nori, mushrooms, corn, ramen, additional ingredients, lime garnish, herb bouquet, chopsticks, utensils, hands, extra dishes, text, logos, watermark, flags or country props. Do not copy a source photograph.
```

### 34 — Пад-тай

- Собственный исходник: `t2-active-08.webp`; новый: `t2-active-34.webp`.
- Источники: [источник 1](https://www.thelondoneconomic.com/food-drink/recipes/how-to-make-the-perfect-prawn-pad-thai-16097/), [источник 2](https://www.tatnews.org/2016/02/pad-thai/).
- Фактически просмотрено: [реальная фотография](https://assets.thelondoneconomic.com/uploads/2021/03/c66d9a15-rosas-thai-cafe_prawn-pad-thai_landscape-1200x800.jpg); снимок проверки `worker3-padthai-source-rosa.png`.
- Исправление и визуальная проверка: Лапша тоньше и спутаннее, тофу и яйцо менее геометричные, креветки неодинаковые. Небольшие арахис, шнитт-лук и лайм подтверждены рецептом Сайпин Мур; это уточнение подачи, не замена блюда.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Edit image 1, changing the dish only into photorealistic naturally served shrimp Pad Thai. Keep the same neutral light stone tabletop, off-white ceramic plate, 3:2 landscape, soft window daylight, whole plate large and readable. Replace the thick dry parallel ribbons and oversized square tofu with a naturally tangled loose serving of much thinner flat rice noodles, about 2 to 3 millimeters wide, moist and lightly coated in a natural light tamarind-brown sauce. Mix small irregular pieces of fried tofu, crumbled cooked egg and slender bean sprouts through the noodles. Use a few real-looking naturally curled pink-orange cooked shrimp with varied size and orientation, not repeated identical small shrimp shapes. A modest scatter of crushed roasted peanuts, a few short Chinese chive pieces and one small lime wedge are allowed, no other toppings. Natural imperfect wok-cooked food textures, no artificial geometrical mound, no oversized cubes, no CGI or plastic, no country props, text, logo, flags, hands, utensils, coriander, red pepper strips, extra foods or invented toppings. Do not copy a source photograph.
```

### 35 — Паштел-де-ната

- Собственный исходник: `t2-active-10.webp`; новый: `t2-active-35.webp`.
- Источники: [источник 1](https://pasteisdebelem.pt/frontpage-2/produtos/), [источник 2](https://www.visitportugal.com/en/content/traditional-portuguese-recipes-past%C3%A9is-de-nata-custard-tarts).
- Фактически просмотрено: [реальная фотография](https://pasteisdebelem.pt/wp-content/uploads/2014/05/pastel_de_belem_caixa.jpg); снимок проверки `worker3-nata-source-belem.png`.
- Исправление и визуальная проверка: Уменьшена высота плотных слоёных стенок; добавлены тонкие неровные хлопья теста и естественные пятна подрумянивания заварного крема.
- Ограничение/выбор варианта: VisitPortugal в этом сеансе недоступен. Фактически просмотрена фотография продукции производителя Pastéis de Belém для формы и фактуры; бренд, упаковка и секретная рецептура не копировались.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Edit image 1, changing the dish only into photorealistic naturally served pasteis de nata custard tarts. Keep the same neutral light stone tabletop, off-white ceramic plate, 3:2 landscape, soft window daylight, three whole tarts large and readable. Replace the thick tall stacked croissant-ring walls with much thinner shallow puff-pastry cups: delicately laminated curled pastry flakes and crisp uneven rims, small natural crumbs, shallow soft yellow egg custard filling. Make the custard surface naturally slightly sunken with irregular dark brown baked blisters and caramelized patches, not a perfect uniformly glossy dome. The cups are modest shallow handmade pastry forms, not tall cylindrical croissants or muffin stacks. No sugar dust, cinnamon powder, fruit, cream, fancy garnishes or invented toppings. Natural food irregularities, no CGI or plastic, no country props, text, logo, flags, packaging, hands or utensils. Do not copy a source photograph.
```

### 36 — Гаспачо

- Собственный исходник: `t2-active-11.webp`; новый: `t2-active-36.webp`.
- Источники: [источник 1](https://www.spain.info/en/recipe/gazpacho/).
- Фактически просмотрено: [реальная фотография](https://www.spain.info/export/sites/segtur/.content/imagenes/cabeceras-grandes/recetas/gazpacho_s14452282.jpg_604889389.jpg); снимок проверки `worker3-gazpacho-source-clean.png`.
- Исправление и визуальная проверка: Слишком густой ярко-красный вид заменён оранжево-красным пюрированным супом с мелкой мякотью и пузырьками; кубики гарнира мельче и частично погружены.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Edit image 1, changing the dish into photorealistic naturally served gazpacho. Keep the same neutral light stone tabletop, simple unbranded ceramic bowl, 3:2 landscape, soft window daylight, whole bowl large and readable. The bowl is plain neutral off-white, without painted decoration or country cues. Replace the excessively thick bright neon-red salsa texture with fluid, finely blended tomato, cucumber and pepper soup, naturally muted orange-red from emulsified olive oil, fine soft suspended pulp and a few tiny surface bubbles. Reduce the large geometric garnish pile to a sparse small cluster of finely diced cucumber, tomato and green pepper, partly floating on the soup, natural imperfect cuts. No thick dip or stew, no cream swirl, herbs or invented toppings. Natural food irregularities, no CGI or plastic, no country props, text, logo, flags, hands, utensils or extra food. Do not copy a source photograph.
```

### 37 — Брюссельская вафля

- Собственный исходник: `t2-active-12.webp`; новый: `t2-active-37.webp`.
- Источники: [источник 1](https://www.visit.brussels/en/visitors/where-to-eat/waffles).
- Фактически просмотрено: [реальная фотография](https://www.visit.brussels/content/dam/visitbrussels/images/b2c/where-to-eat/gaufres-25/pardon-brussels-gaufre-2-crop.jpg/jcr:content/renditions/medium-1280px.jpeg); снимок проверки `worker3-waffle-source-pardon.png`.
- Исправление и визуальная проверка: Сохранены прямоугольник и глубокая сетка 4×6; видны пористый мякиш, неровное подрумянивание и небольшой естественный надлом. Только сахарная пудра.
- Ограничение/выбор варианта: На исходной фотографии есть фрукты/шоколад; они не перенесены, чтобы сохранить выбранный простой вариант с пудрой.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Edit image 1, changing the dish only into a photorealistic naturally served Brussels waffle. Keep the same neutral light stone tabletop, off-white ceramic plate, 3:2 landscape, soft window daylight, whole plate large and readable. Preserve a clearly RECTANGULAR waffle with a 4 by 6 grid of 24 deep rectangular pockets, never a rounded Liege waffle. Make the waffle lighter and airier: fine porous crisp thin golden crust, subtly uneven browning, slightly irregular natural baked edges, pale airy interior visible on a small naturally broken edge. A light uneven dusting of powdered sugar only, rather than thick decorative coatings. Do not make a dense plastic grid or excessively symmetrical uniform tiles. No fruit, whipped cream, chocolate, sauce, garnish or other food. Natural food irregularities, no CGI or plastic, no country props, text, logo, flags, hands or utensils. Do not copy a source photograph.
```

### 38 — Салат «Оливье»

- Собственный исходник: `t2-active-21.webp`; новый: `t2-active-38.webp`.
- Источники: [источник 1](https://natashaskitchen.com/olivye-ukrainian-potato-salad/), [источник 2](https://www.gastronom.ru/recipe/amp/44760).
- Фактически просмотрено: [реальная фотография](https://natashaskitchen.com/wp-content/uploads/2015/05/Olivye-Ukrainian-Potato-Salad-9.jpg); снимок проверки `worker3-olivier-source-natasha.png`.
- Исправление и визуальная проверка: Кубики картофеля/яйца менее идеальные, покрытие майонезом тоньше. Сохранены варёная колбаса, картофель, морковь, яйцо, огурец и горошек; нет ветчины и укропа из вспомогательной фотографии.
- Ограничение/выбор варианта: Фото Natasha’s Kitchen — украинский семейный вариант с ветчиной и укропом, использованный только для естественной фактуры нарезки. Состав нашей карточки остаётся по Gastronom с варёной колбасой; соответствие страны не выводится из этой фотографии. Рецепт Gastronom прочитан, его CDN-фото не загрузилось и не считается просмотренным.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Edit image 1, changing the dish only into photorealistic naturally served modern Olivier salad. Keep the same neutral light stone tabletop, off-white ceramic bowl, 3:2 landscape, soft window daylight, whole bowl large and readable. Replace the oversized geometric cubes and heavy glossy mayonnaise with much smaller pea-sized imperfect hand-cut pieces of boiled potato, carrot, cooked pale pink sausage, hard-boiled egg and pickled cucumber, mixed together with whole green peas and a little finely chopped onion. A modest thin mayonnaise coating binds individual pieces, not a thick white sauce, no uniform oversized blocks. A loose naturally spooned mound, slightly broken soft potato and egg edges, realistic mixed salad texture. No ring mold, historical game birds, caviar, seafood, lettuce leaves, corn, green garnish, other food or invented additions. Natural food irregularities, no CGI or plastic, no country props, text, logo, flags, hands or utensils. Do not copy a source photograph.
```

### 39 — Эклер

- Собственный исходник: `t2-active-22.webp`; новый: `t2-active-39.webp`.
- Источники: [источник 1](https://www.kingarthurbaking.com/recipes/dark-chocolate-eclairs-recipe).
- Фактически просмотрено: [реальная фотография](https://www.kingarthurbaking.com/sites/default/files/styles/featured_image_sm_2x/public/recipe_legacy/5515-3-large.jpg?itok=y91g-B9C); снимок проверки `worker3-eclair-source-clean.png`.
- Исправление и визуальная проверка: Шоколадная поверхность менее пластиковая; оболочка заварного теста тонкая, с естественными трещинками и полостью вокруг ванильного крема. Видны целый эклер и срез второго.
- Ограничение/выбор варианта: Текст King Arthur допускает ванильный крем, хотя главная фотография показывает шоколадный. Малое отклонение генерации от промпта: отдельный крошечный отрезанный торец не получен; целый эклер и открытый срез сохранены, существенного дефекта идентификации нет.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Edit image 1, changing the dish only into photorealistic naturally served food. Keep the same neutral light stone tabletop, off-white ceramic plate, 3:2 landscape, soft window daylight, and the whole food large and readable. Subject: classic elongated chocolate eclairs with vanilla pastry cream. Replace the perfect glossy plastic loaf appearance with naturally irregular light golden hollow choux shells, fine baked cracks and a thin naturally spread dark chocolate top with small irregular edges. One whole eclair and one crosswise-cut eclair show the cream-filled hollow choux cavity and thin shell texture; keep both cut pieces on the plate. Modest natural presentation, not a layered cake. Natural food irregularities, no CGI or plastic, no country props, text, logo, flags, hands, utensils, extra food, external piped cream, fruit or sprinkles. Do not copy any source photograph.
```

### 40 — Пекинская утка

- Собственный исходник: `t2-active-14.webp`; новый: `t2-active-40.webp`.
- Источники: [источник 1](https://english.beijing.gov.cn/latest/photos/202312/t20231218_3502542.html).
- Фактически просмотрено: [реальная фотография](https://english.beijing.gov.cn/latest/photos/202312/W020231218506542434489.png); снимок проверки `worker3-duck-source-quanjude-3.png`.
- Исправление и визуальная проверка: Вместо повторяющихся толстых сегментов — более тонкие неодинаковые ломтики готовой утки с кожей и небольшим слоем жира, естественно перекрывающие друг друга.

Точный промпт редактирования:

```text
Use case: precise-object-edit. Edit image 1, changing the dish only into photorealistic naturally served sliced Peking duck. Keep the same neutral light stone tabletop, off-white simple ceramic platter, 3:2 landscape, soft window daylight, entire plated food large and readable. Replace the identical thick grilled breast segments with many thinner irregular hand-carved cooked duck slices: delicate mahogany-brown crisp skin, a thin light fat layer, and pale brown cooked meat beneath. Varied slice sizes and natural folded overlap in a modest loosely fanned serving, not a perfect repetitive row of thick steak-like slices. Fine dry-crisp skin pores with a restrained natural sheen, no oily plastic lacquer and no raw pink meat. This is a sliced serving, not a whole bird. No pancakes, cucumber, scallions, herbs, sauce, garnish, other foods or invented additions. Natural food irregularities, no CGI or plastic, no country props, text, logo, flags, hands or utensils. Do not copy a source photograph.
```

### 41 — Суп харчо

- Собственный исходник: `t2-active-23.webp`; новый: `t2-active-41.webp`.
- Источники: [источник 1](https://www.gastronom.ru/recipe/4632/sup-harcho-iz-govjadiny-s-risom), [источник 2](https://georgianrecipes.net/2014/06/06/beef-kharsho/).
- Фактически просмотрено: [реальная фотография](https://georgiaabout.files.wordpress.com/2014/06/beef-kharsho-copy.jpg?w=640&h=431); снимок проверки `page-2026-09-27T09-13-05-505Z.png`.
- Исправление и визуальная проверка: Харчо остаётся говяжьим рисовым супом: больше непрерывной поверхности бульона, меньше выступающих кусочков; рис не похож на кашу. Нет картофеля и ореховой пасты.
- Ограничение/выбор варианта: Рецепт Gastronom прочитан, его фотохост не ответил. Фактически просмотрена авторская фотография Georgian Recipes: выбранный говяжий харчо с рисом, не ореховое мясное блюдо.

Точный промпт редактирования:

```text
Use case: photorealistic-natural. Edit only the food in Image 1, our own kharcho photograph, into a more natural true prepared kharcho beef-and-rice SOUP. Preserve the same neutral light stone surface, off-white unbranded deep ceramic bowl, landscape 3:2 framing, soft window daylight, camera angle and whole bowl centered and visible, food filling the frame. Make noticeably more reddish-brown liquid broth visible between fewer naturally irregular tender cooked beef chunks; the individual rice grains are mostly submerged rather than covering the surface. Broth is the visually dominant continuous surface, with small natural oil glints and only a light modest scattering of chopped cilantro and basil. Ground walnut and cooked onion remain dispersed seasoning, never a paste. Use naturally imperfect simmered texture, moist fibers in the beef and uneven tiny herb fragments; not sculpted repeating meat pieces. Retain the confirmed Gastronom beef/rice soup recipe, not a new recipe. No potatoes, carrot, sour cream, whole nuts, rice porridge, thick walnut paste, goulash, stew, minced meat sauce, decorative garnish, extra foods, utensils, people, hands, country props, text, logos, flags, watermark or packaging. Do not copy any source photograph.
```

### 42 — Гуляш

- Собственный исходник: `t2-active-16.webp`; новый: `t2-active-42.webp`.
- Источники: [источник 1](https://visithungary.com/fr/article/puskas-rubik-goulash---les-hongrois-vont-ils-reussir-a-lemporter-sur-leur-reputation).
- Фактически просмотрено: [реальная фотография](https://visithungary.com/media/3/35/35a9384b13cded57cf6ff08eb5f0b1da.jpg); снимок проверки `page-2026-09-27T09-15-56-090Z.png`.
- Исправление и визуальная проверка: Сохранён суповой гуляш с паприкой, картофелем, морковью и говядиной; овощи мягче и менее одинаковые, часть мяса погружена в жидкость. Не пёркёльт.

Точный промпт редактирования:

```text
Use case: photorealistic-natural. Edit only the food in Image 1, our own Hungarian goulash photograph, into a naturally cooked real Hungarian gulyas SOUP, retaining the confirmed soup version, not meat stew. Keep the same neutral light stone surface, off-white unbranded ceramic bowl, landscape 3:2, soft window daylight, camera angle and the whole food and bowl filling the frame. Preserve paprika-red soup broth, beef, potato, carrot, onion and a few cooked green pepper pieces. Show a continuous spoonable red broth between naturally uneven tender beef chunks and smaller irregular cooked potatoes with slightly softened worn edges; partly submerge the vegetables and meat. Reduce plastic-looking hard cubed shapes and repeating beef pieces, soften cooked carrot and onion naturally, give beef real irregular moist fibers. Natural modest oil glints, no thick purée. No rice, cream, sour cream, noodles, stew or pörkölt gravy, decorative herb mound, extra foods, utensils, people, hands, country props, text, logos, flags, watermark or packaging. Do not copy any source photograph or change the recipe.
```

### 43 — Крылышки баффало

- Собственный исходник: `t2-active-19.webp`; новый: `t2-active-43.webp`.
- Источники: [источник 1](https://www.iloveny.com/blog/post/how-to-make-baked-buffalo-wings/).
- Фактически просмотрено: [реальная фотография](https://assets.simpleviewinc.com/simpleview/image/upload/c_fill,h_391,q_75,w_588/v1/clients/newyorkstate/Untitled_design_38__dcbee853-b5aa-47ea-8415-eba37918d9c6.jpg); снимок проверки `page-2026-09-27T09-18-40-947Z.png`.
- Исправление и визуальная проверка: Уточнены настоящие части крыла: вытянутые flats с двумя костными рёбрами и небольшие drumettes. Нет крупных голеней/бёдер; соус не скрывает кожу толстой BBQ-лакировкой.
- Ограничение/выбор варианта: Сохранён запечённый вариант New York Kitchen с острым соусом/маслом, а не заявлена жарка во фритюре. Фотография на I LOVE NY атрибутирована @monteskitchen.

Точный промпт редактирования:

```text
Use case: photorealistic-natural. Edit only the food in Image 1, our own baked Buffalo wings photograph, into true natural CHICKEN WING pieces with correct anatomy. Keep the same neutral light stone surface, off-white unbranded ceramic plate, landscape 3:2, soft window daylight, camera angle and whole plate centered and visible, food filling the frame. Replace the oversized leg-like meat pieces with a modest naturally irregular pile of small baked wing flats and small wing drumettes. Flats are elongated flattened wing sections with TWO slender parallel bones under thin wrinkled skin and little meat, not rounded leg portions; small drumettes have only a little tapered wing meat. Show realistic thin skin texture, tiny baked blistered areas, mildly browned edges and varied individual shapes rather than cloned balloon pieces. Coat lightly in orange-red hot sauce emulsified with butter, a thin moist coating that follows skin texture, not a thick dark BBQ lacquer or sugary caramel glaze. Preserve the New York Kitchen baked Buffalo hot-sauce/butter recipe, do not switch preparation or add breading. No full chicken legs, thighs, giant drumsticks, boneless nuggets, extra foods, celery, dip bowls, parsley, utensils, people, hands, country props, text, logos, flags, watermark or packaging. Do not copy any source photograph.
```

### 44 — Паста карбонара

- Собственный исходник: `t2-active-24.webp`; новый: `t2-active-44.webp`.
- Источники: [источник 1](https://www.barilla.com/it-it/ricette/tutte/spaghetti-alla-carbonara), [источник 2](https://ricette.giallozafferano.it/Spaghetti-alla-Carbonara.html).
- Фактически просмотрено: [реальная фотография](https://www.giallozafferano.it/images/244-24489/Spaghetti-alla-Carbonara_450x300_sp.jpg); снимок проверки `page-2026-09-27T09-22-41-733Z.png`.
- Исправление и визуальная проверка: Уменьшена белая сырная шапка, гуанчиале нарезано мельче; видна тонкая золотистая эмульсия на отдельных длинных нитях и чёрный перец. Нет белой сливочной лужи и омлета.
- Ограничение/выбор варианта: Рецепт Barilla прочитан, пустая/недоступная главная фотография не засчитана. Фактически просмотрены страница и фотография рецепта GialloZafferano в браузере; текстовый веб-запрос к ней отдельно возвращал 402.

Точный промпт редактирования:

```text
Use case: photorealistic-natural. Edit only the food in Image 1, our own spaghetti carbonara photograph, into natural true prepared spaghetti carbonara. Keep the same neutral light stone surface, off-white unbranded ceramic pasta plate, landscape 3:2, soft window daylight, camera angle and whole plate centered and visible, food filling the frame. Preserve long separate spaghetti strands, but arrange as a casually served naturally uneven small mound rather than a sculpted perfect nest. Thin smooth glossy egg-and-pecorino emulsion gives individual strands a light warm golden color and silky finish. Greatly reduce the excessive loose white grated-cheese blanket: only a modest fine scattering remains. Reduce the guanciale to small naturally irregular browned pieces and short strips with visible lean/fat layers distributed between the strands, not oversized bacon slabs. Keep visible coarse freshly ground black pepper flecks. Naturally imperfect cooked texture, appetizing moist strands, no repeating shapes. Retain classic spaghetti/egg/pecorino/guanciale/pepper ingredients and recipe. No cream, Alfredo sauce, white liquid puddle, scrambled egg or omelette chunks, egg on top, mushrooms, tomato, herbs, basil, extra foods, utensils, people, hands, country props, text, logos, flags, watermark or packaging. Do not copy any source photograph.
```

### 45 — Буррито

- Собственный исходник: `t2-active-25.webp`; новый: `t2-active-45.webp`.
- Источники: [источник 1](https://chihuahua.gob.mx/info/gastronomia), [источник 2](https://www.recetasnestle.com.mx/recetas/burritos-carne).
- Фактически просмотрено: [реальная фотография](https://www.recetasnestle.com.mx/sites/default/files/styles/recipe_detail_desktop_new/public/srh_recipes/160e6109e64bcf89d2ffd45603fbdcad.webp?itok=CXpYG-nc); снимок проверки `page-2026-09-27T09-27-11-932Z.png`.
- Исправление и визуальная проверка: Тортилья мягче и с умеренными подпалинами; видны подвёрнутые закрытые концы и влажная говядина с фасолью на естественных срезах. Нет риса, сыра, капусты; не открытое тако.
- Ограничение/выбор варианта: Сайт Chihuahua не ответил (ERR_TIMED_OUT/ошибка веб-запроса); повторное чтение сегодня не подтверждено. Ранее подтверждённый вариант говядина+фасоль сохранён. Фотография рецепта автора Noé Medina / Recetas Nestlé просмотрена для заворачивания, среза и фактуры мяса; его сыр/сальса не перенесены.

Точный промпт редактирования:

```text
Use case: photorealistic-natural. Edit only the food in Image 1, our own beef-and-bean burrito photograph, into a natural true prepared soft burrito cut into two halves. Keep the same neutral light stone surface, off-white unbranded ceramic plate, landscape 3:2, soft window daylight, camera angle and whole plate centered and visible, food filling the frame. Keep the confirmed Chihuahua-style selected beef-and-bean filling ONLY, no recipe additions. Make the flour tortilla thinner, soft pliable and gently folded with a few light toasted spots, not a rigid deeply browned baked shell; show natural wrap seams and clearly tucked CLOSED rear ends on both halves. One naturally uneven cut cross-section faces the camera, the other half slightly angled. Filling is irregular moist SMALL tender cooked beef pieces and soft beans naturally mixed, not giant dry roast beef chunks or a perfectly packed mosaic. The soft tortilla wraps continuously around the filling with realistic slight compression at the cut. Naturally imperfect edible cooked texture. No open tacos, rice, lettuce, cabbage, corn, cheese, guacamole, salsa or sauce bowls, extra foods, utensils, people, hands, country props, text, logos, flags, watermark or packaging. Do not copy any source photograph.
```

### 46 — Моти

- Собственный исходник: `t2-active-26.webp`; новый: `t2-active-46.webp`.
- Источники: [источник 1](https://www.japan.travel/en/blog/japanese-desserts-to-try/), [источник 2](https://www.justonecookbook.com/strawberry-daifuku/).
- Фактически просмотрено: [реальная фотография](https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2021/02/Strawberry-Mochi-Ichigo-Daifuku-3642-II.jpg); снимок проверки `page-2026-09-27T09-31-11-192Z.png`.
- Исправление и визуальная проверка: Уменьшена посыпка, заметнее мягкая эластичная рисовая оболочка и неидеальные срезы. Сохранён десертный дайфуку с клубникой/анко, белый и нежно-розовый цвет; не мороженое.

Точный промпт редактирования:

```text
Use case: photorealistic-natural. Edit only the food in Image 1, our own ichigo-daifuku mochi photograph, into naturally hand-shaped real strawberry daifuku. Keep the same neutral light stone surface, off-white unbranded ceramic dessert plate, landscape 3:2, soft window daylight, camera angle and whole plate centered and visible, food filling the frame. Keep two whole softly rounded daifuku, one ivory-white and one very pale pink, and the two cut halves of a third white daifuku in front. Make the glutinous-rice dough noticeably soft, pliant and faintly elastic with natural slight folds near the bases and gently uneven hand-shaped silhouettes; reduce the heavy artificial flour coat to only a subtle fine matte starch dusting that still shows the soft skin underneath. In the cut pieces show a fresh real strawberry with fine natural seeds and fibrous white center, surrounded by a modest thin dark-red azuki bean paste layer and soft rice skin. Cut halves are naturally slightly unequal and subtly compressed at the slice, not perfect identical symmetrical molds. Preserve the confirmed ichigo-daifuku glutinous rice, anko and strawberry filling; do not add new ingredients. No ice cream, macaron shells, cake sponge, jam puddles, hard cookie texture, artificial plastic spheres, skewered dango, extra foods, utensils, people, hands, country props, text, Japanese characters, logos, flags, watermark or packaging. Do not copy any source photograph.
```

## Техническая проверка и оставшиеся ограничения

- Новый тест замораживает всё содержимое T2, кроме `imageUrl`, и байты всех исторических 01–26 файлов; другие четыре банка также остаются неизменными. Проверяется последовательное использование ровно 27–46, отсутствие публичных ответов и наличие двадцати точных промптов этого пересмотра.
- Локальный Chromium/Chrome, отдельное временное хранилище с вымышленными участниками: все пять заданий через drag, click и touch; по двадцать сопоставлений и пять POST в каждом проходе, нейтральный переход к T3. Все двадцать новых изображений загружены в 900×600, подписи не обрезаются. Проверены мобильные ширины 320/360/375/390/430, две колонки, отсутствие горизонтального переполнения и цели не меньше 44 px; клавиатура, замена занятой страны, возврат карточки, справка и отмена выбора. Обычные проходы без ошибок/предупреждений консоли.
- Отдельно проверены намеренный 404 изображения с текстовым fallback, сохранение введения/таймера после reload, memory fallback при недоступном localStorage, запрет чужого drag и досрочная отправка неполного ответа. Ожидаемые 404 в этом отрицательном тесте не выданы за ошибки обычного прохода.
- Browser plugin недоступен: использован уже установленный Playwright с Chrome, без новых зависимостей проекта. Скриншоты интерфейса действительно получены браузером, не отрисованы как макеты. Физические телефоны, Safari и доступ из российских сетей здесь не проверялись.
- Это визуальный редакционный контроль и технический QA, **не окончательное методическое принятие**. Сохраняется необходимость нового слепого студенческого пилота/одобрения организатора, особенно для бибимбапа, названия «Фо» и паштел-де-ната. Не заменять эти блюда без новой просьбы пользователя.
- Коммит локальный, публикации нет. После отдельного запроса публикации нужны push/deploy и `npm.cmd run verify:cloudflare -- https://olympiad-gkts.pages.dev`; уже выданные варианты и их результаты не мигрировать.
