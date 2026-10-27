/**
 * Server-side: чтение и валидация переменных окружения.
 *
 * Модуль не читает env при импорте — валидация запускается лениво, при первом
 * обращении к коннектору. Поэтому отсутствие `.env.local` не ломает ни сборку,
 * ни запуск приложения, пока подключение реально не используется.
 */

import { z } from "zod";

const MISSING_MESSAGE = "переменная не задана";

const requiredString = () => z.string({ error: MISSING_MESSAGE });

/**
 * Приводит URL к каноническому виду: домен без схемы получает `https://`,
 * хвостовые слэши убираются. AWS SDK бросает `Invalid URL`, если схемы нет,
 * поэтому нормализуем здесь, а не в каждом вызывающем месте.
 */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  return withScheme.replace(/\/+$/, "");
}

const urlSchema = (example: string) =>
  requiredString()
    .transform(normalizeUrl)
    .refine((value) => URL.canParse(value), {
      message: `ожидается корректный URL, например ${example}`,
    });

const dbEnvSchema = z.object({
  DATABASE_URL: requiredString()
    .transform((value) => value.trim())
    .refine((value) => /^postgres(ql)?:\/\//.test(value), {
      message: "ожидается строка подключения postgresql://…",
    }),
});

const s3EnvSchema = z.object({
  S3_ENDPOINT: urlSchema("https://s3.us-west-004.backblazeb2.com"),
  S3_REGION: requiredString().transform((value) => value.trim()),
  S3_BUCKET: requiredString().transform((value) => value.trim()),
  S3_ACCESS_KEY_ID: requiredString().transform((value) => value.trim()),
  S3_SECRET_ACCESS_KEY: requiredString().transform((value) => value.trim()),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  S3_PUBLIC_BASE_URL: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? normalizeUrl(trimmed) : undefined;
    }),
});

export type DbEnv = {
  DATABASE_URL: string;
};

export type S3Env = {
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_FORCE_PATH_STYLE: boolean;
  S3_PUBLIC_BASE_URL?: string;
};

export class EnvValidationError extends Error {
  readonly scope: "database" | "storage";
  readonly variables: string[];

  constructor(
    scope: "database" | "storage",
    issues: readonly { path: readonly PropertyKey[]; message: string }[],
  ) {
    const details = issues
      .map((issue) => `${issue.path.map(String).join(".") || "(root)"} — ${issue.message}`)
      .join("; ");

    super(
      `Некорректные переменные окружения (${scope}): ${details}. ` +
        "Скопируйте .env.example в .env.local и заполните значения.",
    );

    this.name = "EnvValidationError";
    this.scope = scope;
    this.variables = issues.map((issue) => issue.path.map(String).join("."));
  }
}

let cachedDbEnv: DbEnv | undefined;
let cachedS3Env: S3Env | undefined;

/** Валидирует и возвращает настройки подключения к Postgres. */
export function getDbEnv(): DbEnv {
  if (cachedDbEnv) return cachedDbEnv;

  const parsed = dbEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new EnvValidationError("database", parsed.error.issues);
  }

  cachedDbEnv = { DATABASE_URL: parsed.data.DATABASE_URL };
  return cachedDbEnv;
}

/** Валидирует и возвращает настройки S3-совместимого хранилища (Backblaze B2). */
export function getS3Env(): S3Env {
  if (cachedS3Env) return cachedS3Env;

  const parsed = s3EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new EnvValidationError("storage", parsed.error.issues);
  }

  cachedS3Env = {
    S3_ENDPOINT: parsed.data.S3_ENDPOINT,
    S3_REGION: parsed.data.S3_REGION,
    S3_BUCKET: parsed.data.S3_BUCKET,
    S3_ACCESS_KEY_ID: parsed.data.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: parsed.data.S3_SECRET_ACCESS_KEY,
    S3_FORCE_PATH_STYLE: parsed.data.S3_FORCE_PATH_STYLE,
    S3_PUBLIC_BASE_URL: parsed.data.S3_PUBLIC_BASE_URL,
  };

  return cachedS3Env;
}
