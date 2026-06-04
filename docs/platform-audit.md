# Аудит платформы олимпиады и PM01

Дата проверки: 2026-06-04.

## Где сейчас держится платформа

- Репозиторий и исходный код: GitHub `pehal16/olympiad-national-kitchens`.
- Деплой: GitHub Actions workflow `.github/workflows/deploy-yandex-cloud.yml`.
- Рантайм: Docker-образ в Yandex Cloud Serverless Containers.
- Домен: `https://olympiada.gorlkts.ru/`.
- DNS: `olympiada.gorlkts.ru` указывает CNAME на `*.apigw.yandexcloud.net`; дальше запрос идет в Yandex Cloud.
- База на продакшене: `/api/health` показывает `storageBackend: "ydb"`.
- Локально без YDB: используется файловое хранилище `storage/*.json`.
- Картинки и визуальные ассеты: лежат в репозитории и Docker-образе в `public/assets/pm01/...`, отдаются как статические файлы самим Node-сервером.
- Экспорты: локально пишутся в `exports/`; при включенном `YANDEX_DISK_ENABLED` могут выгружаться на Яндекс Диск.

## Что именно использует YDB

Код `src/ydb-store.js` создает и использует таблицы:

- `olympiad_attempts` — состояние попытки.
- `olympiad_attempt_variants` — вариант экзамена, выданный попытке.
- `olympiad_attempt_answers` — ответы по вопросам.
- `admin_sessions` — сессии администратора.
- `olympiad_content_drafts` — черновики банка заданий.
- `olympiad_content_questions` — пользовательские вопросы банка.

Важно: аудиофайл голосового ответа сейчас хранится как payload/данные попытки, а не как отдельный объект в Object Storage. При больших голосовых файлах это может стать главным риском для базы.

## Где могут быть сбои

- GitHub Actions secrets: если сломаны `YC_*`, `YDB_CONNECTION_STRING`, `ADMIN_PASSWORD`, деплой не пройдет или контейнер стартует без базы.
- Yandex Cloud Serverless Containers: холодный старт, лимиты CPU/RAM, timeout `60s`, concurrency `8`. Для экзамена это нормально, но при одновременном входе большой группы возможны задержки.
- YDB: если превышены лимиты serverless-базы, неверные права service account или выросли голосовые payload, ответы могут сохраняться медленно или с ошибкой.
- Container Registry: workflow пушит новый Docker-образ на каждый commit SHA и не чистит старые образы. Это может постепенно давать платное хранение.
- Статические картинки: они внутри Docker-образа. Чем больше PNG, тем больше образ и дольше деплой/холодная загрузка. Сейчас PM01 assets: около 106.7 MB, 60 файлов.
- Service worker: если не менять cache version, браузер может держать старый интерфейс. В этой ревизии версия поднята до `1.6.23`.
- Домен/API Gateway: если CNAME или gateway-маршрут изменят, сайт станет недоступен даже при живом контейнере.
- Админ-пароль: хранится в secret/config. Если пароль утечет, можно смотреть и экспортировать попытки.

## Деньги и бесплатный режим

При обычном экзамене на группу/колледж нагрузка маленькая:

- 5 вариантов по 20 шагов;
- на одну попытку примерно десятки API-запросов;
- картинки грузятся как статика из контейнера;
- база хранит небольшие JSON-записи.

Ожидаемо можно держать почти бесплатно, если:

- оставаться в Yandex Cloud Serverless Containers без provisioned instances;
- использовать YDB serverless;
- чистить старые Docker-образы в Container Registry;
- не хранить большие аудио прямо в YDB, а при росте перенести аудио в Object Storage или отключить обязательную запись;
- не включать платные постоянные VM.

Официальные страницы для сверки тарифов:

- Yandex Cloud Serverless Containers pricing: https://yandex.cloud/en/docs/serverless-containers/pricing
- Yandex Cloud serverless free tier: https://yandex.cloud/en/docs/billing/concepts/serverless-free-tier
- Yandex Cloud YDB serverless pricing: https://yandex.cloud/en/docs/ydb/pricing/serverless
- Yandex Cloud Container Registry pricing: https://yandex.cloud/en/docs/container-registry/pricing
- GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions

Практический ориентир: для нескольких экзаменационных дней в месяц и сотен студентов расходы должны быть нулевыми или минимальными, если аккаунт остается в бесплатных пакетах и не копит старые образы. Потенциальная платная зона номер один — Container Registry из-за накопления Docker-образов; номер два — YDB/аудио при большом числе голосовых ответов.

## Что сделать для надежности

- Добавить lifecycle cleanup для Container Registry: хранить последние 5-10 образов.
- Раз в месяц экспортировать CSV/JSON результатов и хранить копию вне YDB.
- Для голосовых ответов ограничить длительность и размер; при массовом экзамене вынести аудио в Object Storage.
- Перед экзаменом запускать `npm.cmd run verify:pm01 -- https://olympiada.gorlkts.ru`.
- За день до экзамена сделать тестовую попытку во всех 5 вариантах.
- На время проведения открыть мониторинг Yandex Cloud: ошибки контейнера, latency, количество invocation, ошибки YDB.
- Хранить резервные secrets и инструкцию восстановления в `docs/laptop-recovery.md`.
