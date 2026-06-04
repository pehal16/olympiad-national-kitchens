# PM01 production rollout

## Routes

- Student: `/pm01.html`
- Teacher: `/pm01-admin.html`
- Public exam API: `/api/pm01/public/exam`
- Admin API: `/api/admin/pm01/summary`, `/api/admin/pm01/attempts`
- Health: `/api/health`

## Current production observation

Checked on 2026-06-04:

- `https://olympiada.gorlkts.ru/` returns `200`.
- `https://olympiada.gorlkts.ru/api/health` returns `200` with `storageBackend: "ydb"`.
- `https://olympiada.gorlkts.ru/pm01.html` returns `200`.
- `https://olympiada.gorlkts.ru/pm01-admin.html` returns `200`.

This means the live container and PM01 routes are healthy. After any content, asset, or UI change, push to `main`, wait for the GitHub Actions deploy, and rerun the production verification command below.

## Before deploy

Run locally:

```powershell
npm.cmd test
node --check server.js
npm.cmd run verify:pm01 -- http://127.0.0.1:3100
```

Expected `verify:pm01` result:

- `/api/health` exposes `pm01.id = "pm01-2026-exam"`;
- `/api/pm01/public/exam` exposes 5 variants and 5 modules;
- `/pm01.html` returns `200`;
- `/pm01-admin.html` returns `200`.

## Deploy

The repository already contains GitHub Actions workflow:

```text
.github/workflows/deploy-yandex-cloud.yml
```

The workflow deploys on push to `main` and also supports manual `workflow_dispatch`.

Required secrets:

- `YC_CLOUD_ID`
- `YC_FOLDER_ID`
- `YC_REGISTRY_ID`
- `YC_CONTAINER_NAME`
- `YC_RUNTIME_SERVICE_ACCOUNT_ID`
- `YC_SERVICE_ACCOUNT_KEY_JSON`
- `YDB_CONNECTION_STRING`
- `ADMIN_PASSWORD`
- `YANDEX_DISK_ENABLED`
- `YANDEX_DISK_OAUTH_TOKEN`
- `YANDEX_DISK_FOLDER`

Optional YDB table override secrets:

- `YDB_CONTENT_DRAFTS_TABLE`
- `YDB_CONTENT_QUESTIONS_TABLE`

## After deploy

Run:

```powershell
npm.cmd run verify:pm01 -- https://olympiada.gorlkts.ru
```

Then open manually:

- `https://olympiada.gorlkts.ru/pm01.html`
- `https://olympiada.gorlkts.ru/pm01-admin.html`

Teacher smoke:

1. Login to `/pm01-admin.html`.
2. Check summary cards.
3. Check filters by variant, group, status, mode, and pending voice review.
4. Export CSV and JSON.

Student smoke:

1. Start training mode with a test participant.
2. Pass M0.
3. Use drag-and-drop on the M1 sequence task.
4. Use drag-and-drop on the cut-shape visual matching task.
5. Finish or delete the test attempt from storage/admin export flow if it is only QA data.
