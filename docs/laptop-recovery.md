# Восстановление работы на ноутбуке

Актуальная локальная папка:

```powershell
D:\Кодекс\olympiad-github-work
```

## Что это за проект

Олимпиада работает как Node.js веб-сервер с обычным браузерным интерфейсом.
Свежая версия из GitHub: `1.6.22`.

Основные экраны после запуска:

- участник: `http://localhost:3100/`
- панель организатора: `http://localhost:3100/admin.html`
- редактор банка заданий: `http://localhost:3100/content-admin.html`

Рабочий production-домен:

- участник: `https://olympiada.gorlkts.ru/`
- панель организатора: `https://olympiada.gorlkts.ru/admin.html`
- проверка сервера: `https://olympiada.gorlkts.ru/api/health`

Локальная версия нужна для разработки и проверки изменений. Рабочий домен нужен для проведения олимпиады и централизованного сбора результатов.

Локальный пароль администратора сейчас берется из `config/settings.json`.

## Что нужно на ноутбуке

- Node.js `22+`; на этом ноутбуке проверено `v24.16.0`.
- npm; в PowerShell обычный `npm` может блокироваться политикой выполнения, поэтому используйте `npm.cmd`.
- Для облачного деплоя: Docker, GitHub Actions secrets, Yandex Cloud CLI в CI.
- Для desktop-сборки: dev-зависимости `electron` и `electron-builder`.

## Локальный запуск

```powershell
cd "D:\Кодекс\olympiad-github-work"
npm.cmd install
npm.cmd start
```

Проверка:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3100/api/health
```

Тесты:

```powershell
npm.cmd test
npm.cmd audit
```

## Где редактировать олимпиаду

- общие параметры, туры и лимиты: `data/olympiad.js`
- банки заданий: `data/banks/tour1.js` ... `data/banks/tour5.js`
- вспомогательные шаблоны заданий: `data/banks/helpers.js`
- интерфейс участника: `public/app.js`, `public/index.html`, `public/styles.css`
- админка: `public/admin.js`, `public/admin.html`
- редактор банка заданий: `public/content-admin.js`, `public/content-admin.html`
- сервер и API: `server.js`
- файловое хранилище результатов: `storage/`
- выгрузки протоколов: `exports/`

Папки `storage/`, `exports/`, `node_modules/`, `dist/` и логи игнорируются git.

## Режимы хранения

Локально по умолчанию используется файловое хранилище:

```text
STORAGE_BACKEND=file
```

Для Yandex Cloud используется YDB:

```text
STORAGE_BACKEND=ydb
YDB_CONNECTION_STRING=grpcs://...
YDB_METADATA_CREDENTIALS=1
YDB_ATTEMPTS_TABLE=olympiad_attempts
YDB_ADMIN_SESSIONS_TABLE=admin_sessions
YDB_CONTENT_DRAFTS_TABLE=olympiad_content_drafts
YDB_CONTENT_QUESTIONS_TABLE=olympiad_content_questions
```

## Внешние интеграции

Яндекс Диск:

```text
YANDEX_DISK_ENABLED=true
YANDEX_DISK_OAUTH_TOKEN=...
YANDEX_DISK_FOLDER=/Олимпиада_Национальные_кухни
```

Yandex Cloud deploy через GitHub Actions использует:

```text
YC_CLOUD_ID
YC_FOLDER_ID
YC_REGISTRY_ID
YC_CONTAINER_NAME
YC_RUNTIME_SERVICE_ACCOUNT_ID
YC_SERVICE_ACCOUNT_KEY_JSON
YDB_CONNECTION_STRING
ADMIN_PASSWORD
YANDEX_DISK_ENABLED
YANDEX_DISK_OAUTH_TOKEN
YANDEX_DISK_FOLDER
```

Workflow находится в `.github/workflows/deploy-yandex-cloud.yml`.

## Desktop-версия

Запуск Electron:

```powershell
npm.cmd run desktop:start
```

Сборка portable `.exe`:

```powershell
npm.cmd run desktop:dist
```

Desktop-версия запускает локальный сервер внутри приложения, выбирает свободный порт от `3100` и хранит runtime-данные в пользовательской папке Electron.
