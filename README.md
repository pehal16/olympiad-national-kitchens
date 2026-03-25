# Олимпиада по национальным кухням

Локальный веб-сервер для автоматизированной олимпиады по дисциплине
`ОП.11 / ОП.12 «Технология приготовления блюд национальных кухонь»`.

## Что реализовано

- регистрация участника без личного кода;
- индивидуальная генерация варианта перед стартом попытки;
- 5 туров с лимитами времени по сценарию;
- один вопрос на экран и запрет возврата назад;
- автоматическая проверка без ручной экспертизы;
- интерактивные задания `drag-and-drop`;
- служебный лог: выданные ID, порядок ответов, время по вопросам;
- админка с рейтингом, раскладкой по турам и экспортом;
- выгрузка протоколов на Яндекс Диск.

## Структура

- [server.js](C:\Users\ам\Documents\New project\server.js) — HTTP-сервер и API
- [data/olympiad.js](C:\Users\ам\Documents\New project\data\olympiad.js) — основная конфигурация олимпиады
- [data/banks](C:\Users\ам\Documents\New project\data\banks) — банки заданий по турам
- [public/index.html](C:\Users\ам\Documents\New project\public\index.html) — интерфейс участника
- [public/admin.html](C:\Users\ам\Documents\New project\public\admin.html) — админка
- [storage/attempts.json](C:\Users\ам\Documents\New project\storage\attempts.json) — все попытки
- [exports](C:\Users\ам\Documents\New project\exports) — выгрузки `CSV` и `JSON`

## Запуск

Откройте терминал в папке проекта:

```powershell
cd "C:\Users\ам\Documents\New project"
npm start
```

После запуска:

- участник: [http://localhost:3100](http://localhost:3100)
- админка: [http://localhost:3100/admin.html](http://localhost:3100/admin.html)

Пароль администратора по умолчанию хранится в
[config/settings.json](C:\Users\ам\Documents\New project\config\settings.json).

## Где менять содержание

- туры и общие параметры: [data/olympiad.js](C:\Users\ам\Documents\New project\data\olympiad.js)
- тур 1: [data/banks/tour1.js](C:\Users\ам\Documents\New project\data\banks\tour1.js)
- тур 2: [data/banks/tour2.js](C:\Users\ам\Documents\New project\data\banks\tour2.js)
- тур 3: [data/banks/tour3.js](C:\Users\ам\Documents\New project\data\banks\tour3.js)
- тур 4: [data/banks/tour4.js](C:\Users\ам\Documents\New project\data\banks\tour4.js)
- тур 5: [data/banks/tour5.js](C:\Users\ам\Documents\New project\data\banks\tour5.js)

## Яндекс Диск

Настройки лежат в
[config/settings.json](C:\Users\ам\Documents\New project\config\settings.json):

- `yandexDiskIntegration.enabled`
- `yandexDiskIntegration.oauthToken`
- `yandexDiskIntegration.folder`

После заполнения токена в админке будет доступна кнопка
`Выгрузить на Яндекс Диск`.
