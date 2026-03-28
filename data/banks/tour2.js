const { makeMatchBlock } = require("./helpers");

module.exports = [
  makeMatchBlock(
    "T2-B01",
    "Соотнесите блюда и кухни: блок 1.",
    [
      { dishId: "borsch", text: "Борщ", cuisine: "ru" },
      { dishId: "quiche", text: "Киш", cuisine: "fr" },
      { dishId: "ramen", text: "Рамен", cuisine: "jp" },
      { dishId: "tacos", text: "Такос", cuisine: "mx" },
      { dishId: "risotto", text: "Ризотто", cuisine: "it" }
    ],
    [
      { id: "ru", label: "Русская кухня" },
      { id: "fr", label: "Французская кухня" },
      { id: "jp", label: "Японская кухня" },
      { id: "mx", label: "Мексиканская кухня" },
      { id: "it", label: "Итальянская кухня" }
    ]
  ),
  makeMatchBlock(
    "T2-B02",
    "Соотнесите блюда и кухни: блок 2.",
    [
      { dishId: "pelmeni", text: "Пельмени", cuisine: "ru" },
      { dishId: "onion_soup", text: "Луковый суп", cuisine: "fr" },
      { dishId: "sushi", text: "Суши", cuisine: "jp" },
      { dishId: "enchiladas", text: "Энчиладас", cuisine: "mx" },
      { dishId: "lasagna", text: "Лазанья", cuisine: "it" }
    ],
    [
      { id: "ru", label: "Русская кухня" },
      { id: "fr", label: "Французская кухня" },
      { id: "jp", label: "Японская кухня" },
      { id: "mx", label: "Мексиканская кухня" },
      { id: "it", label: "Итальянская кухня" }
    ]
  ),
  makeMatchBlock(
    "T2-B03",
    "Соотнесите блюда и кухни: блок 3.",
    [
      { dishId: "schnitzel", text: "Шницель", cuisine: "de" },
      { dishId: "fish_and_chips", text: "Фиш-энд-чипс (жареная рыба с картофелем)", cuisine: "uk" },
      { dishId: "strudel", text: "Штрудель", cuisine: "de" },
      { dishId: "shepherds_pie", text: "Пастуший пирог (Shepherd's pie)", cuisine: "uk" },
      { dishId: "pretzel", text: "Брецель", cuisine: "de" }
    ],
    [
      { id: "de", label: "Немецкая кухня" },
      { id: "uk", label: "Английская кухня" }
    ]
  ),
  makeMatchBlock(
    "T2-B04",
    "Соотнесите блюда и кухни: блок 4.",
    [
      { dishId: "shopska", text: "Шопский салат", cuisine: "balkan" },
      { dishId: "banitsa", text: "Баница", cuisine: "balkan" },
      { dishId: "cevapcici", text: "Чевапчичи", cuisine: "balkan" },
      { dishId: "baklava_balkan", text: "Пахлава", cuisine: "balkan" },
      { dishId: "ajvar", text: "Айвар", cuisine: "balkan" }
    ],
    [{ id: "balkan", label: "Балканская кухня" }]
  ),
  makeMatchBlock(
    "T2-B05",
    "Соотнесите блюда и кухни: блок 5.",
    [
      { dishId: "creme_brulee", text: "Крем-брюле", cuisine: "fr" },
      { dishId: "tiramisu", text: "Тирамису", cuisine: "it" },
      { dishId: "mochi", text: "Моти", cuisine: "jp" },
      { dishId: "churros", text: "Чуррос", cuisine: "mx" },
      { dishId: "blini", text: "Блины", cuisine: "ru" }
    ],
    [
      { id: "fr", label: "Французская кухня" },
      { id: "it", label: "Итальянская кухня" },
      { id: "jp", label: "Японская кухня" },
      { id: "mx", label: "Мексиканская кухня" },
      { id: "ru", label: "Русская кухня" }
    ]
  ),
  makeMatchBlock(
    "T2-B06",
    "Соотнесите блюда и кухни: блок 6.",
    [
      { dishId: "minestrone", text: "Минестроне", cuisine: "it" },
      { dishId: "miso_soup", text: "Мисо-суп", cuisine: "jp" },
      { dishId: "ratatouille", text: "Рататуй", cuisine: "fr" },
      { dishId: "quesadilla", text: "Кесадилья", cuisine: "mx" },
      { dishId: "vinegret", text: "Винегрет", cuisine: "ru" }
    ],
    [
      { id: "it", label: "Итальянская кухня" },
      { id: "jp", label: "Японская кухня" },
      { id: "fr", label: "Французская кухня" },
      { id: "mx", label: "Мексиканская кухня" },
      { id: "ru", label: "Русская кухня" }
    ]
  ),
  makeMatchBlock(
    "T2-B07",
    "Соотнесите блюда и кухни: блок 7.",
    [
      { dishId: "roast_beef", text: "Ростбиф", cuisine: "uk" },
      { dishId: "sauerbraten", text: "Зауэрбратен", cuisine: "de" },
      { dishId: "yorkshire", text: "Йоркширский пудинг", cuisine: "uk" },
      { dishId: "kartoffelsalat", text: "Картофельный салат", cuisine: "de" },
      { dishId: "trifle", text: "Трайфл", cuisine: "uk" }
    ],
    [
      { id: "uk", label: "Английская кухня" },
      { id: "de", label: "Немецкая кухня" }
    ]
  ),
  makeMatchBlock(
    "T2-B08",
    "Соотнесите блюда и кухни: блок 8.",
    [
      { dishId: "bruschetta", text: "Брускетта", cuisine: "it" },
      { dishId: "tempura", text: "Темпура", cuisine: "jp" },
      { dishId: "millefeuille", text: "Мильфей", cuisine: "fr" },
      { dishId: "sarma", text: "Сарма", cuisine: "balkan" },
      { dishId: "pozole", text: "Позоле", cuisine: "mx" }
    ],
    [
      { id: "it", label: "Итальянская кухня" },
      { id: "jp", label: "Японская кухня" },
      { id: "fr", label: "Французская кухня" },
      { id: "balkan", label: "Балканская кухня" },
      { id: "mx", label: "Мексиканская кухня" }
    ]
  )
];
