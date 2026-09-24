const { makeDishAssembly, makeIngredientMatrix } = require("./helpers");

const VISUAL_ROOT = "/assets/olympiad/visual-v1/ingredients";

function visualIngredient(id, text, filename, modelKind) {
  const imageUrl = `${VISUAL_ROOT}/${filename}.webp`;
  return {
    id,
    text,
    imageUrl,
    imageAlt: `${text}, предметная фотография ингредиента`,
    layerImageUrl: imageUrl,
    model3d: { kind: modelKind }
  };
}

module.exports = [
  makeIngredientMatrix("T3-01", "shchi", "Щи", "ru", "slavic", [["cabbage", "Капуста"], ["beef_broth", "Бульон"], ["potato", "Картофель"], ["carrot", "Морковь"], ["onion", "Лук"], ["nori", "Нори"], ["tortilla", "Тортилья"], ["coconut", "Кокосовое молоко"], ["parmesan", "Пармезан"], ["rice_vinegar", "Рисовый уксус"]], ["cabbage", "beef_broth", "potato", "carrot", "onion"]),
  makeIngredientMatrix("T3-02", "ratatouille_t3", "Рататуй", "fr", "western_europe", [["eggplant", "Баклажан"], ["zucchini", "Цукини"], ["tomato", "Томаты"], ["bell_pepper", "Сладкий перец"], ["olive_oil", "Оливковое масло"], ["wasabi", "Васаби"], ["rye", "Ржаная мука"], ["tortilla", "Тортилья"], ["nori", "Нори"], ["cinnamon", "Корица"]], ["eggplant", "zucchini", "tomato", "bell_pepper", "olive_oil"]),
  makeIngredientMatrix("T3-03", "tempura_t3", "Темпура", "jp", "east_asia", [["shrimp", "Креветки"], ["vegetables", "Овощи"], ["tempura_flour", "Мука для кляра"], ["cold_water", "Очень холодная вода"], ["oil", "Масло для жарки"], ["parmesan", "Пармезан"], ["beet", "Свёкла"], ["mascarpone", "Маскарпоне"], ["chili_con_carne", "Мясной соус чили"], ["sour_cream", "Сметана"]], ["shrimp", "vegetables", "tempura_flour", "cold_water", "oil"]),
  makeIngredientMatrix("T3-04", "enchiladas_t3", "Энчиладас", "mx", "latin_america", [["tortilla", "Тортилья"], ["chicken", "Курица"], ["beans", "Фасоль"], ["tomato_salsa", "Томатная сальса"], ["cheese", "Сыр"], ["nori", "Нори"], ["rye", "Ржаной хлеб"], ["dashi", "Даси"], ["mascarpone", "Маскарпоне"], ["buckwheat", "Гречка"]], ["tortilla", "chicken", "beans", "tomato_salsa", "cheese"]),
  makeIngredientMatrix("T3-05", "yorkshire_pudding_t3", "Йоркширский пудинг", "uk", "western_europe", [["flour", "Мука"], ["milk", "Молоко"], ["egg", "Яйцо"], ["salt", "Соль"], ["fat", "Жир для формы"], ["miso", "Мисо"], ["rice", "Рис"], ["cilantro", "Кинза"], ["tortilla", "Тортилья"], ["buckwheat", "Гречка"]], ["flour", "milk", "egg", "salt", "fat"]),
  makeIngredientMatrix("T3-06", "cevapcici_t3", "Чевапчичи", "balkan", "balkan", [["minced_meat", "Мясной фарш"], ["onion", "Лук"], ["garlic", "Чеснок"], ["paprika", "Паприка"], ["salt", "Соль"], ["nori", "Нори"], ["maple", "Кленовый сироп"], ["mascarpone", "Маскарпоне"], ["rice_vinegar", "Рисовый уксус"], ["coconut", "Кокосовое молоко"]], ["minced_meat", "onion", "garlic", "paprika", "salt"]),
  makeIngredientMatrix("T3-07", "blini_t3", "Блины", "ru", "slavic", [["flour", "Мука"], ["milk", "Молоко"], ["egg", "Яйцо"], ["salt", "Соль"], ["sugar", "Сахар"], ["nori", "Нори"], ["jalapeno", "Халапеньо"], ["miso", "Мисо"], ["parmesan", "Пармезан"], ["dashi", "Даси"]], ["flour", "milk", "egg", "salt", "sugar"]),
  makeIngredientMatrix("T3-08", "lasagna_t3", "Лазанья", "it", "mediterranean", [["lasagna_sheets", "Листы лазаньи"], ["bolognese", "Соус болоньезе"], ["bechamel", "Соус бешамель"], ["cheese", "Сыр"], ["tomato", "Томаты"], ["nori", "Нори"], ["buckwheat", "Гречка"], ["tortilla", "Тортилья"], ["miso", "Мисо"], ["lime", "Лайм"]], ["lasagna_sheets", "bolognese", "bechamel", "cheese", "tomato"]),
  makeIngredientMatrix("T3-09", "miso_soup_t3", "Мисо-суп", "jp", "east_asia", [["dashi", "Даси"], ["miso", "Мисо-паста"], ["tofu", "Тофу"], ["wakame", "Вакаме"], ["green_onion", "Зелёный лук"], ["beet", "Свёкла"], ["cream", "Сливки"], ["tortilla", "Тортилья"], ["beans", "Фасоль"], ["parmesan", "Пармезан"]], ["dashi", "miso", "tofu", "wakame", "green_onion"]),
  makeIngredientMatrix("T3-10", "pretzel_t3", "Брецель", "de", "central_europe", [["flour", "Мука"], ["yeast", "Дрожжи"], ["water", "Вода"], ["salt", "Соль"], ["soda_bath", "Щелочной раствор или сода"], ["nori", "Нори"], ["lime", "Лайм"], ["coconut", "Кокосовое молоко"], ["beans", "Фасоль"], ["wasabi", "Васаби"]], ["flour", "yeast", "water", "salt", "soda_bath"]),
  makeIngredientMatrix("T3-11", "churros_t3", "Чуррос", "mx", "latin_america", [["water", "Вода"], ["flour", "Мука"], ["oil", "Масло"], ["sugar", "Сахар"], ["cinnamon", "Корица"], ["nori", "Нори"], ["miso", "Мисо"], ["buckwheat", "Гречка"], ["parmesan", "Пармезан"], ["soy", "Соевый соус"]], ["water", "flour", "oil", "sugar", "cinnamon"]),
  makeIngredientMatrix("T3-12", "shopska_t3", "Шопский салат", "balkan", "balkan", [["tomato", "Томаты"], ["cucumber", "Огурец"], ["pepper", "Сладкий перец"], ["white_cheese", "Белый сыр"], ["onion", "Лук"], ["nori", "Нори"], ["avocado", "Авокадо"], ["rice", "Рис"], ["mascarpone", "Маскарпоне"], ["maple", "Кленовый сироп"]], ["tomato", "cucumber", "pepper", "white_cheese", "onion"]),
  makeDishAssembly(
    "T3-13",
    "margherita_avpn_t3",
    "Пицца «Маргарита»",
    "it",
    "mediterranean",
    [
      visualIngredient("pizza_dough", "Тесто для неаполитанской пиццы", "pizza-dough", "pizza_dough"),
      visualIngredient("tomato_sauce", "Измельчённые очищенные томаты", "tomato-sauce", "tomato_sauce"),
      visualIngredient("mozzarella", "Моцарелла или фьор-ди-латте", "mozzarella", "mozzarella"),
      visualIngredient("basil", "Свежий базилик", "basil", "basil"),
      visualIngredient("olive_oil", "Оливковое масло extra virgin", "olive-oil", "olive_oil"),
      visualIngredient("cucumber", "Свежий огурец", "cucumber", "cucumber"),
      visualIngredient("boiled_egg", "Варёное яйцо", "boiled-egg", "boiled_egg"),
      visualIngredient("grilled_chicken", "Куриное филе гриль", "grilled-chicken", "grilled_chicken")
    ],
    ["pizza_dough", "tomato_sauce", "mozzarella", "basil", "olive_oil"],
    {
      prompt: "Соберите обязательное ядро традиционной неаполитанской пиццы «Маргарита» по спецификации AVPN.",
      scenario: "Добавляйте продукты на 3D-пиццу. Лишние карточки оставьте в банке.",
      note: "В задании проверяются обязательные компоненты базовой версии; необязательные региональные дополнения не используются.",
      recipeScope: "international_classic",
      variantLabel: "Традиционная неаполитанская «Маргарита» • AVPN",
      sourceNote: "Состав сверен со спецификацией Associazione Verace Pizza Napoletana, редакция 2024 года.",
      renderMode: "procedural_3d_v1",
      modelPreset: "pizza",
      difficulty: "standard",
      competencyTags: ["состав блюда", "итальянская кухня", "визуальная сборка"],
      methodicalFocus: "обязательное ядро рецептуры",
      assetRefs: [
        "/assets/olympiad/visual-v1/dishes/margherita-avpn.webp",
        "/assets/olympiad/visual-v1/ingredients/pizza-dough.webp"
      ]
    }
  ),
  makeDishAssembly(
    "T3-14",
    "caesar_russian_foodservice_t3",
    "Салат «Цезарь» с курицей",
    "us_ru",
    "modern_foodservice",
    [
      visualIngredient("romaine", "Салат романо", "romaine", "romaine"),
      visualIngredient("grilled_chicken", "Куриное филе гриль", "grilled-chicken", "grilled_chicken"),
      visualIngredient("croutons", "Пшеничные крутоны", "croutons", "croutons"),
      visualIngredient("parmesan", "Пармезан", "parmesan", "parmesan"),
      visualIngredient("cherry_tomato", "Томаты черри", "cherry-tomatoes", "cherry_tomato"),
      visualIngredient("caesar_dressing", "Соус «Цезарь»", "caesar-dressing", "caesar_dressing"),
      visualIngredient("cucumber", "Свежий огурец", "cucumber", "cucumber"),
      visualIngredient("pizza_dough", "Тесто для пиццы", "pizza-dough", "pizza_dough")
    ],
    ["romaine", "grilled_chicken", "croutons", "parmesan", "cherry_tomato", "caesar_dressing"],
    {
      prompt: "Соберите салат «Цезарь» с курицей в привычной российской ресторанной подаче.",
      scenario: "Добавляйте продукты в 3D-салатник. Ориентируйтесь на указанную ресторанную версию.",
      note: "Это российская ресторанная версия блюда: романо, курица, крутоны, пармезан, томаты черри и соус «Цезарь».",
      recipeScope: "russian_foodservice_variant",
      variantLabel: "Российская ресторанная версия • с курицей и томатами черри",
      sourceNote: "Состав сверен по опубликованным меню и технологической карте российских предприятий питания.",
      renderMode: "procedural_3d_v1",
      modelPreset: "salad",
      difficulty: "standard",
      competencyTags: ["состав блюда", "ресторанная подача", "визуальная сборка"],
      methodicalFocus: "явно названный вариант рецептуры",
      assetRefs: [
        "/assets/olympiad/visual-v1/dishes/caesar-russian-foodservice.webp",
        "/assets/olympiad/visual-v1/ingredients/romaine.webp"
      ]
    }
  )
];
