/**
 * Server-side: клиент Prisma ORM v8 (`@prisma/orm-postgres`) для PostgreSQL/Neon.
 *
 * Модуль ничего не открывает при импорте: пул соединений создаётся при первом
 * запросе или при явном вызове `connectPrisma()`. Поэтому проект собирается и
 * работает без `DATABASE_URL`, пока подключение не используется.
 *
 * Контракт данных лежит в `prisma/contract.prisma`; `prisma/contract.json` и
 * `prisma/contract.d.ts` генерируются командой `npm run db:emit`.
 */

import postgres, { type PostgresClient } from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";

import type { Contract } from "../../prisma/contract.d";
import contractJson from "../../prisma/contract.json" with { type: "json" };
import { getDbEnv } from "@/lib/env";

/** Скомпилированный контракт (валидируется один раз на процесс). */
export const contract = contractFromJson<Contract>(contractJson);

export type Db = PostgresClient<typeof contract>;

type DbGlobal = typeof globalThis & { __vidohDb?: Db };

const globalForDb = globalThis as DbGlobal;

/**
 * Создаёт новый клиент. Не кэшируется — используйте для одноразовых сценариев
 * (скрипты, проверки), где нужны нестандартные опции.
 */
export function createPrismaClient(options: { verifyMarker?: boolean } = {}): Db {
  const { DATABASE_URL } = getDbEnv();

  return postgres({
    contract,
    url: DATABASE_URL,
    ...(options.verifyMarker === false ? { verifyMarker: false } : {}),
  });
}

/**
 * Общий клиент приложения: один на процесс, с кэшем в `globalThis`,
 * чтобы dev-перезагрузка не плодила пулы.
 */
export function getPrisma(): Db {
  if (globalForDb.__vidohDb) return globalForDb.__vidohDb;

  const client = createPrismaClient();
  globalForDb.__vidohDb = client;
  return client;
}

/** Открывает соединение заранее (обычно не нужно — клиент ленивый). */
export async function connectPrisma(): Promise<void> {
  await getPrisma().connect();
}

/** Закрывает общий клиент и освобождает пул соединений. */
export async function disconnectPrisma(): Promise<void> {
  const client = globalForDb.__vidohDb;
  if (!client) return;

  delete globalForDb.__vidohDb;
  await client.close();
}
