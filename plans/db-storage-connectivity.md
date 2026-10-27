# План и факт: подключение Neon (Postgres) и Backblaze B2 (S3)

Статус: **выполнено**. Согласованный набор — B1 + N2 + S1 + T2 + E2 + L1.

> Ключевое отклонение от первоначального плана: в проекте стоит **Prisma ORM v8** (RC), а это другой ORM, не `@prisma/client`. Подключение реализовано через контракт `prisma/contract.prisma` и пакет `@prisma/orm-postgres`; `@prisma/client` и драйвер-адаптеры (`@prisma/adapter-neon`) не используются — в v8 их роль выполняет `@prisma/orm-target-postgres`, который приходит вместе с `@prisma/orm-postgres`.

---

## Что сделано

| Файл | Назначение |
|---|---|
| `.env.example` | шаблон переменных, коммитится (в `.gitignore` добавлено `!/.env.example`) |
| `prisma/contract.prisma` | контракт данных (PSL), пока без доменных моделей |
| `prisma/contract.json`, `prisma/contract.d.ts` | сгенерированы `npm run db:emit`, коммитятся |
| `prisma.config.ts` | `definePrismaConfig` + `ormConfig({ contract, db: { connection } })`; сохранён `skills.agents` |
| `lib/env.ts` | ленивая валидация env на `zod`, `getDbEnv()` / `getS3Env()`, `EnvValidationError` |
| `lib/db/prisma.ts` | `contractFromJson<Contract>()`, `getPrisma()`, `createPrismaClient({ verifyMarker })`, `connectPrisma()`, `disconnectPrisma()` |
| `lib/storage/s3.ts` | ленивый `S3Client` (path-style), presigned GET/PUT, `getPublicUrl`, `buildObjectKey` |
| `lib/storage/index.ts` | реэкспорт публичного API |
| `scripts/check-connections.ts` | `npm run check:infra`: `select 1` + `server_version` и `HeadBucket`/`ListObjectsV2`, exit code 0/1 |
| `package.json` | скрипты `check:infra`, `db:emit`, `db:init`, `db:verify`; зависимости `@prisma/orm-postgres@8.0.0-rc.20`, `prisma@8.0.0-rc.27`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `zod`, `dotenv`, `temporal-polyfill`; devDep `tsx`; `@prisma/client` удалён |
| `eslint.config.mjs` | `prisma/contract.d.ts` исключён из линта (сгенерированный код) |
| `README.md` | env, инфраструктура, проверка подключений, Prisma v8 |
| `AUDIT.md` | §0, §1, §2, §5.1, §6, §9, §10, §11 актуализированы |

`app/(main)/**` **не изменялся**; ни один модуль инфраструктуры не импортируется из `app/**`.

---

## Переменные окружения

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | Neon Postgres, для рантайма pooled endpoint (`…-pooler…`), `sslmode=verify-full` |
| `S3_ENDPOINT` | `https://s3.<REGION>.backblazeb2.com` |
| `S3_REGION` | регион бакета (`us-west-004` и т.п.) |
| `S3_BUCKET` | имя бакета |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | application key Backblaze |
| `S3_FORCE_PATH_STYLE` | `true` (B2 поддерживает только path-style) |
| `S3_PUBLIC_BASE_URL` | опционально, база для публичных ссылок |

---

## Проверено

- `npm run build` — успешно (TypeScript включён в сборку).
- `npm run lint` — 0 ошибок (осталось одно прежнее предупреждение в `app/layout.tsx` про неиспользуемый `onest`).
- `npm run check:infra` без `.env.local` — печатает, каких переменных не хватает, exit code 1.
- `npm run check:infra` с фиктивными значениями — реально идёт в сеть и показывает `connect ECONNREFUSED` (БД) и `Malformed Access Key Id` (B2), exit code 1.
- `prisma contract emit` — рабочая пара `prisma@8.0.0-rc.27` + `@prisma/orm-postgres@8.0.0-rc.20`; другие комбинации падают на `@prisma/cli-engine`.

---

## Ограничения и следующий шаг

- Контракт пустой: доменные модели из `__db_info/schema.dbml.txt` не перенесены.
- ORM-запросы к базе требуют подписи контрактом (`npm run db:init`); до этого обычный запрос падает с `CONTRACT.MARKER_READ_FAILED`, поэтому проверочный скрипт использует `verifyMarker: false`.
- Подключение проверено на реальных кредах: Postgres отвечает (`server_version` 18.6, база `VDH`, pooled endpoint), бакет `vdh-storage` (`eu-central-003`) доступен через `HeadBucket`; `npm run check:infra` → код 0.
- Обнаруженный по ходу дефект конфигурации: `S3_ENDPOINT` был указан без схемы `https://` → AWS SDK бросал `Invalid URL`. Исправлено в коде нормализацией endpoint в [lib/env.ts](lib/env.ts).
