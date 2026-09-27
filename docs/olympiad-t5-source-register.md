# T5 «Финальная кухня» — источники и реестр изображений

27 сентября 2026 года. Документ организатора, не материал для participant API. Новый тур подготовлен локально, не опубликован.

## Источники рецептур и внешнего вида

| Блюдо | Проверенный первичный источник | Принятая конкурсная граница |
|---|---|---|
| «Маргарита» | [AVPN](https://www.pizzanapoletana.org/en/decalogo), [реальные фото RecipeTin Eats](https://www.recipetineats.com/pizza-toppings/) | Томат, моцарелла, базилик, масло; готовая основа вне оценки |
| Чизбургер | [Arla Pro / Ben Chaplin](https://www.arlapro.com/en-gb/recipes/classic-beef-burger-with-arla-pro-mild-coloured-cheddar-slices/), [фото компонентов](https://www.recipetineats.com/cheeseburger-recipe/) | Говядина, две половины булочки как один компонент, сыр, салат/томат |
| Шаурма с курицей | [RecipeTin Eats](https://www.recipetineats.com/chicken-sharwama-middle-eastern/) | Лаваш, курица, овощная смесь, белый соус |
| Греческий салат | [RecipeTin Eats](https://www.recipetineats.com/greek-salad/), [Natasha’s Kitchen](https://natashaskitchen.com/greek-salad/) | Крупная свежая нарезка, фета; масло/орегано объединены |
| «Цезарь» с курицей | [RecipeTin Eats](https://www.recipetineats.com/chicken-caesar-salad/) | Ромэн, курица, сухарики/пармезан, заправка; не версия с креветками |
| Хачапури по-аджарски | [Georgia Travel / GNTA](https://georgia.travel/ship-and-sun-the-inspiration-for-ajarian-khachapuri), [Гастроном](https://www.gastronom.ru/recipe/4395/hachapuri-po-adzharski-s-suluguni) | Открытая лодочка, сыр, яйцо, небольшой кусочек масла |
| Ролл «Филадельфия» | [Гастроном](https://www.gastronom.ru/recipe/30992/roll-filadelfiya) | Рис/нори, сливочный сыр, огурец, наружный лосось; условная плоская сборка |

Рецепты источников не подменяют фиксированные четыре модуля задания. Различия и причины выбора всех дистракторов описаны в [аудите содержания](olympiad-t5-content-audit.md).

## Полный машинно-проверяемый реестр

[olympiad-t5-asset-provenance.json](olympiad-t5-asset-provenance.json) содержит **каждую из 64 позиций**: 56 компонентов, 7 превью, 1 неоцениваемую основу. Для каждой позиции записаны:

- источники рецептур/компонентов `sourceUrls`, факты `textFacts`, ссылки на реальные фотографии и просмотренные скриншоты `visualReferences`;
- точный `exactPrompt`, исходный `generatedPath`, история повторной генерации `retries` и исходная проверка `workerReview`;
- нейтральный рабочий `publicUrl`, размеры исходника, байты и SHA-256 экспортированного файла;
- явное одобрение основным агентом и результат визуальной проверки карточки/слоя в браузере.

Точные исторические промпты трёх ранее принятых ассетов отсутствуют: вместо выдуманного текста записаны `exactPrompt: null` и `historicalPromptAvailability`. Пути к нативным генерациям и исследовательским скриншотам относятся к этой рабочей машине; рабочие WebP находятся в репозитории.

## Метод получения и повторное использование

Использована встроенная генерация отдельных оригинальных фотографических cutout-изображений. Фото внешних источников просмотрены как референсы, **не скопированы в рабочие ассеты**. Концепты четырёх экранов созданы и просмотрены до реализации; они не нарезались на изображения блюд и не включались вместо HTML-интерфейса.

64 нейтральных WebP занимают 6 990 726 байт (~6,67 МиБ). Это 57 уникальных принятых исходных файлов: 54 новые генерации и 3 исторических ассета. Повторяющиеся продукты переиспользуют один принятый исходник, но каждая логическая позиция имеет отдельный нейтральный URL. Компоненты экспортированы с прозрачностью 768 × 768; превью — 900 × 600. Метаданные удалены; ключи/рецептурные названия не включены в имена рабочих файлов.

Для «Маргариты» повторно использованы пустая основа, моцарелла и базилик из прежних `visual-v1` / `visual-v2`. Их оригиналы не изменены. Для «Цезаря» использована прежняя идея тарелки, слоёв и резервного режима; фотографии компонентов созданы заново в общем верхнем ракурсе, а старые опубликованные изображения сохранены. Новый отдельный runtime не заменяет прежний 3D runtime других туров.

Повторно генерировались рис/нори «Филадельфии» (квадрат заменён на прямоугольный лист) и масло/орегано греческого салата (плотный непрозрачный слой заменён тонкими прозрачными следами, не закрывающими фету). Обе отвергнутые версии и новые точные промпты сохранены в реестре. Размеры слоёв и положение верхней булочки доработаны после проверки реального интерфейса. Нет общей вырезанной ingredient-atlas вместо отдельных изображений.

Основной агент лично просмотрел все уникальные принятые исходники, 7 сцен, 56 карточек, 56 отдельных экземпляров слоёв и 7 превью в фактическом браузере. Некоторые нативные cutout имеют остаточную прозрачность 1/255 в углу: это отмечено, а не объявлено идеальным нулём. Фактический критерий — чистая белая карточка/сцена без заметного фона. Для масла корректна частичная прозрачность, а не обязательная полностью непрозрачная область.

Прямой board-инструмент недоступен: использован просмотр отдельных нативных файлов и браузерные галереи настоящих скриншотов сцен. Логика и ограничения 3D/2D, сохранённые доказательства и fidelity ledger — в [QA](olympiad-t5-qa.md).

## Индекс всех рабочих позиций

Полные промпты, несколько визуальных референсов и исходные пути для каждой строки находятся в JSON по указанному ключу. Следующая таблица механически формируется из принятого реестра.

<!-- ASSET_INDEX_START -->
| Станция | Блюдо | Позиция | Ключ записи JSON | Исследование | Рабочий файл | QA |
|---|---|---|---|---|---|---|
| 1 | Пицца «Маргарита» | Пицца «Маргарита» | `margherita_pizza:preview` | [источник](https://www.recipetineats.com/pizza-toppings/) | [WebP](../public/assets/olympiad/tour5/t5-v1-1e4c190ebeb5.webp) | принят |
| 1 | Пицца «Маргарита» | Ветчина | `ham` | [источник](https://www.recipetineats.com/pizza-capricciosa/) | [WebP](../public/assets/olympiad/tour5/t5-v1-96624a8b6a4e.webp) | принят |
| 1 | Пицца «Маргарита» | Свежий базилик | `basil` | [источник](https://www.recipetineats.com/pizza-toppings/) | [WebP](../public/assets/olympiad/tour5/t5-v1-afcb8a7fc0c4.webp) | принят |
| 1 | Пицца «Маргарита» | Томатный соус | `pizza-tomato` | [источник](https://www.recipetineats.com/pizza-toppings/) | [WebP](../public/assets/olympiad/tour5/t5-v1-42f02eec1fa8.webp) | принят |
| 1 | Пицца «Маргарита» | Шампиньоны | `mushrooms` | [источник](https://www.recipetineats.com/mushroom-sauce/) | [WebP](../public/assets/olympiad/tour5/t5-v1-04bd25f06768.webp) | принят |
| 1 | Пицца «Маргарита» | Оливковое масло | `olive-oil` | [источник](https://www.recipetineats.com/pizza-toppings/) | [WebP](../public/assets/olympiad/tour5/t5-v1-a838f772fbc8.webp) | принят |
| 1 | Пицца «Маргарита» | Пепперони | `pepperoni` | [источник](https://www.recipetineats.com/pizza-toppings/) | [WebP](../public/assets/olympiad/tour5/t5-v1-972230a11c79.webp) | принят |
| 1 | Пицца «Маргарита» | Моцарелла | `mozzarella` | [источник](https://www.recipetineats.com/pizza-toppings/) | [WebP](../public/assets/olympiad/tour5/t5-v1-a07c6cfc79e0.webp) | принят |
| 1 | Пицца «Маргарита» | Соус песто | `pesto` | [источник](https://www.recipetineats.com/pesto/) | [WebP](../public/assets/olympiad/tour5/t5-v1-01560908d5c8.webp) | принят |
| 1 | Чизбургер | Чизбургер | `burger:preview` | [источник](https://www.recipetineats.com/cheeseburger-recipe/) | [WebP](../public/assets/olympiad/tour5/t5-v1-269aa81493c8.webp) | принят |
| 1 | Чизбургер | Бекон | `bacon` | [источник](https://www.recipetineats.com/hamburger-recipe/) | [WebP](../public/assets/olympiad/tour5/t5-v1-067d9ce14935.webp) | принят |
| 1 | Чизбургер | Булочка: две половины | `burger-bun` | [источник](https://www.recipetineats.com/cheeseburger-recipe/) | [WebP](../public/assets/olympiad/tour5/t5-v1-badd7551be5a.webp) | принят |
| 1 | Чизбургер | Рыбная котлета | `fish-patty` | [источник](https://www.recipetineats.com/fish-cakes/) | [WebP](../public/assets/olympiad/tour5/t5-v1-3f9d8177923b.webp) | принят |
| 1 | Чизбургер | Салат и томат | `burger-vegetables` | [источник](https://www.recipetineats.com/cheeseburger-recipe/) | [WebP](../public/assets/olympiad/tour5/t5-v1-e1c5b1154a71.webp) | принят |
| 1 | Чизбургер | Говяжья котлета | `beef-patty` | [источник](https://www.recipetineats.com/cheeseburger-recipe/) | [WebP](../public/assets/olympiad/tour5/t5-v1-73e319f5e7e2.webp) | принят |
| 1 | Чизбургер | Луковые кольца | `onion-rings` | [источник](https://natashaskitchen.com/crisp-onion-rings-recipe/comment-page-7/) | [WebP](../public/assets/olympiad/tour5/t5-v1-c6ee325c8b77.webp) | принят |
| 1 | Чизбургер | Ломтик сыра | `cheddar` | [источник](https://www.recipetineats.com/cheeseburger-recipe/) | [WebP](../public/assets/olympiad/tour5/t5-v1-31cf2bbfdeb4.webp) | принят |
| 1 | Чизбургер | Жареное яйцо | `fried-egg` | [источник](https://www.recipetineats.com/hamburger-recipe/) | [WebP](../public/assets/olympiad/tour5/t5-v1-e755b4cfd491.webp) | принят |
| 1 | Шаурма с курицей | Шаурма с курицей | `shawarma:preview` | [источник](https://www.recipetineats.com/chicken-sharwama-middle-eastern/) | [WebP](../public/assets/olympiad/tour5/t5-v1-a5276a864c7a.webp) | принят |
| 1 | Шаурма с курицей | Сладкий соус чили | `sweet-chili` | [источник](https://hot-thai-kitchen.com/sweet-chili-sauce/) | [WebP](../public/assets/olympiad/tour5/t5-v1-80ca3d59f63a.webp) | принят |
| 1 | Шаурма с курицей | Лаваш | `lavash` | [источник](https://www.gastronom.ru/recipe/61095/domashnij-tonkij-lavash-v-duhovke) | [WebP](../public/assets/olympiad/tour5/t5-v1-b9811ee7cbd7.webp) | принят |
| 1 | Шаурма с курицей | Крабовые палочки | `surimi` | [источник](https://www.justonecookbook.com/california-roll/) | [WebP](../public/assets/olympiad/tour5/t5-v1-2c96994508e0.webp) | принят |
| 1 | Шаурма с курицей | Овощная смесь | `wrap-vegetables` | [источник](https://www.recipetineats.com/chicken-sharwama-middle-eastern/) | [WebP](../public/assets/olympiad/tour5/t5-v1-536ebe9774e7.webp) | принят |
| 1 | Шаурма с курицей | Курица | `chicken` | [источник](https://www.onceuponachef.com/recipes/perfectly-grilled-chicken-breasts.html) | [WebP](../public/assets/olympiad/tour5/t5-v1-aeacdd0b3026.webp) | принят |
| 1 | Шаурма с курицей | Красная рыба | `salmon` | [источник](https://www.gastronom.ru/recipe/30992/roll-filadelfiya) | [WebP](../public/assets/olympiad/tour5/t5-v1-ee63ae8b9a7d.webp) | принят |
| 1 | Шаурма с курицей | Белый соус | `white-sauce` | [источник](https://www.recipetineats.com/chicken-sharwama-middle-eastern/) | [WebP](../public/assets/olympiad/tour5/t5-v1-a47efc27d066.webp) | принят |
| 1 | Шаурма с курицей | Кукуруза | `corn` | [источник](https://www.recipetineats.com/corn-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-da98921a6d04.webp) | принят |
| 2 | Греческий салат | Греческий салат | `greek_salad:preview` | [источник](https://www.recipetineats.com/greek-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-8999dbfe738d.webp) | принят |
| 2 | Греческий салат | Сухарики | `salad-croutons` | [источник](https://www.recipetineats.com/chicken-caesar-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-69cd4f478a4a.webp) | принят |
| 2 | Греческий салат | Фета | `feta` | [источник](https://www.recipetineats.com/greek-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-8e6d38ee206b.webp) | принят |
| 2 | Греческий салат | Томаты и огурец | `greek-vegetables` | [источник](https://www.recipetineats.com/greek-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-654d8b543045.webp) | принят |
| 2 | Греческий салат | Кукуруза | `salad-corn` | [источник](https://www.recipetineats.com/corn-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-25c80d253f3c.webp) | принят |
| 2 | Греческий салат | Оливковое масло и орегано | `oil-oregano` | [источник](https://www.recipetineats.com/greek-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-1ac695980fee.webp) | принят |
| 2 | Греческий салат | Курица | `salad-chicken` | [источник](https://www.onceuponachef.com/recipes/perfectly-grilled-chicken-breasts.html) | [WebP](../public/assets/olympiad/tour5/t5-v1-1a0ae3241fcf.webp) | принят |
| 2 | Греческий салат | Красный лук и оливки | `onion-olives` | [источник](https://www.recipetineats.com/greek-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-1cce3e479cd0.webp) | принят |
| 2 | Греческий салат | Майонезная заправка | `mayo-dressing` | [источник](https://www.recipetineats.com/mayonnaise-recipe/) | [WebP](../public/assets/olympiad/tour5/t5-v1-9ced8a28448a.webp) | принят |
| 2 | Цезарь с курицей | Цезарь с курицей | `caesar_salad:preview` | [источник](https://www.recipetineats.com/chicken-caesar-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-feb8e73567bf.webp) | принят |
| 2 | Цезарь с курицей | Огурец | `caesar-cucumber` | [источник](https://natashaskitchen.com/greek-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-cf25c15dd195.webp) | принят |
| 2 | Цезарь с курицей | Салат ромэн | `romaine` | [источник](https://www.recipetineats.com/chicken-caesar-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-25090580eeb1.webp) | принят |
| 2 | Цезарь с курицей | Креветки | `caesar-shrimp` | [источник](https://grandbaby-cakes.com/shrimp-caesar-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-5658b56ce6aa.webp) | принят |
| 2 | Цезарь с курицей | Курица | `caesar-chicken` | [источник](https://www.onceuponachef.com/recipes/perfectly-grilled-chicken-breasts.html) | [WebP](../public/assets/olympiad/tour5/t5-v1-e8be78c9237d.webp) | принят |
| 2 | Цезарь с курицей | Сухарики и пармезан | `croutons-parmesan` | [источник](https://www.recipetineats.com/chicken-caesar-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-ac72220817ff.webp) | принят |
| 2 | Цезарь с курицей | Фета | `caesar-feta` | [источник](https://www.recipetineats.com/greek-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-cbe262917d8a.webp) | принят |
| 2 | Цезарь с курицей | Соус «Цезарь» | `caesar-dressing` | [источник](https://www.recipetineats.com/chicken-caesar-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-33441a1c548f.webp) | принят |
| 2 | Цезарь с курицей | Кукуруза | `caesar-corn` | [источник](https://www.recipetineats.com/corn-salad/) | [WebP](../public/assets/olympiad/tour5/t5-v1-df9603362775.webp) | принят |
| 3 | Хачапури по-аджарски | Хачапури по-аджарски | `adjarian_khachapuri:preview` | [источник](https://www.gastronom.ru/recipe/4395/hachapuri-po-adzharski-s-suluguni) | [WebP](../public/assets/olympiad/tour5/t5-v1-86f42b284088.webp) | принят |
| 3 | Хачапури по-аджарски | Шампиньоны | `boat-mushrooms` | [источник](https://www.recipetineats.com/mushroom-gravy/) | [WebP](../public/assets/olympiad/tour5/t5-v1-74244d74dedd.webp) | принят |
| 3 | Хачапури по-аджарски | Сырная начинка | `boat-cheese` | [источник](https://www.gastronom.ru/recipe/4395/hachapuri-po-adzharski-s-suluguni) | [WebP](../public/assets/olympiad/tour5/t5-v1-e605688b6b94.webp) | принят |
| 3 | Хачапури по-аджарски | Томатный соус | `boat-tomato` | [источник](https://www.inspiredtaste.net/59885/pizza-sauce/) | [WebP](../public/assets/olympiad/tour5/t5-v1-ecb29f06d774.webp) | принят |
| 3 | Хачапури по-аджарски | Лодочка из теста | `dough-boat` | [источник](https://www.gastronom.ru/recipe/4395/hachapuri-po-adzharski-s-suluguni) | [WebP](../public/assets/olympiad/tour5/t5-v1-ef43dd83c27b.webp) | принят |
| 3 | Хачапури по-аджарски | Сливочное масло | `butter` | [источник](https://www.gastronom.ru/recipe/4395/hachapuri-po-adzharski-s-suluguni) | [WebP](../public/assets/olympiad/tour5/t5-v1-7b1833aa4909.webp) | принят |
| 3 | Хачапури по-аджарски | Готовый фарш | `mince` | [источник](https://www.recipetineats.com/cottage-pie/) | [WebP](../public/assets/olympiad/tour5/t5-v1-3315d0e8f596.webp) | принят |
| 3 | Хачапури по-аджарски | Яйцо | `boat-egg` | [источник](https://www.gastronom.ru/recipe/4395/hachapuri-po-adzharski-s-suluguni) | [WebP](../public/assets/olympiad/tour5/t5-v1-9ba0cbd4bac9.webp) | принят |
| 3 | Хачапури по-аджарски | Майонез | `boat-mayo` | [источник](https://www.inspiredtaste.net/25943/homemade-mayonnaise-recipe/) | [WebP](../public/assets/olympiad/tour5/t5-v1-c44f714a7ec8.webp) | принят |
| 3 | Ролл «Филадельфия» | Ролл «Филадельфия» | `philadelphia_roll:preview` | [источник](https://www.gastronom.ru/recipe/30992/roll-filadelfiya) | [WebP](../public/assets/olympiad/tour5/t5-v1-392680c6fee3.webp) | принят |
| 3 | Ролл «Филадельфия» | Угорь | `eel` | [источник](https://www.justonecookbook.com/unagi-don-unadon/) | [WebP](../public/assets/olympiad/tour5/t5-v1-93a1e3924847.webp) | принят |
| 3 | Ролл «Филадельфия» | Рис и нори | `rice-nori` | [источник](https://www.gastronom.ru/recipe/30992/roll-filadelfiya) | [WebP](../public/assets/olympiad/tour5/t5-v1-b27662dac3c6.webp) | принят |
| 3 | Ролл «Филадельфия» | Крабовые палочки | `roll-surimi` | [источник](https://www.justonecookbook.com/california-roll/) | [WebP](../public/assets/olympiad/tour5/t5-v1-661e4c76a647.webp) | принят |
| 3 | Ролл «Филадельфия» | Лосось | `roll-salmon` | [источник](https://www.gastronom.ru/recipe/30992/roll-filadelfiya) | [WebP](../public/assets/olympiad/tour5/t5-v1-35fc57c6ba3f.webp) | принят |
| 3 | Ролл «Филадельфия» | Сливочный сыр | `cream-cheese` | [источник](https://www.gastronom.ru/recipe/30992/roll-filadelfiya) | [WebP](../public/assets/olympiad/tour5/t5-v1-381e198037ab.webp) | принят |
| 3 | Ролл «Филадельфия» | Креветки | `roll-shrimp` | [источник](https://www.recipetineats.com/prawn-cocktail/) | [WebP](../public/assets/olympiad/tour5/t5-v1-b27a89865383.webp) | принят |
| 3 | Ролл «Филадельфия» | Огурец | `roll-cucumber` | [источник](https://www.gastronom.ru/recipe/30992/roll-filadelfiya) | [WebP](../public/assets/olympiad/tour5/t5-v1-3eccd3ccf954.webp) | принят |
| 3 | Ролл «Филадельфия» | Тунец | `tuna` | [источник](https://www.justonecookbook.com/sushi-rolls/) | [WebP](../public/assets/olympiad/tour5/t5-v1-c9d0fd75602e.webp) | принят |
| 1 | Пицца «Маргарита» | Готовая пустая основа | `pizza-base` | [источник](https://www.recipetineats.com/pizza-toppings/) | [WebP](../public/assets/olympiad/tour5/t5-v1-8f293f34088c.webp) | принят |
<!-- ASSET_INDEX_END -->
