import kitchen from "./kitchen.json" with { type: "json" };
import { project, round, question } from "../shared/catalog.js";
export function examples() {
  const informatics = project("Компьютерный класс");
  informatics.subject = "Информатика";
  informatics.description =
    "Демонстрационный проект с автоматической и ручной проверкой.";
  informatics.legend =
    "Подготовьте компьютерный класс к работе и решите технические ситуации.";
  informatics.rounds = ["Подготовка", "Диагностика", "Решение"].map((x) =>
    round(x),
  );
  const q = question();
  q.title = "Выберите сетевое устройство";
  q.prompt = "Какое устройство объединяет компьютеры в локальную сеть?";
  q.config.options = ["Коммутатор", "Сканер", "Монитор", "Проектор"].map(
    (label, i) => ({ id: `o${i + 1}`, label }),
  );
  informatics.rounds[0].questions = [q];
  const m = question("matching");
  m.title = "Устройства и назначение";
  m.config = {
    items: [
      { id: "i1", label: "Клавиатура" },
      { id: "i2", label: "Монитор" },
    ],
    targets: [
      { id: "t1", label: "Ввод текста" },
      { id: "t2", label: "Вывод изображения" },
    ],
  };
  informatics.rounds[1].questions = [m];
  const e = question("long_text");
  e.title = "Объясните решение";
  e.prompt =
    "Компьютер включён, но на мониторе нет изображения. Опишите порядок первичной проверки.";
  informatics.rounds[2].questions = [e];
  const test = project("Тест: информационная безопасность", "test");
  test.subject = "Информатика";
  const a = question("multiple_choice");
  a.title = "Защита учётной записи";
  a.prompt = "Выберите действия, повышающие безопасность учётной записи.";
  a.config.options = [
    "Уникальный пароль",
    "Двухфакторная аутентификация",
    "Передача пароля знакомым",
    "Один пароль для всех сервисов",
  ].map((label, i) => ({ id: `o${i + 1}`, label }));
  test.rounds[0].questions = [a];
  return [
    { key: "informatics", project: informatics },
    { key: "test", project: test },
    { key: "kitchen", project: kitchen },
  ];
}
