# Олимпиада по национальным кухням

Открытая веб-платформа для проведения учебной олимпиады и интерактивного экзамена
по профессиональным кулинарным модулям. Проект помогает организаторам выдавать
индивидуальные варианты, автоматически проверять ответы, вести протокол попыток и
экспортировать результаты без платной LMS-инфраструктуры.

Production-домен: [https://olympiada.gorlkts.ru](https://olympiada.gorlkts.ru)

## Что реализовано

- регистрация участника без личного кода;
- индивидуальная генерация варианта перед стартом попытки;
- 5 туров с лимитами времени по сценарию;
- один вопрос на экран и запрет возврата назад;
- автоматическая проверка без ручной экспертизы;
- интерактивные задания `drag-and-drop`;
- служебный лог: выданные ID, порядок ответов, время по вопросам;
- админка с рейтингом, раскладкой по турам и экспортом;
- выгрузка протоколов на Яндекс Диск;
- отдельный PM01-модуль для интерактивного практического экзамена.

## Для кого

Проект ориентирован на преподавателей, методистов и организаторов учебных
олимпиад, которым нужен автономный экзаменационный стенд: локально на ноутбуке,
в Docker-контейнере или в serverless-инфраструктуре Yandex Cloud.

## Стек

- Node.js 22+
- встроенный HTTP-сервер без тяжелого backend-фреймворка
- vanilla HTML/CSS/JavaScript для интерфейсов
- Yandex Cloud Serverless Containers и YDB для production-развертывания
- Electron для portable desktop-сборки под Windows
- `node --test` для регрессионных тестов

## Структура

- [server.js](server.js) - HTTP-сервер и API
- [src](src) - логика хранилища, подсчета баллов, вариантов и экспорта
- [data/olympiad.js](data/olympiad.js) - основная конфигурация олимпиады
- [data/banks](data/banks) - банки заданий по турам
- [data/exams/pm01.js](data/exams/pm01.js) - конфигурация PM01-экзамена
- [public/index.html](public/index.html) - интерфейс участника
- [public/admin.html](public/admin.html) - панель организатора
- [public/pm01.html](public/pm01.html) - интерфейс студента PM01
- [public/pm01-admin.html](public/pm01-admin.html) - панель преподавателя PM01
- [docs](docs) - документация по деплою, восстановлению и production-процессу
- [tests](tests) - регрессионные тесты

## Запуск

```powershell
npm install
npm start
```

После запуска:

- участник: [http://localhost:3100](http://localhost:3100)
- админка: [http://localhost:3100/admin.html](http://localhost:3100/admin.html)
- студент PM01: [http://localhost:3100/pm01.html](http://localhost:3100/pm01.html)
- преподаватель PM01: [http://localhost:3100/pm01-admin.html](http://localhost:3100/pm01-admin.html)

Настройки лежат в [config/settings.json](config/settings.json). Для production
секреты передаются через переменные окружения и GitHub Actions secrets.

## Проверка

```powershell
npm.cmd test
```

Проверка PM01-развертывания:

```powershell
npm.cmd run verify:pm01 -- http://localhost:3100
npm.cmd run verify:pm01 -- https://olympiada.gorlkts.ru
```

## Production

Проект развернут в Yandex Cloud через workflow
[deploy-yandex-cloud.yml](.github/workflows/deploy-yandex-cloud.yml). Подробности:

- [docs/yandex-cloud-serverless.md](docs/yandex-cloud-serverless.md)
- [docs/pm01-production-rollout.md](docs/pm01-production-rollout.md)
- [docs/platform-audit.md](docs/platform-audit.md)
- [docs/laptop-recovery.md](docs/laptop-recovery.md)

## Работа с содержанием

- туры и общие параметры: [data/olympiad.js](data/olympiad.js)
- тур 1: [data/banks/tour1.js](data/banks/tour1.js)
- тур 2: [data/banks/tour2.js](data/banks/tour2.js)
- тур 3: [data/banks/tour3.js](data/banks/tour3.js)
- тур 4: [data/banks/tour4.js](data/banks/tour4.js)
- тур 5: [data/banks/tour5.js](data/banks/tour5.js)
- PM01-экзамен: [data/exams/pm01.js](data/exams/pm01.js)

## Участие в разработке

Issues и pull requests приветствуются. Перед отправкой изменений запустите:

```powershell
npm.cmd test
```

Для изменений в PM01 дополнительно проверьте локальный или production-стенд через
`npm.cmd run verify:pm01`.

## Лицензия

Проект распространяется под лицензией [MIT](LICENSE).
