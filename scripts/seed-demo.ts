/**
 * Демо-данные для афиши: 12 опубликованных событий с обложками, расписаниями и билетами.
 *
 * Режимы:
 * - `npm run seed:demo`  — засеять демо-афишу (идемпотентно);
 * - `npm run seed:demo:clear` — убрать демо-события и их медиа («выключить»).
 *
 * Зачем: в базе развёрнута схема, но строк нет — без демо-данных нельзя проверить
 * сетку 2 × N и пагинацию.
 *
 * Особенности:
 * - пишет напрямую через `pg` (а не через ORM): нужны составные INSERT'ы в одной
 *   транзакции, а типизированный клиент Prisma ORM v8 пока не описывает схему
 *   (`contract infer` блокируется типом citext у `users.email`);
 * - идемпотентно: справочники (country/city/venue/media) обновляются по уникальным
 *   ключам, демо-события (slug `demo-*`) предварительно удаляются каскадом;
 * - изображения — локальная заглушка `public/images/events/placeholder.svg`;
 *   настоящие медиа живут в B2 и подставляются в `media.url`.
 *
 * Запуск: `npm run seed:demo`.
 */

import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

import { Client } from "pg";

const PLACEHOLDER_URL = "/images/events/placeholder.svg";
const UTC_OFFSET = "+03:00";

type VenueSeed = {
  slug: string;
  name: string;
  address: string;
  capacity: number;
};

type EventSeed = {
  slug: string;
  title: string;
  description: string;
  /** `null` — событие онлайн (тогда задаётся `onlineUrl`). */
  venueSlug: string | null;
  onlineUrl?: string;
  price: number;
  ageRating: number | null;
  capacity: number | null;
  /** Время начала в UTC (ISO). Отображается с учётом `utc_offset`. */
  startAt: string;
};

const VENUES: VenueSeed[] = [
  { slug: "demo-sevkabel", name: "Севкабель порт", address: "Кожевенная линия, 40", capacity: 120 },
  { slug: "demo-nevsky-23", name: "Невский проспект, 23", address: "Невский проспект, 23", capacity: 60 },
  { slug: "demo-loft-etagi", name: "Лофт «Этажи»", address: "Лиговский проспект, 74", capacity: 200 },
];

const EVENTS: EventSeed[] = [
  {
    slug: "demo-first-dance",
    title: "Интенсив «Первый танец»",
    description: "Разучи свой первый социальный танец за один вечер — без партнёра и опыта",
    venueSlug: "demo-sevkabel",
    price: 1500,
    ageRating: 16,
    capacity: 60,
    startAt: "2026-11-05T17:00:00Z",
  },
  {
    slug: "demo-pottery-first-cup",
    title: "Гончарный вечер «Первая чашка»",
    description: "Слепи свою первую чашку на гончарном круге — с нуля, за один вечер",
    venueSlug: "demo-nevsky-23",
    price: 3200,
    ageRating: 18,
    capacity: 15,
    startAt: "2026-11-06T16:00:00Z",
  },
  {
    slug: "demo-pottery-glaze",
    title: "Мастер-класс «Глазурь и обжиг»",
    description: "Узнай, как глазурь меняет керамику, и распиши свою работу",
    venueSlug: "demo-nevsky-23",
    price: 2400,
    ageRating: 12,
    capacity: 18,
    startAt: "2026-11-12T15:00:00Z",
  },
  {
    slug: "demo-jazz-evening",
    title: "Джазовый вечер «Тихий свет»",
    description: "Живой квартет, винил и разговоры о музыке в камерном зале",
    venueSlug: "demo-loft-etagi",
    price: 1800,
    ageRating: 18,
    capacity: 90,
    startAt: "2026-11-13T18:00:00Z",
  },
  {
    slug: "demo-culinary-pasta",
    title: "Кулинарный класс «Паста руками»",
    description: "Замеси, раскатай и приготовь пасту под руководством шефа",
    venueSlug: "demo-loft-etagi",
    price: 2800,
    ageRating: 12,
    capacity: 24,
    startAt: "2026-11-14T11:00:00Z",
  },
  {
    slug: "demo-photo-portrait",
    title: "Фотопрогулка «Портрет в городе»",
    description: "Практика портретной съёмки на улицах Петербурга с разбором кадров",
    venueSlug: "demo-sevkabel",
    price: 1900,
    ageRating: 16,
    capacity: 30,
    startAt: "2026-11-15T09:00:00Z",
  },
  {
    slug: "demo-letterpress",
    title: "Мастерская «Леттерпресс»",
    description: "Собери открытку на ручном прессе и унеси оттиск с собой",
    venueSlug: "demo-nevsky-23",
    price: 2100,
    ageRating: 12,
    capacity: 12,
    startAt: "2026-11-19T16:00:00Z",
  },
  {
    slug: "demo-online-standup",
    title: "Онлайн-интенсив «Сценарный старт»",
    description: "Разбери структуру короткого стендапа и напиши первый монолог",
    venueSlug: null,
    onlineUrl: "https://example.com/live/scenario-start",
    price: 900,
    ageRating: null,
    capacity: null,
    startAt: "2026-11-20T17:00:00Z",
  },
  {
    slug: "demo-wine-tasting",
    title: "Дегустация «Минеральные вина»",
    description: "Шесть бокалов, карта вкусов и разговоры о терруаре",
    venueSlug: "demo-loft-etagi",
    price: 4500,
    ageRating: 18,
    capacity: 20,
    startAt: "2026-11-21T17:00:00Z",
  },
  {
    slug: "demo-cyano",
    title: "Цианотипия «Синий отпечаток»",
    description: "Печать фотограмм на солнечной бумаге — техника XIX века",
    venueSlug: "demo-sevkabel",
    price: 0,
    ageRating: 6,
    capacity: 25,
    startAt: "2026-11-22T12:00:00Z",
  },
  {
    slug: "demo-bodied-percussion",
    title: "Боди-перкуссия «Ритм тела»",
    description: "Собери грув без инструментов — только руки, ноги и голос",
    venueSlug: "demo-sevkabel",
    price: 1200,
    ageRating: 12,
    capacity: 40,
    startAt: "2026-11-26T17:00:00Z",
  },
  {
    slug: "demo-calligraphy",
    title: "Каллиграфия «Острый угол»",
    description: "Освой остроконечное перо и напиши первую фразу",
    venueSlug: "demo-nevsky-23",
    price: 1600,
    ageRating: 12,
    capacity: 16,
    startAt: "2026-11-28T14:00:00Z",
  },
];

