# project_vidoh

Лендинг-агрегатор мероприятий (VDH // ВЫДОХ): мастер-классы, камерные события, билеты.

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, CSS Modules + Tailwind-утилиты.
- Хранилище: Neon Postgres через Prisma ORM v8, медиа — Backblaze B2 (S3-совместимый API).
- Подключения к БД и хранилищу **реализованы, но пока не используются** страницами: это инфраструктурный слой.

## Быстрый старт

```bash
npm install
npm run dev          # http://localhost:3000
```

Требования: **Node >= 22.18** (ограничение `prisma` 8 RC) и **PostgreSQL >= 15** (требование Prisma ORM v8).

## Переменные окружения

```bash
cp .env.example .env.local        # PowerShell: Copy-Item .env.example .env.local
```

Заполните:

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | строка подключения Neon Postgres (для рантайма — pooled endpoint `…-pooler…`) |
| `S3_ENDPOINT` | `https://s3.<REGION>.backblazeb2.com` |
| `S3_REGION` | регион бакета, например `us-west-004` |
| `S3_BUCKET` | имя бакета |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | application key из Backblaze (не master key) |
| `S3_FORCE_PATH_STYLE` | `true` — B2 поддерживает только path-style |
| `S3_PUBLIC_BASE_URL` | необязательно: база для публичных ссылок (CDN/public bucket) |

`.env.local` и `.env` не коммитятся; в git попадает только `.env.example`.
Валидация переменных — [`lib/env.ts`](lib/env.ts) на `zod`. Она **ленивая**: пока подключение не используется, отсутствие переменных не мешает `npm run dev`, `npm run build` и тестам.

## Инфраструктурный слой

| Модуль | Что даёт |
|---|---|
| [`lib/env.ts`](lib/env.ts) | `getDbEnv()`, `getS3Env()`, понятные ошибки о незаполненных переменных |
| [`lib/db/prisma.ts`](lib/db/prisma.ts) | `getPrisma()` — ленивый клиент Prisma ORM v8 (кэш в `globalThis`), `createPrismaClient()`, `disconnectPrisma()` |
| [`lib/storage/s3.ts`](lib/storage/s3.ts) | `getS3Client()`, `getPresignedGetUrl()`, `getPresignedPutUrl()`, `getPublicUrl()`, `buildObjectKey()` |
| [`lib/storage/index.ts`](lib/storage/index.ts) | реэкспорт публичного API хранилища |

Ни один из этих модулей не импортируется из `app/**` — подключение активируется только при явном вызове.

## Проверка подключений

```bash
npm run check:infra
```

Скрипт [`scripts/check-connections.ts`](scripts/check-connections.ts):

1. загружает `.env.local`, затем `.env`;
2. проверяет, что переменные заданы и корректны (иначе печатает, чего не хватает);
3. **Postgres:** выполняет `select 1, current_setting('server_version'), current_database()` и печатает версию сервера и признак pooled/direct;
4. **S3:** `HeadBucket`, при `403/404/405` — фолбэк на `ListObjectsV2` с `MaxKeys: 1`;
5. ничего не пишет в БД и бакет, секреты не печатает;
6. код выхода `0`, только если обе проверки успешны.

В скрипте проверка БД идёт с `verifyMarker: false`: маркер контракта в базе появляется только после `npm run db:init`, а проверить подключение нужно и до этого шага.

Типичные ошибки:

| Вывод | Причина |
|---|---|
| `DATABASE_URL — переменная не задана` | не создан `.env.local` |
| `connect ECONNREFUSED` / `ENOTFOUND` | неверный хост/порт, база недоступна |
| `password authentication failed` | неверные логин/пароль в строке подключения |
| `Invalid URL` | `S3_ENDPOINT` записан с опечаткой. Схему `https://` можно опускать — она подставляется автоматически |
| `Malformed Access Key Id` | в ключах остались плейсхолдеры из `.env.example` |
| `HeadBucket ответил 403` + ошибка листинга | у ключа нет прав на бакет либо бакет в другом регионе |

Предупреждение драйвера `pg` про `SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca'...` — косметическое: используйте `sslmode=verify-full` в `DATABASE_URL`, и оно исчезнет.

## Prisma ORM v8 (важно: не «классический» Prisma)

В проекте нет `prisma/schema.prisma` и не используется `@prisma/client`. Prisma ORM v8 работает через **контракт**:

| Файл / команда | Назначение |
|---|---|
| [`prisma/contract.prisma`](prisma/contract.prisma) | контракт данных (PSL); сейчас без доменных моделей — только подключение |
| `prisma/contract.json`, `prisma/contract.d.ts` | сгенерированные артефакты, коммитятся |
| `npm run db:emit` | пересобрать артефакты после правки контракта |
| `npm run db:init` | создать схему в базе и подписать её контрактом |
| `npm run db:verify` | проверить, что база соответствует контракту |

Конфигурация — [`prisma.config.ts`](prisma.config.ts) (`@prisma/orm-postgres/config`, соединение из `DATABASE_URL`).
Версии: `prisma` 8.0.0-rc.27 + `@prisma/orm-postgres` 8.0.0-rc.20 — их нужно обновлять парой, иначе `prisma contract emit` падает на несовпадении `@prisma/cli-engine`.

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint 9 (flat config) |
| `npm run check:infra` | проверка Neon Postgres + Backblaze B2 |
| `npm run db:emit` | `prisma contract emit` |
| `npm run db:init` / `db:verify` | инициализация и верификация схемы в базе |

## Структура

```text
app/                    # Next.js App Router; (main) — главная страница
lib/
  env.ts                # ленивая zod-валидация env
  db/prisma.ts          # клиент Prisma ORM v8
  storage/              # S3-клиент и presigned URL
  types.ts, mock.ts, queries.ts
prisma/                 # контракт и сгенерированные артефакты
scripts/                # check-connections.ts
__db_info/              # проектная документация БД (DBML, инварианты)
plans/                  # рабочие планы задач
AUDIT.md                # входной документ по состоянию проекта
```
