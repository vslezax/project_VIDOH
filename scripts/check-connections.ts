/**
 * Проверка доступности внешней инфраструктуры:
 *   1) Neon Postgres — соединение + версия сервера;
 *   2) Backblaze B2 (S3) — доступ к бакету.
 *
 * Ничего не пишет в БД и бакет, секреты не печатает.
 * Запуск: `npm run check:infra` (нужен заполненный `.env.local`).
 *
 * Выходной код: 0 — обе проверки успешны, 1 — хотя бы одна упала.
 */

import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

import { HeadBucketCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

import { createPrismaClient } from "../lib/db/prisma";
import { EnvValidationError, getS3Env } from "../lib/env";
import { destroyS3Client, getS3Client } from "../lib/storage/s3";

type CheckOutcome = {
  ok: boolean;
  summary: string;
  details: string[];
};

const OK_MARK = "[OK]";
const FAIL_MARK = "[FAIL]";

function describeDbTarget(connectionString: string): string {
  try {
    const parsed = new URL(connectionString);
    const poolMode = parsed.hostname.includes("-pooler") ? "pooled" : "direct";
    const provider = parsed.hostname.includes("neon.tech") ? "Neon" : "PostgreSQL";
    return `${provider}, ${parsed.hostname}${parsed.pathname} (${poolMode})`;
  } catch {
    return "(не удалось разобрать DATABASE_URL)";
  }
}

function formatError(error: unknown): string {
  if (error instanceof EnvValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    const cause = (error as { cause?: { code?: string; message?: string } }).cause;
    const causeCode = cause?.code ? ` (${cause.code})` : "";
    return `${error.message}${causeCode}`;
  }

  return String(error);
}

async function checkDatabase(): Promise<CheckOutcome> {
  let client: ReturnType<typeof createPrismaClient> | undefined;

  try {
    // Клиент читает DATABASE_URL лениво — внутри createPrismaClient.
    client = createPrismaClient({ verifyMarker: false });

    const plan = client.raw
      .sql`select 1 as ok, current_setting('server_version') as version, current_database() as database`
      .returnsRow({ ok: "pg/int4@1", version: "pg/text@1", database: "pg/text@1" })
      .build();

    const rows = (await client.query(plan)) as ReadonlyArray<{
      ok?: number;
      version?: string;
      database?: string;
    }>;

    const row = rows[0];
    const url = process.env["DATABASE_URL"] ?? "";

    return {
      ok: row?.ok === 1,
      summary: `подключение установлено (${describeDbTarget(url)})`,
      details: [
        `server_version: ${row?.version ?? "н/д"}`,
        `database: ${row?.database ?? "н/д"}`,
        "маркер контракта намеренно не проверяется (verifyMarker: false)",
      ],
    };
  } catch (error) {
    return {
      ok: false,
      summary: "не удалось подключиться",
      details: [formatError(error)],
    };
  } finally {
    await client?.close().catch(() => undefined);
  }
}

async function bucketIsReachable(bucket: string): Promise<string> {
  const client = getS3Client();

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return "HeadBucket";
  } catch (error) {
    const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;

    if (statusCode !== 403 && statusCode !== 404 && statusCode !== 405) {
      throw error;
    }

    // У ключа может не быть прав на HeadBucket — пробуем минимальный листинг.
    await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    return `ListObjectsV2 (HeadBucket ответил ${statusCode})`;
  }
}

async function checkStorage(): Promise<CheckOutcome> {
  try {
    const env = getS3Env();
    const method = await bucketIsReachable(env.S3_BUCKET);

    return {
      ok: true,
      summary: `бакет ${env.S3_BUCKET} доступен (${method})`,
      details: [`endpoint: ${env.S3_ENDPOINT}`, `region: ${env.S3_REGION}`],
    };
  } catch (error) {
    const details = [formatError(error)];

    try {
      const env = getS3Env();
      details.push(`endpoint: ${env.S3_ENDPOINT}`);
      details.push(`region: ${env.S3_REGION}, bucket: ${env.S3_BUCKET}`);
    } catch {
      // Переменные не прошли валидацию — их список уже есть в тексте ошибки.
    }

    return {
      ok: false,
      summary: "не удалось получить доступ к бакету",
      details,
    };
  } finally {
    destroyS3Client();
  }
}

function printOutcome(title: string, outcome: CheckOutcome): void {
  const mark = outcome.ok ? OK_MARK : FAIL_MARK;
  console.log(`${mark} ${title}: ${outcome.summary}`);

  for (const line of outcome.details) {
    console.log(`     · ${line}`);
  }
}

async function main(): Promise<void> {
  console.log("Проверка подключений (Neon Postgres + Backblaze B2)\n");

  const [database, storage] = await Promise.all([checkDatabase(), checkStorage()]);

  printOutcome("Postgres", database);
  printOutcome("Storage ", storage);

  const failed = [database, storage].filter((outcome) => !outcome.ok).length;

  console.log(
    failed === 0
      ? "\nИтог: обе инфраструктуры доступны."
      : `\nИтог: проверок с ошибкой — ${failed}. Смотрите детали выше.`,
  );

  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(`${FAIL_MARK} Непредвиденная ошибка проверки: ${formatError(error)}`);
  process.exitCode = 1;
});