async function scalar(client: Client, sql: string, params: unknown[] = []): Promise<string> {
  const result = await client.query<{ id: string }>(sql, params);
  const row = result.rows[0];

  if (!row) throw new Error(`Ожидалась строка из запроса: ${sql.split("\n")[0]}`);

  return row.id;
}

async function main(): Promise<void> {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) throw new Error("DATABASE_URL не задан — заполните .env.local");

  const client = new Client({ connectionString });
  await client.connect();

  const isClearMode = process.argv.includes("--clear");

  try {
    await client.query("begin");

    if (isClearMode) {
      // События удаляются каскадом вместе с event_media, event_schedules и tickets.
      const removedEvents = await client.query("delete from events where slug like 'demo-%'");
      const removedMedia = await client.query("delete from media where storage_key like 'demo/%'");

      await client.query("commit");

      console.log(
        `Демо-данные выключены: удалено событий — ${removedEvents.rowCount ?? 0}, ` +
          `медиа — ${removedMedia.rowCount ?? 0}. Справочники (страна/город/площадки) оставлены.`,
      );
      return;
    }

    const countryId = await scalar(
      client,
      `insert into countries (name, iso, created_at, updated_at)
       values ('Россия', 'RU', now(), now())
       on conflict (iso) do update set name = excluded.name, updated_at = now()
       returning id`,
    );

    const cityId = await scalar(
      client,
      `insert into cities (country_id, name, slug, lat, lng, timezone, created_at, updated_at)
       values ($1, 'Санкт-Петербург', 'sankt-peterburg', 59.934280, 30.335098, 'Europe/Moscow', now(), now())
       on conflict (country_id, slug) do update set name = excluded.name, updated_at = now()
       returning id`,
      [countryId],
    );

    const venueIds = new Map<string, string>();

    for (const venue of VENUES) {
      const venueId = await scalar(
        client,
        `insert into venues (city_id, slug, name, address, capacity, created_at, updated_at)
         values ($1, $2, $3, $4, $5, now(), now())
         on conflict (city_id, slug) do update
           set name = excluded.name, address = excluded.address, updated_at = now()
         returning id`,
        [cityId, venue.slug, venue.name, venue.address, venue.capacity],
      );

      venueIds.set(venue.slug, venueId);
    }

    const coverId = await scalar(
      client,
      `insert into media (storage_key, url, type, alt, width, height, created_at)
       values ('demo/placeholder.svg', $1, 'image', 'Заглушка обложки события', 800, 450, now())
       on conflict (storage_key) do update set url = excluded.url
       returning id`,
      [PLACEHOLDER_URL],
    );

    // Идемпотентность: демо-события удаляются каскадом (event_media,
    // event_schedules, tickets), остальные события не трогаем.
    await client.query("delete from events where slug like 'demo-%'");

    for (const event of EVENTS) {
      const venueId = event.venueSlug ? venueIds.get(event.venueSlug) ?? null : null;

      const eventId = await scalar(
        client,
        // $3 используется дважды, поэтому приводим тип явно: иначе PostgreSQL
        // не может вывести единый тип параметра (varchar(500) vs text).
        `insert into events (uuid, slug, title, short_description, description, venue_id, online_url,
                             status, age_rating, capacity, currency, published_at, created_at, updated_at)
         values (gen_random_uuid(), $1, $2, $3::text, $3::text, $4, $5, 'published', $6, $7, 'RUB',
                 now(), now(), now())
         returning id`,
        [
          event.slug,
          event.title,
          event.description,
          venueId,
          event.onlineUrl ?? null,
          event.ageRating,
          event.capacity,
        ],
      );

      await client.query(
        `insert into event_schedules (event_id, kind, start_at, recurrence, utc_offset, created_at, updated_at)
         values ($1, 'once', $2, null, $3, now(), now())`,
        [eventId, event.startAt, UTC_OFFSET],
      );

      await client.query(
        `insert into tickets (event_id, name, description, price, currency, tickets_count, sold_count,
                              external_url, sort_order, created_at, updated_at)
         values ($1, 'Стандарт', null, $2, 'RUB', 30, 0, null, 0, now(), now())`,
        [eventId, event.price],
      );

      await client.query(
        `insert into event_media (event_id, media_id, role, sort_order, caption)
         values ($1, $2, 'event_cover', 0, null)`,
        [eventId, coverId],
      );
    }

    await client.query("commit");

    console.log(`Готово: ${EVENTS.length} демо-событий, ${VENUES.length} площадки, обложка ${PLACEHOLDER_URL}`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Ошибка seed-скрипта:", error);
  process.exitCode = 1;
});
