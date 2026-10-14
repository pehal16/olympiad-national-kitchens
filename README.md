# Олимпиада по национальным кухням

Открытая веб-платформа для проведения учебной олимпиады и интерактивного экзамена
по профессиональным кулинарным модулям. Проект помогает организаторам выдавать
закреплённые варианты, автоматически проверять ответы, вести протокол попыток и
экспортировать результаты без платной LMS-инфраструктуры.

Основной сайт: [https://olympiad-gkts.pages.dev](https://olympiad-gkts.pages.dev), Cloudflare Pages/D1.

## Продолжение работы на новом ПК

**Начните с [инструкции передачи проекта](docs/new-pc-handoff.md).** Она содержит контекст для новой сессии Codex, первое сообщение, пути локальных данных и правила сохранения результатов.

14.10.2026 стационарный iRU подключён к [олимпиада.постовит.рф](https://xn--80aaloaqinm.xn--b1amqadnhd.xn--p1ai/). HTTPS-шлюз существующего VPS передаёт запросы по ограниченному SSH-туннелю на ПК, где продолжают работать прежний Windows-комплект и SQLite. Проверены TLS/страницы/API/защита панели и автоматическое восстановление туннеля; [настройки и ограничения проверки](docs/windows-hosting-runbook.md). Автозапуск установлен при входе текущего пользователя Windows; полный перезапуск ПК ещё не проверен. [Пробный комплект](https://github.com/pehal16/olympiad-national-kitchens/releases/tag/windows-trial-2026-10-13) использует отдельную SQLite-базу; [инструкция запуска](docs/windows-trial-runbook.md).

Для разработки клонируйте `main` в отдельную локальную папку и откройте её как проект Codex на новом компьютере. Не работайте с устаревшими исходниками из ZIP как с текущей Git-копией. Прочитайте [AGENTS.md](AGENTS.md) и [память проекта](docs/project-memory.md); не коммитьте локальные секреты и результаты участников.

## Что реализовано

- регистрация участника без личного кода;
- закрепление выданного варианта и перемешивание вариантов выбора перед стартом попытки;
- 5 туров с лимитами времени по сценарию;
- один вопрос на экран и запрет возврата назад;
- автоматическая проверка без ручной экспертизы;
- интерактивные задания `drag-and-drop`;
- служебный лог: выданные ID, порядок ответов, время по вопросам;
- админка с рейтингом, раскладкой по турам и экспортом;
- выгрузка протоколов на Яндекс Диск;
- отдельный PM01-модуль для интерактивного практического экзамена.
- отдельный режим «Учебные работы» с кабинетами преподавателя и студента;
- практические, лабораторные, самостоятельные работы и промежуточные тесты;
- 18 типов учебных блоков, автосохранение, файлы, проверка, журнал и CSV.

## Для кого

Проект ориентирован на преподавателей, методистов и организаторов учебных
олимпиад, которым нужен автономный экзаменационный стенд: локально на ноутбуке,
в отдельном Windows/SQLite-сервере или в инфраструктуре Cloudflare Pages/D1.

## Стек

- Node.js 24.18.0 — проверенная версия для разработки и Windows/SQLite-запуска
- встроенный HTTP-сервер без тяжелого backend-фреймворка
- vanilla HTML/CSS/JavaScript для интерфейсов
- Cloudflare Pages и D1 для действующего production-развертывания
- SQLite с WAL для отдельного сервера олимпиады на ПК
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
- [public/learning.html](public/learning.html) - кабинет студента для учебных работ
- [public/learning-admin.html](public/learning-admin.html) - кабинет преподавателя и конструктор работ
- [src/learning](src/learning) - отдельный доменный модуль учебных работ
- [docs/learning-pilot-runbook.md](docs/learning-pilot-runbook.md) - запуск, пилот, безопасность и эксплуатация
- [docs](docs) - документация по деплою, восстановлению и production-процессу
- [tests](tests) - регрессионные тесты

## Запуск общего стенда разработки

Для сервера только олимпиады используйте [Windows-инструкцию](docs/windows-trial-runbook.md) и `node scripts/windows-trial.js`. Команды ниже запускают общий стенд с PM01 и другими модулями.

```powershell
npm ci
npm start
```

После запуска:

- участник: [http://localhost:3100](http://localhost:3100)
- админка: [http://localhost:3100/admin.html](http://localhost:3100/admin.html)
- студент PM01: [http://localhost:3100/pm01.html](http://localhost:3100/pm01.html)
- преподаватель PM01: [http://localhost:3100/pm01-admin.html](http://localhost:3100/pm01-admin.html)
- студент «Учебных работ»: [http://localhost:3100/learning.html](http://localhost:3100/learning.html)
- преподаватель «Учебных работ»: [http://localhost:3100/learning-admin.html](http://localhost:3100/learning-admin.html)

Настройки лежат в [config/settings.json](config/settings.json). Для production
секреты передаются через переменные окружения и GitHub Actions secrets.

## Проверка

```powershell
npm.cmd test
```

Проверка PM01-развертывания:

```powershell
npm.cmd run verify:pm01 -- http://localhost:3100
npm.cmd run verify:cloudflare -- https://olympiad-gkts.pages.dev
```

## Production

Основной production-контур разворачивается в Cloudflare Pages через workflow
[deploy-cloudflare.yml](.github/workflows/deploy-cloudflare.yml). Метаданные учебного модуля хранятся в D1, студенческие вложения – в приватном R2. Подробности:

- [docs/learning-pilot-runbook.md](docs/learning-pilot-runbook.md)
- [docs/project-memory.md](docs/project-memory.md) — актуальные версии, архитектура и результаты выпуска
- [docs/yandex-cloud-serverless.md](docs/yandex-cloud-serverless.md) — историческая документация прежнего развёртывания
- [docs/pm01-production-rollout.md](docs/pm01-production-rollout.md)
- [docs/platform-audit.md](docs/platform-audit.md)
- [docs/laptop-recovery.md](docs/laptop-recovery.md)

## Работа с содержанием

- туры и общие параметры: [data/olympiad.js](data/olympiad.js)
- тур 1: [data/banks/tour1.js](data/banks/tour1.js)
- тур 2: [data/banks/tour2.js](data/banks/tour2.js)
- тур 3: [data/banks/tour3.js](data/banks/tour3.js)
- тур 4: [data/banks/tour4-menu-v4.json](data/banks/tour4-menu-v4.json) — текущие заказы и подачи; прежние банки сохраняются для старых попыток
- тур 5: [data/banks/tour5-photo-kitchen.js](data/banks/tour5-photo-kitchen.js) — текущая фотосборка трёх блюд
- PM01-экзамен: [data/exams/pm01.js](data/exams/pm01.js)

## Режим «Учебные работы»

Пилот режима реализован отдельно от официального экзамена PM01. Преподаватель создаёт группы, предметы и неизменяемые версии работ, назначает их студентам, проверяет сдачи и публикует оценки. Студент работает под собственной учётной записью, ответы автосохраняются, а закрытые ключи проверки не передаются в его кабинет.

Перед подключением реальных данных выполните синтетический выпуск из кабинета преподавателя и пройдите чек-листы из [регламента пилота](docs/learning-pilot-runbook.md). Массовое подключение 10–15 групп проводится поэтапно после настройки отдельных production-секретов, D1, R2 и резервного копирования.

Ежедневный процесс преподавателя, постоянные требования к документам и поэтапный план автоматизации зафиксированы в [docs/teacher-daily-workflow.md](docs/teacher-daily-workflow.md).

## Участие в разработке

Issues и pull requests приветствуются. Перед отправкой изменений запустите:

```powershell
npm.cmd test
```

Для изменений в PM01 дополнительно проверьте локальный или production-стенд через
`npm.cmd run verify:pm01`.

## Лицензия

Проект распространяется под лицензией [MIT](LICENSE).
