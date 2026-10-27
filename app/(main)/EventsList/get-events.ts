/**
 * Данные для сетки мероприятий (секция «Мероприятия» на главной).
 *
 * Почему отдельный файл рядом с секцией: `EventsList.tsx` остаётся тонким —
 * принимает `pageParam`, вызывает `getEventsPage()` и рендерит результат.
 * Вся работа с БД, пагинация и маппинг в пропсы карточки живут здесь.
 *
 * Почему raw-лейн Prisma ORM v8, а не типизированный ORM:
 * `npx prisma contract infer` падает на `users.email` (тип `citext`), а вручную
 * описывать весь контракт ради одной выборки нецелесообразно. Запрос
 * параметризован (значения уходят как параметры, не склейкой строк), а форма
 * строки типизирована ниже.
 */

import { EVENTS_PAGE_SIZE } from "@/lib/config";
import { getPrismaUnchecked } from "@/lib/db/prisma";

/** Пропсы карточки события — ровно то, что принимает `EventComponent`. */
export type EventCardModel = {
  id: number;
  slug: string;
  name: string;
  description: string;
  location: string;
  image?: string;
};

export type EventsPageResult = {
  events: EventCardModel[];
  page: number;
  totalPages: number;
  count: number;
  /** Если задан — странице нужно выполнить redirect() на этот href. */
  redirectTo?: string;
};

/** Значения `location_kind` из SQL: чем заполнять строку локации. */
type LocationKind = "venue" | "online" | "none";

type EventRow = {
  id: number;
  slug: string;
  title: string;
  short_description: string | null;
  venue_name: string | null;
  cover_url: string | null;
  location_kind: string;
};

const LOCATION_BY_KIND: Record<LocationKind, string> = {
  // Площадка есть — показываем её название (адрес в карточке не помещается).
  venue: "",
  // Онлайн-событие: площадки нет, но есть online_url (CHECK venue_or_online).
  online: "Онлайн",
  // Схема такого не допускает, но подстрахуемся от «пустой» строки.
  none: "Локация не указана",
};

/** Условие выборки афиши: только опубликованные и не удалённые события. */
// Дублируется в двух запросах намеренно: фильтр — часть SQL, а не параметр,
// поэтому его нельзя передать через interpolation без склейки строк.

function toCard(row: EventRow): EventCardModel {
  const kind: LocationKind =
    row.location_kind === "venue" || row.location_kind === "online" ? row.location_kind : "none";

  return {
    id: row.id,
    slug: row.slug,
    name: row.title,
    description: row.short_description ?? "",
    location: kind === "venue" ? (row.venue_name ?? LOCATION_BY_KIND.none) : LOCATION_BY_KIND[kind],
    image: row.cover_url ?? undefined,
  };
}

/** Приводит произвольный `searchParams.page` к валидному номеру страницы. */
function parsePage(pageParam: string | undefined): number {
  if (!pageParam) return 1;

  const parsed = Number(pageParam);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;

  return parsed;
}

/**
 * Возвращает одну страницу афиши.
 *
 * Делает ровно два запроса: `count` для расчёта числа страниц и выборку страницы
 * через `limit/offset` (никаких диапазонов id и никакой выгрузки всех записей).
 */
export async function getEventsPage(pageParam: string | undefined): Promise<EventsPageResult> {
  const db = getPrismaUnchecked();

  const countPlan = db.raw
    .sql`select count(*)::int as total
         from events e
         where e.status = 'published' and e.deleted_at is null`
    .returnsRow({ total: "pg/int4@1" })
    .build();

  const countRows = (await db.query(countPlan)) as Array<{ total: number }>;
  const count = countRows[0]?.total ?? 0;
  const totalPages = Math.ceil(count / EVENTS_PAGE_SIZE);
  const page = parsePage(pageParam);

  // Несуществующая страница при непустой афише — уводим на первую.
  if (count > 0 && page > totalPages) {
    return { events: [], page: 1, totalPages, count, redirectTo: "?page=1" };
  }

  const skip = (page - 1) * EVENTS_PAGE_SIZE;

  const pagePlan = db.raw
    .sql`select
           e.id,
           e.slug,
           e.title,
           e.short_description,
           v.name as venue_name,
           case
             when v.id is not null then 'venue'
             when e.online_url is not null then 'online'
             else 'none'
           end as location_kind,
           (
             select m.url
             from event_media em
             join media m on m.id = em.media_id
             where em.event_id = e.id
               and em.role::text in ('event_cover', 'event_big_cover', 'event_gallery')
             order by
               case em.role::text
                 when 'event_cover' then 0
                 when 'event_big_cover' then 1
                 else 2
               end,
               em.sort_order
             limit 1
           ) as cover_url
         from events e
         left join venues v on v.id = e.venue_id
         where e.status = 'published' and e.deleted_at is null
         order by e.id asc
         limit ${EVENTS_PAGE_SIZE} offset ${skip}`
    .returnsRow({
      id: "pg/int8number@1",
      slug: "pg/text@1",
      title: "pg/text@1",
      short_description: "pg/text@1",
      venue_name: "pg/text@1",
      location_kind: "pg/text@1",
      cover_url: "pg/text@1",
    })
    .build();

  const rows = (await db.query(pagePlan)) as EventRow[];

  return {
    events: rows.map(toCard),
    page,
    totalPages,
    count,
  };
}
