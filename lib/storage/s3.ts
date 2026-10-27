/**
 * Server-side: S3-клиент для Backblaze B2 (S3-compatible API).
 *
 * Клиент создаётся лениво, при первом обращении. Модуль ничего не отправляет
 * в сеть при импорте и не требует переменных окружения на этапе сборки.
 *
 * Особенности Backblaze B2:
 * - endpoint всегда `https://s3.<REGION>.backblazeb2.com`, регион совпадает;
 * - поддерживается только path-style адресация (`forcePathStyle: true`).
 */

import { randomUUID } from "node:crypto";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getS3Env, type S3Env } from "@/lib/env";

const DEFAULT_PRESIGN_EXPIRES_IN = 60 * 60; // 1 час
const MAX_PRESIGN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 дней — лимит SigV4

type S3Global = typeof globalThis & { __vidohS3?: S3Client };

const globalForS3 = globalThis as S3Global;

function toClientConfig(env: S3Env): S3ClientConfig {
  return {
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  };
}

/** Ленивый синглтон S3-клиента (один на процесс). */
export function getS3Client(): S3Client {
  if (globalForS3.__vidohS3) return globalForS3.__vidohS3;

  const client = new S3Client(toClientConfig(getS3Env()));
  globalForS3.__vidohS3 = client;
  return client;
}

/** Закрывает общий клиент (полезно в скриптах и при graceful shutdown). */
export function destroyS3Client(): void {
  globalForS3.__vidohS3?.destroy();
  delete globalForS3.__vidohS3;
}

function clampExpiresIn(expiresInSeconds: number): number {
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return DEFAULT_PRESIGN_EXPIRES_IN;
  }

  return Math.min(Math.floor(expiresInSeconds), MAX_PRESIGN_EXPIRES_IN);
}

/** Приводит ключ объекта к виду `a/b/c` без ведущих и двойных слэшей. */
export function normalizeObjectKey(key: string): string {
  return key.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/{2,}/g, "/");
}

/** Безопасное имя файла: ascii-слаг + исходное расширение. */
export function sanitizeFilename(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  const extension = dotIndex > 0 ? filename.slice(dotIndex).toLowerCase() : "";

  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  return `${slug || `file-${randomUUID()}`}${extension}`;
}

/**
 * Строит ключ объекта: `<prefix>/<sanitized-name>`.
 * Префикс нормализуется, имя файла санитизируется (кириллица → uuid-фолбэк).
 */
export function buildObjectKey(prefix: string, filename: string): string {
  const normalizedPrefix = normalizeObjectKey(prefix).replace(/\/+$/, "");
  const key = sanitizeFilename(filename);

  return normalizedPrefix ? `${normalizedPrefix}/${key}` : key;
}

/** Публичный URL объекта, если задан `S3_PUBLIC_BASE_URL`. */
export function getPublicUrl(key: string): string | undefined {
  const baseUrl = getS3Env().S3_PUBLIC_BASE_URL;
  if (!baseUrl) return undefined;

  return `${baseUrl.replace(/\/+$/, "")}/${normalizeObjectKey(key)}`;
}

/** Presigned URL на чтение (GET). */
export async function getPresignedGetUrl(
  key: string,
  expiresInSeconds: number = DEFAULT_PRESIGN_EXPIRES_IN,
): Promise<string> {
  const env = getS3Env();

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: normalizeObjectKey(key) }),
    { expiresIn: clampExpiresIn(expiresInSeconds) },
  );
}

/** Presigned URL на загрузку (PUT). */
export async function getPresignedPutUrl(
  key: string,
  contentType: string,
  expiresInSeconds: number = DEFAULT_PRESIGN_EXPIRES_IN,
): Promise<string> {
  const env = getS3Env();

  return getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: normalizeObjectKey(key),
      ContentType: contentType,
    }),
    { expiresIn: clampExpiresIn(expiresInSeconds) },
  );
}
