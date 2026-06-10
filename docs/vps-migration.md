# Перенос олимпиадной платформы на отдельный сервер

## Что переносим

Текущая ошибка `502` появляется из-за лимита Yandex Serverless Containers на параллельные запросы. Чтобы убрать этот потолок, приложение можно запустить как обычный Docker-сервис на VM/VPS. Данные при этом остаются в той же YDB, поэтому старые результаты не теряются.

Лучший срочный вариант: Yandex Compute VM с привязанным сервисным аккаунтом. Так сохраняется доступ к YDB через `YDB_METADATA_CREDENTIALS=1`, но исчезает serverless-лимит на 10 одновременных запросов.

## Что уже подготовлено

- `deploy/vps/compose.yaml` - приложение и Caddy reverse proxy.
- `deploy/vps/Caddyfile` - HTTPS и проксирование на Node.js.
- `deploy/vps/env.example` - список production-переменных без секретов.
- `deploy/vps/bootstrap-ubuntu.sh` - установка Docker на Ubuntu.
- `.github/workflows/deploy-vps.yml` - ручной деплой на сервер по SSH.

## Сервер

Рекомендуемые параметры на экзамен:

- 2 vCPU;
- 2-4 GB RAM;
- Ubuntu 24.04 LTS;
- открытые порты `22`, `80`, `443`;
- домен `olympiada.gorlkts.ru` указывает A-записью на IP сервера.

Если сервер в Yandex Compute, привяжите к VM сервисный аккаунт с доступом к YDB. Тогда в `.env` оставляем `YDB_METADATA_CREDENTIALS=1`.

## Первый запуск вручную

На сервере:

```bash
git clone https://github.com/<owner>/<repo>.git /opt/olympiad
cd /opt/olympiad
bash deploy/vps/bootstrap-ubuntu.sh
cp deploy/vps/env.example deploy/vps/.env
nano deploy/vps/.env
docker compose -f deploy/vps/compose.yaml up -d --build
docker compose -f deploy/vps/compose.yaml ps
```

Проверка:

```bash
curl -fsS http://127.0.0.1:8080/api/health
curl -fsS https://olympiada.gorlkts.ru/api/health
```

После DNS-переключения:

```powershell
npm.cmd run verify:pm01 -- https://olympiada.gorlkts.ru
```

## Деплой через GitHub Actions

В GitHub Secrets нужно добавить:

- `VPS_HOST` - IP или домен сервера;
- `VPS_USER` - пользователь SSH;
- `VPS_SSH_KEY` - приватный SSH-ключ;
- `VPS_PORT` - порт SSH, обычно `22`;
- `VPS_APP_DIR` - папка приложения, например `/opt/olympiad`;
- `VPS_SITE_DOMAIN` - `olympiada.gorlkts.ru`;
- `YDB_CONNECTION_STRING`;
- `ADMIN_PASSWORD`;
- `YANDEX_DISK_ENABLED`;
- `YANDEX_DISK_OAUTH_TOKEN`;
- `YANDEX_DISK_FOLDER`;
- при необходимости: `YDB_STATIC_CREDENTIALS_USER`, `YDB_STATIC_CREDENTIALS_PASSWORD`.

Workflow `Deploy to VPS` запускается вручную из GitHub Actions. Он копирует код на сервер, собирает контейнер, обновляет `.env` и перезапускает сервисы.

## Переключение без потери результатов

1. Поднять VM/VPS и запустить приложение на временном IP.
2. Проверить `/api/health`, `/pm01.html`, `/pm01-admin.html`.
3. Убедиться, что кабинет видит старые попытки из YDB.
4. Переключить DNS `olympiada.gorlkts.ru` на новый IP.
5. Оставить старый serverless-контейнер как резерв на время экзамена.

## Откат

Если новый сервер недоступен, верните DNS A-запись на старый адрес Yandex Serverless Containers или временно дайте студентам старую ссылку. Так как база YDB общая, результаты остаются в одном хранилище.
