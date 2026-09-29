# Инварианты и правила целостности

## Уникальность
- users.uuid, users.email, users.phone — UNIQUE
- roles.code — UNIQUE
- user_sessions.refresh_token_hash — UNIQUE
- organizers.uuid, organizers.slug — UNIQUE
- countries.iso — UNIQUE
- cities.(country_id, slug) — UNIQUE
- venues.(city_id, slug) — UNIQUE
- categories.slug — UNIQUE
- media.storage_key — UNIQUE
- events.uuid, events.slug — UNIQUE
- tickets — без UQ (тип билета внутри события)
- issued_tickets.uuid, issued_tickets.code — UNIQUE
- promo_codes.code — UNIQUE

## Составные PK (NxN)
- user_roles: (user_id, role_id)
- user_favorites: (user_id, event_id)
- event_organizers: (event_id, organizer_id)
- event_categories: (event_id, category_id)
- event_media: (event_id, media_id, role)
- organizer_media: (organizer_id, media_id, role)
- category_media: (category_id, media_id, role)

## Частичные UNIQUE
- event_media: один role='main' на event_id
- event_organizers: один is_primary=true на event_id
- event_categories: один is_primary=true на event_id
- event_reviews: (event_id, user_id) — один отзыв на пользователя на событие

## CHECK-ограничения
- users: email IS NOT NULL OR phone IS NOT NULL
- cities: lat BETWEEN -90 AND 90; lng BETWEEN -180 AND 180
- venues: lat BETWEEN -90 AND 90; lng BETWEEN -180 AND 180
- events: end_at > start_at
- events: venue_id IS NOT NULL OR online_url IS NOT NULL
- events.utc_offset ~ '^[+-]\d{2}:\d{2}$'
- event_sessions: end_at > start_at
- event_sessions.utc_offset ~ '^[+-]\d{2}:\d{2}$'
- tickets: price >= 0
- tickets: quantity IS NULL OR quantity >= 0
- event_reviews.rating BETWEEN 1 AND 5
- order_items.quantity > 0

## Время
- Все timestamptz хранятся в UTC.
- utc_offset — строка ±HH:MM, задаётся модератором вручную.
- Локация (city/venue) не участвует в разрешении времени.
- Отображение времени — только через utc_offset события/сессии.

## Производные значения
- events.is_free — денормализация от tickets.price.
  Должен пересчитываться при изменении tickets (триггером или outbox-job).
- tickets.sold_count — денормализация от issued_tickets.
  Обновляется атомарно при выпуске билета.

## Роли
- users — только потребители.
- organizers — отдельные сущности, не связанные с users.
- moderator/admin — роли в user_roles; единственные, кто правит
  events, tickets.price, utc_offset, event_legal_documents,
  organizers.

## Что не допускается
- Хранение массива URL в одной колонке (используется media + связки).
- Хранение нескольких цен в одном билете (одна цена на тип).
- Хранение timezone на уровне city/venue.
- Хранение тегов и подписок (исключены намеренно).