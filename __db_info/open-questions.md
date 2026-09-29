# Известные пробелы и план развития

## Критичные
- Нет резервирования мест (hold) между корзиной и оплатой.
  Риск: оверселлинг последнего билета.
- Нет идемпотентности заказов/платежей.
  Риск: дубли при ретраях и двойных кликах.
- Нет триггера пересчёта events.is_free от tickets.price.
  Риск: рассинхронизация денормализации.
- Нет снапшота utc_offset и названий на момент заказа.
  (Снапшоты частично введены в order_items.)

## Агрегаторская специфика
- Нет внешних источников (event_sources, external_id).
- Нет дедупликации импортируемых событий.
- Нет лога импорта.

## Модерация и аудит
- Нет moderation_queue и reports.
- Нет audit_log (кто и что изменил в events, tickets, utc_offset, юр. документах).

## Уведомления
- Нет notifications, templates, deliveries.
- Нет outbox-паттерна для гарантированной доставки.

## Деньги
- Нет refund workflow (refund_requests, история статусов).
- Нет disputes.
- Нет payment_methods пользователя (токенизация).
- Нет мультивалютности на уровне события.

## Юридика
- Нет user_consents (оферта, обработка ПД, маркетинг).
- Нет версионирования legal_documents.

## UX
- Нет waitlist для распроданных событий.
- Нет seat maps (hall_layouts, seats).
- event_reviews привязаны к событию, а не к сессии.

## Поиск и масштабирование
- Полнотекстовый поиск: план — GIN/trgm в Postgres, далее OpenSearch.
- Гео-поиск: план — PostGIS или lat/lng + индексы.
- Партиционирование: events(start_at), orders(created_at),
  issued_tickets(created_at).
- CQRS: read-модели event_catalog_view, event_search_view,
  organizer_stats_view.
- Шардирование: по региону/городу при росте.
- Аналитика: вынос в ClickHouse.

## Надёжность
- Нет rate limiting и abuse_reports.
- Нет мониторинга рассинхронизации денормализаций.
- Нет retention-политик для персональных данных.