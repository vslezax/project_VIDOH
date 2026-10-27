"use server";

import { getEventsPage, type EventsPageResult } from "./get-events";

/**
 * Server Action: отдаёт страницу афиши по её номеру.
 *
 * Нужен клиентскому контейнеру сетки, чтобы при переключении страниц
 * обновлялся только список карточек — без навигации, изменения URL,
 * перезагрузки страницы и повторного серверного рендера всей главной.
 *
 * Логика выборки не дублируется: действие вызывает тот же `getEventsPage`,
 * что и первичный серверный рендер.
 */
export async function fetchEventsPage(page: number): Promise<EventsPageResult> {
  const normalizedPage = Number.isInteger(page) && page >= 1 ? page : 1;

  return getEventsPage(String(normalizedPage));
}
