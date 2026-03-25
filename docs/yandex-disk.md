# Яндекс Диск

Для выгрузки протоколов приложению нужен именно **OAuth-токен Яндекс Диска**.

`Client ID` и `Client secret` сами по себе не являются токеном загрузки файлов.

## Что важно

- `Client secret` нельзя публиковать на сайте и нельзя хранить в клиентском JavaScript;
- в текущем проекте используется только серверная схема загрузки;
- для включения выгрузки нужно вставить OAuth-токен в [settings.json](C:\Users\ам\Documents\New project\config\settings.json).

## Где включить

Файл:
[settings.json](C:\Users\ам\Documents\New project\config\settings.json)

Поля:

- `yandexDiskIntegration.enabled`
- `yandexDiskIntegration.oauthToken`
- `yandexDiskIntegration.folder`

## После включения

В админ-панели появится рабочий сценарий:

1. проверить ответы;
2. сформировать протокол;
3. нажать `Выгрузить на Яндекс Диск`.
