# Размещение олимпиады в Yandex Cloud

## Что используется

- `Yandex Managed Service for YDB` — хранение попыток и админ-сессий.
- `Yandex Container Registry` — хранение Docker-образа.
- `Yandex Serverless Containers` — запуск приложения.

## Что уже поддерживает проект

Проект умеет работать в двух режимах:

- `STORAGE_BACKEND=file` — локальные JSON-файлы;
- `STORAGE_BACKEND=ydb` — хранение в YDB.

Для YDB проект использует переменные:

```text
STORAGE_BACKEND=ydb
YDB_CONNECTION_STRING=grpcs://...
YDB_METADATA_CREDENTIALS=1
YDB_ATTEMPTS_TABLE=olympiad_attempts
YDB_ADMIN_SESSIONS_TABLE=admin_sessions
YDB_CONTENT_DRAFTS_TABLE=olympiad_content_drafts
YDB_CONTENT_QUESTIONS_TABLE=olympiad_content_questions
```

## Что подготовить заранее

1. Аккаунт в Yandex Cloud.
2. Облачный каталог.
3. Контейнерный образ проекта.
4. Базу YDB.
5. Сервисный аккаунт с правами:
   - на Serverless Containers;
   - на Container Registry;
   - на YDB.

## Порядок действий

### 1. Собрать Docker-образ локально

В папке проекта:

```bash
docker build -t olympiad-national-kitchens:latest .
```

### 2. Создать Container Registry

В Yandex Cloud Console создать реестр контейнеров.

### 3. Загрузить образ в Container Registry

После создания реестра:

- получить адрес реестра;
- авторизовать Docker;
- отметить тег образа адресом реестра;
- отправить образ в реестр.

Примерная логика:

```bash
docker tag olympiad-national-kitchens:latest cr.yandex/<registry>/<image>:latest
docker push cr.yandex/<registry>/<image>:latest
```

### 4. Создать базу YDB

Создать serverless или dedicated базу YDB.

После создания скопировать строку подключения:

```text
grpcs://ydb.serverless.yandexcloud.net:2135/?database=/ru-central1/...
```

### 5. Создать сервисный аккаунт

Сервисному аккаунту выдать роли, достаточные для:

- запуска контейнера;
- чтения образа из Container Registry;
- работы с YDB.

### 6. Создать Serverless Container

При создании контейнера указать:

- образ из Container Registry;
- сервисный аккаунт;
- память и CPU по минимально достаточному профилю;
- порт `8080`.

### 7. Указать переменные окружения

Для контейнера задать:

```text
HOST=0.0.0.0
PORT=8080
STORAGE_BACKEND=ydb
YDB_CONNECTION_STRING=ваша_строка_подключения
YDB_METADATA_CREDENTIALS=1
YDB_ATTEMPTS_TABLE=olympiad_attempts
YDB_ADMIN_SESSIONS_TABLE=admin_sessions
YDB_CONTENT_DRAFTS_TABLE=olympiad_content_drafts
YDB_CONTENT_QUESTIONS_TABLE=olympiad_content_questions
ADMIN_PASSWORD=ваш_пароль
YANDEX_DISK_ENABLED=true
YANDEX_DISK_OAUTH_TOKEN=ваш_токен
YANDEX_DISK_FOLDER=/Олимпиада_Национальные_кухни
```

### 8. Проверить запуск

После публикации открыть:

```text
https://<адрес-контейнера>/api/health
```

Ожидаемый признак:

```json
{
  "ok": true,
  "storageBackend": "ydb"
}
```

### 9. Проверить приложение

Открыть:

- главную страницу;
- `/admin.html`;
- регистрацию участника;
- старт попытки;
- экспорт;
- выгрузку на Яндекс Диск.

### PM01 после деплоя

PM01 работает отдельными маршрутами и не заменяет главную олимпиаду:

- `/pm01.html` — студент;
- `/pm01-admin.html` — преподаватель;
- `/api/pm01/public/exam` — публичные данные экзамена.

После деплоя на домен запустить:

```powershell
npm.cmd run verify:pm01 -- https://olympiada.gorlkts.ru
```

Ожидаемый результат: `ok: true`, `pm01.id: "pm01-2026-exam"`, 5 вариантов и 5 модулей.

## Что участники будут открывать

Участникам выдается только один адрес контейнера.

Организатор использует:

```text
/admin.html
```

## Как связать с сайтом колледжа

Если основной сайт сделан на Tilda, то:

- сайт остается на Tilda;
- олимпиада работает на отдельном адресе контейнера;
- на странице колледжа ставится кнопка «Пройти олимпиаду».

## Что важно помнить

- для локального режима код не нужно менять;
- для облачного режима достаточно переключить переменные окружения;
- таблицы в YDB создаются приложением автоматически при старте.

